import { Doc } from '../../convex/_generated/dataModel';
import {
  isWithinInterval,
  addWeeks,
  addMonths,
  startOfDay,
  endOfDay,
  isSameDay,
  setDate,
  isBefore,
  isAfter,
} from 'date-fns';

type Bill = Doc<'bills'>;

interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Calculates the total amount of bills due within a specified date range.
 * Handles one-off, weekly, fortnightly, and monthly frequencies.
 *
 * - For 'one-off' bills, checks if the dueDate (timestamp) falls within the range.
 * - For 'monthly' bills, checks if the dueDate (day of month) occurs within any month intersecting the range.
 * - For 'weekly' and 'fortnightly' bills, uses the bill's _creationTime as an anchor and calculates occurrences within the range.
 *
 * Note: Assumes bill.dueDate is a timestamp (number) for 'one-off' and a day of the month (number 1-31) for 'monthly'.
 * Weekly/Fortnightly do not use bill.dueDate for calculation, relying instead on _creationTime.
 *
 * @param bills - An array of bill documents (Doc<'bills'>).
 *   Each bill object should have at least: `_id`, `_creationTime`, `name`, `amount` (number), `frequency` (string literal), `dueDate` (optional number).
 * @param dateRange - An object with `startDate` and `endDate` (Date objects).
 * @returns The total calculated amount (number) of bills due within the specified range.
 *
 * @example
 * const bills = [
 *   { _id: '1', _creationTime: new Date('2023-01-01').getTime(), name: 'Rent', amount: 1000, frequency: 'monthly', dueDate: 1 },
 *   { _id: '2', _creationTime: new Date('2023-01-10').getTime(), name: 'Netflix', amount: 15, frequency: 'monthly', dueDate: 10 },
 *   { _id: '3', _creationTime: new Date('2023-01-15').getTime(), name: 'Gym', amount: 50, frequency: 'fortnightly' }, // dueDate not used
 *   { _id: '4', _creationTime: new Date('2023-02-05').getTime(), name: 'Concert Ticket', amount: 120, frequency: 'one-off', dueDate: new Date('2023-02-20').getTime() },
 * ];
 * const range = { startDate: new Date('2023-02-01'), endDate: new Date('2023-02-28') };
 * const total = calculateUpcomingBillsTotal(bills, range);
 * // total would include Rent (1000), Netflix (15), Gym (50 - assuming it falls in Feb), Concert Ticket (120)
 */
