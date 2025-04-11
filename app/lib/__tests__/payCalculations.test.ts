import { describe, it, expect } from 'vitest';
import {
  calculateAnnualSalary,
  calculateTargetCycleAmount,
  // calculateNextPayday, // Test later with date mocking
  // generateProjectedSchedule, // Test later with mocks
} from '../payCalculations';

describe('calculateAnnualSalary', () => {
  it('should calculate annual salary correctly for monthly frequency', () => {
    expect(calculateAnnualSalary(5000, 'monthly')).toBe(60000);
  });

  it('should calculate annual salary correctly for fortnightly frequency', () => {
    // Assuming 26 fortnights per year
    // Relax precision due to floating point arithmetic on rounded input
    expect(calculateAnnualSalary(2307.69, 'fortnightly')).toBeCloseTo(60000, 0);
  });

  it('should calculate annual salary correctly for weekly frequency', () => {
    // Relax precision due to floating point arithmetic on rounded input
    expect(calculateAnnualSalary(1153.85, 'weekly')).toBeCloseTo(60000, 0);
  });

  it('should return null for invalid amount', () => {
    expect(calculateAnnualSalary(0, 'monthly')).toBeNull();
    expect(calculateAnnualSalary(-100, 'fortnightly')).toBeNull();
    expect(calculateAnnualSalary(null, 'weekly')).toBeNull();
    expect(calculateAnnualSalary(undefined, 'monthly')).toBeNull();
  });

  it('should return null for invalid frequency', () => {
    expect(calculateAnnualSalary(5000, null)).toBeNull();
    expect(calculateAnnualSalary(5000, undefined)).toBeNull();
    expect(calculateAnnualSalary(5000, 'bi-monthly')).toBeNull();
    expect(calculateAnnualSalary(5000, '')).toBeNull();
  });
});

describe('calculateTargetCycleAmount', () => {
  const annualSalary = 60000;

  it('should calculate target cycle amount correctly for monthly frequency', () => {
    expect(calculateTargetCycleAmount(annualSalary, 'monthly')).toBe(5000);
  });

  it('should calculate target cycle amount correctly for fortnightly frequency', () => {
    expect(calculateTargetCycleAmount(annualSalary, 'fortnightly')).toBeCloseTo(2307.69, 2);
  });

  it('should calculate target cycle amount correctly for weekly frequency', () => {
    expect(calculateTargetCycleAmount(annualSalary, 'weekly')).toBeCloseTo(1153.85, 2);
  });

  it('should return null for invalid annual salary', () => {
    expect(calculateTargetCycleAmount(0, 'monthly')).toBeNull();
    expect(calculateTargetCycleAmount(-10000, 'fortnightly')).toBeNull();
    expect(calculateTargetCycleAmount(null, 'weekly')).toBeNull();
    expect(calculateTargetCycleAmount(undefined, 'monthly')).toBeNull();
  });

  it('should return null for invalid target frequency', () => {
    expect(calculateTargetCycleAmount(annualSalary, null)).toBeNull();
    expect(calculateTargetCycleAmount(annualSalary, undefined)).toBeNull();
    expect(calculateTargetCycleAmount(annualSalary, 'yearly')).toBeNull();
    expect(calculateTargetCycleAmount(annualSalary, '')).toBeNull();
  });
});

// TODO: Add tests for calculateNextPayday using vi.useFakeTimers()
// TODO: Add tests for generateProjectedSchedule using vi.useFakeTimers() and vi.mock() for calculateBillsBetweenDates 