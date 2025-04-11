// app/lib/payCalculations.ts

import type { Doc } from "../../convex/_generated/dataModel"; // Corrected path
import { calculateBillsBetweenDates } from "./bills"; // Import the new bill calculation function
import { addDays } from "date-fns"; // Import addDays if not already present

type Frequency = 'monthly' | 'fortnightly' | 'weekly';

/**
 * Calculates the estimated annual salary based on cycle amount and frequency.
 * Returns null if input is invalid.
 */
export function calculateAnnualSalary(
  amount: number | null | undefined,
  frequency: Frequency | string | null | undefined
): number | null {
  if (amount === null || amount === undefined || amount <= 0 || !frequency) {
    return null;
  }

  switch (frequency) {
    case 'monthly':
      return amount * 12;
    case 'fortnightly':
      // Assuming 26 fortnights per year
      return amount * 26;
    case 'weekly':
      return amount * 52;
    default:
      console.warn(`Unsupported frequency for annual calculation: ${frequency}`);
      return null; // Or throw error?
  }
}

/**
 * Calculates the equivalent pay amount for a target frequency based on annual salary.
 * Returns null if input is invalid.
 */
export function calculateTargetCycleAmount(
  annualSalary: number | null | undefined,
  targetFrequency: Frequency | string | null | undefined
): number | null {
  if (annualSalary === null || annualSalary === undefined || annualSalary <= 0 || !targetFrequency) {
    return null;
  }

  let divisor: number;
  switch (targetFrequency) {
    case 'monthly':
      divisor = 12;
      break;
    case 'fortnightly':
      divisor = 26;
      break;
    case 'weekly':
      divisor = 52;
      break;
    default:
      console.warn(`Unsupported target frequency for cycle amount calculation: ${targetFrequency}`);
      return null;
  }

  return annualSalary / divisor;
}

// Helper function to calculate the next payday Date object
// Based on frequency and day of month (for monthly)
// Returns null if inputs are invalid or frequency is unsupported
export function calculateNextPayday(
  frequency: string | null | undefined,
  dayOfMonth?: number | null | undefined,
  dayOfWeek?: string | null | undefined
): Date | null {
  if (!frequency) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  let nextPayday = new Date(today);

  switch (frequency) {
    case "monthly": {
      const payDay = dayOfMonth && dayOfMonth >= 1 && dayOfMonth <= 31 ? dayOfMonth : null;
      if (!payDay) return null; // Invalid day for monthly

      nextPayday.setDate(payDay);
      if (nextPayday < today) {
        // If the payday this month has passed, move to next month
        nextPayday.setMonth(nextPayday.getMonth() + 1);
        nextPayday.setDate(payDay); // Ensure day is correct after month change
      }
      // Handle cases where payDay is > days in next month (e.g., 31st in Feb)
      const originalMonth = nextPayday.getMonth();
      while (nextPayday.getMonth() !== originalMonth) {
          // Day was too large, rolled over month. Go to last day of *previous* month.
          nextPayday = new Date(today.getFullYear(), originalMonth + 1, 0);
          break; // Should only happen once
      }
      break;
    }

    case "fortnightly": {
      // Fortnightly calculation using dayOfWeek
      const targetDayNum = dayOfWeek ? dayOfWeekMap[dayOfWeek.toLowerCase()] : undefined;
      if (targetDayNum === undefined) {
        console.warn("Cannot calculate fortnightly payday: Invalid or missing day of week.");
        return null;
      }
      // Fortnightly still needs an anchor date or last payday date for proper cycle calculation.
      // This implementation finds the *next* occurrence of the target day, then the one after that.
      // It doesn't guarantee it's the "correct" one in a specific fortnightly cycle relative to past payments.
      // A more robust solution requires storing the last actual payday.
      const firstTargetDate = new Date(today);
      const currentDayNum = today.getDay();
      const daysUntilNextTargetDay = (targetDayNum - currentDayNum + 7) % 7;
      const initialDaysToAdd = daysUntilNextTargetDay === 0 ? 7 : daysUntilNextTargetDay;
      firstTargetDate.setDate(today.getDate() + initialDaysToAdd);
      
      // Find the second occurrence (14 days after the first *next* one)
      nextPayday = new Date(firstTargetDate);
      nextPayday.setDate(firstTargetDate.getDate() + 14); 
      // This is still a simplification - assumes pay happens every other specified day starting from the next one.
      console.warn("Fortnightly calculation is simplified and may not align with true pay cycle without an anchor date.");
      break;
    }

    case "weekly": {
      // Weekly calculation using dayOfWeek
      const targetDayNum = dayOfWeek ? dayOfWeekMap[dayOfWeek.toLowerCase()] : undefined;
      if (targetDayNum === undefined) {
        console.warn("Cannot calculate weekly payday: Invalid or missing day of week.");
        return null;
      }
      const currentDayNum = today.getDay();
      const daysUntilTarget = (targetDayNum - currentDayNum + 7) % 7;
      // If today IS the target day, schedule for next week
      const daysToAdd = daysUntilTarget === 0 ? 7 : daysUntilTarget;
      nextPayday.setDate(today.getDate() + daysToAdd);
      break;
    }

    default: {
      console.error(`Unsupported frequency: ${frequency}`);
      return null; // Unsupported frequency
    }
  }

  return nextPayday;
}