export function calculateUpcomingBillsTotal(bills: Bill[], dateRange: DateRange): number {
  let totalAmount = 0;
  const rangeStart = startOfDay(dateRange.startDate);
  const rangeEnd = endOfDay(dateRange.endDate);
  const interval = { start: rangeStart, end: rangeEnd };

  console.log(`Calculating total for interval: ${rangeStart.toISOString()} - ${rangeEnd.toISOString()}`);

  bills.forEach((bill) => {
    // Validate amount early
    if (typeof bill.amount !== 'number' || isNaN(bill.amount)) {
        console.warn(`Bill "${bill.name}" has invalid amount (${bill.amount}), skipping.`);
        return;
    }
    const billAmount = bill.amount;

    console.log(`Processing bill: ${bill.name}, Amount: ${billAmount}, Freq: ${bill.frequency}`);

    try {
      if (bill.frequency === 'one-off') {
        if (typeof bill.dueDate !== 'number') {
          console.error(`Invalid or missing dueDate (timestamp) for one-off bill "${bill.name}"`);
          return;
        }
        const dueDate = new Date(bill.dueDate);
        if (isNaN(dueDate.getTime())) {
          console.error(`Invalid date created from timestamp for one-off bill "${bill.name}"`);
          return;
        }
        if (isWithinInterval(dueDate, interval)) {
          console.log(` -> One-off bill "${bill.name}" is due on ${dueDate.toISOString()}`);
          totalAmount += billAmount;
        }
      } else if (bill.frequency === 'monthly') {
        if (typeof bill.dueDate !== 'number' || bill.dueDate < 1 || bill.dueDate > 31) {
          console.error(`Invalid or missing dueDate (day of month 1-31) for monthly bill "${bill.name}": ${bill.dueDate}`);
          return;
        }
        const dayOfMonth = bill.dueDate;

        // Start calculation from the beginning of the interval month
        let currentMonthDate = setDate(rangeStart, dayOfMonth);

        // If the calculated date in the start month is before the actual range start,
        // advance to the next month's due date.
        if (isBefore(currentMonthDate, rangeStart)) {
          currentMonthDate = addMonths(currentMonthDate, 1);
        }

        // Iterate through months as long as the calculated due date is not after the range end
        while (!isAfter(currentMonthDate, rangeEnd)) {
          // Double-check it's within the interval (handles start/end times correctly)
          if (isWithinInterval(currentMonthDate, interval)) {
             console.log(` -> Monthly bill "${bill.name}" (day ${dayOfMonth}) due on ${currentMonthDate.toISOString()}`);
             totalAmount += billAmount;
          }
          // Move to the next potential due date
          const nextMonthDate = addMonths(currentMonthDate, 1);
          // Prevent infinite loops if date doesn't advance
          if (isSameDay(nextMonthDate, currentMonthDate)) {
             console.error(`Monthly date calculation stuck for bill "${bill.name}", breaking loop.`);
             break;
          }
          currentMonthDate = nextMonthDate;
        }
      } else if (bill.frequency === 'weekly' || bill.frequency === 'fortnightly') {
        // Use creation time as the anchor date for weekly/fortnightly bills
        const initialDueDate = new Date(bill._creationTime);
        if (isNaN(initialDueDate.getTime())) {
          console.error(`Invalid date created from _creationTime for bill "${bill.name}"`);
          return;
        }

        let currentDate = initialDueDate;
        const addIntervalFn = bill.frequency === 'weekly' ? addWeeks : (date: Date) => addWeeks(date, 2);

        // Iterate backwards to find the first occurrence *before* or *at* the start of the interval
        // Limit backward search to prevent potential long loops if creationTime is very old
        let backwardIterations = 0;
        const maxBackwardIterations = 1000; // Adjust as needed
        while (currentDate > rangeStart && backwardIterations < maxBackwardIterations) {
          currentDate = addIntervalFn(currentDate, -1);
          backwardIterations++;
        }
        if(backwardIterations >= maxBackwardIterations) {
            console.warn(`Backward iteration limit reached for bill "${bill.name}". Calculation might be inaccurate if bill started very long ago.`);
        }

        // Iterate forwards from that point
        while (currentDate <= rangeEnd) {
          // Check if the calculated due date is within the range
          if (currentDate >= rangeStart && isWithinInterval(currentDate, interval)) {
            console.log(` -> ${bill.frequency} bill "${bill.name}" due on ${currentDate.toISOString()}`);
            totalAmount += billAmount;
          }
          // Move to the next potential due date
          const nextDate = addIntervalFn(currentDate, 1);
          // Prevent infinite loops if date doesn't advance
          if (isSameDay(nextDate, currentDate)) {
             console.error(`${bill.frequency} date calculation stuck for bill "${bill.name}", breaking loop.`);
             break;
          }
          currentDate = nextDate;
        }
      } else {
        console.warn(`Unknown frequency "${bill.frequency}" for bill "${bill.name}"`);
      }
    } catch (error) {
      console.error(`Error processing bill "${bill.name}":`, error);
    }
  });

  console.log(`Total calculated amount: ${totalAmount}`);
  // Consider rounding the total amount if needed
  return totalAmount; // parseFloat(totalAmount.toFixed(2));
}

/**
 * Calculates the total amount of bills due BETWEEN two dates (inclusive of start, inclusive of end).
 * This function now delegates to calculateUpcomingBillsTotal as the desired behavior is identical.
 * Useful for calculating bills due within a specific pay period.
 *
 * @param bills - An array of bill documents.
 * @param startDate - The start date of the period (inclusive).
 * @param endDate - The end date of the period (inclusive).
 * @returns The total amount of bills due within the specified period.
 */
export function calculateBillsBetweenDates(bills: Bill[], startDate: Date, endDate: Date): number {
  // Delegate to the function that already handles inclusive start and end dates.
  console.log(`Calculating bills between: ${startDate.toISOString()} (inclusive) and ${endDate.toISOString()} (inclusive) using calculateUpcomingBillsTotal`);
  return calculateUpcomingBillsTotal(bills, { startDate, endDate });
} 