// Map desired day names to numerical day of the week (0=Sun, 1=Mon, ...)
const dayOfWeekMap: { [key: string]: number } = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// Updated interface for the projected schedule item
export interface ProjectedScheduleItem {
  allowanceDate: Date; // Renamed from 'date' for clarity
  allowanceAmount: number; // Renamed from 'amount'
  billsDueInPeriod: number; 
  leftoverForPeriod: number | null; // Renamed from 'leftoverInPeriod'
}

/**
 * Generates a projected schedule of smoothed allowances, including estimated bills due 
 * and leftover amount for the period following each allowance.
 * 
 * @param settings - User settings object.
 * @param bills - An array of active bill documents.
 * @param count - The number of future allowances to project.
 * @returns An array of projected schedule items.
 */
export function generateProjectedSchedule(
  settings: {
    desiredPayFrequency?: string | null;
    desiredPayDayOfWeek?: string | null;
    desiredPayAmount?: number | null;
  },
  bills: Doc<"bills">[], 
  count: number = 5
): ProjectedScheduleItem[] {

  const { desiredPayFrequency, desiredPayDayOfWeek, desiredPayAmount } = settings;

  if (!desiredPayFrequency || !desiredPayDayOfWeek || desiredPayAmount === null || desiredPayAmount === undefined) {
    console.warn("Cannot generate projected schedule: Missing desired settings.");
    return [];
  }

  const targetDayNum = dayOfWeekMap[desiredPayDayOfWeek.toLowerCase()];
  if (targetDayNum === undefined) {
    console.warn(`Cannot generate projected schedule: Invalid desired day: ${desiredPayDayOfWeek}`);
    return [];
  }

  const schedule: ProjectedScheduleItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  let currentAllowanceDate = new Date(today);

  // Find the date of the *first* upcoming target day (allowance day)
  const currentDayNum = today.getDay();
  const daysUntilNextTargetDay = (targetDayNum - currentDayNum + 7) % 7;
  const initialDaysToAdd = daysUntilNextTargetDay === 0 ? 7 : daysUntilNextTargetDay;
  currentAllowanceDate.setDate(today.getDate() + initialDaysToAdd);

  // Determine the interval based on frequency (should be weekly or fortnightly)
  let intervalDays: number;
  switch (desiredPayFrequency.toLowerCase()) {
    case 'weekly': intervalDays = 7; break;
    case 'fortnightly': intervalDays = 14; break;
    default: 
      console.warn(`Unsupported frequency for projection: ${desiredPayFrequency}`);
      return [];
  }

  // Generate the schedule
  for (let i = 0; i < count; i++) {
    // Determine the *end* of the period for bill calculation (the day before the *next* allowance)
    const nextAllowanceDate = addDays(currentAllowanceDate, intervalDays);
    
    // Calculate bills due AFTER the current allowance date up to and including the next allowance date.
    // This represents the bills that need to be paid FROM the current allowance.
    const billsDueInPeriod = calculateBillsBetweenDates(bills, currentAllowanceDate, nextAllowanceDate);
    
    // Calculate leftover for this period
    const leftoverForPeriod = desiredPayAmount - billsDueInPeriod;

    schedule.push({
      allowanceDate: new Date(currentAllowanceDate), // Store a copy
      allowanceAmount: desiredPayAmount,
      billsDueInPeriod: billsDueInPeriod,
      leftoverForPeriod: leftoverForPeriod, 
    });

    // Advance currentAllowanceDate for the next iteration
    currentAllowanceDate = nextAllowanceDate; 
  }

  return schedule;
} 