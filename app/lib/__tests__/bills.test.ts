import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseISO } from 'date-fns';
import { calculateUpcomingBillsTotal, calculateBillsBetweenDates } from '../bills';
import type { Doc, Id } from '../../../convex/_generated/dataModel';

// Helper type for creating test bills (makes IDs/creationTime optional)
type TestBillInput = Omit<Partial<Doc<"bills">>, 'amount' | 'frequency' | 'name'> & {
    name: string;
    amount: number;
    frequency: Doc<"bills">["frequency"];
};

// Helper to create Bill objects with defaults
const createBill = (
    data: TestBillInput,
    // Default creation time far in the past unless specified
    creationTime = parseISO('2023-01-01T00:00:00.000Z').getTime()
): Doc<"bills"> => {
    return {
        _id: `${Math.random()}` as Id<"bills">, // Use specific type cast
        _creationTime: data._creationTime ?? creationTime,
        userId: data.userId || 'user123',
        name: data.name,
        amount: data.amount,
        frequency: data.frequency,
        dueDate: data.dueDate,
        isActive: data.isActive ?? true,
    };
};

// --- Test Setup --- 
const MOCK_TODAY_STR = '2024-04-15T10:00:00.000Z'; // Monday
const MOCK_TODAY = parseISO(MOCK_TODAY_STR);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MOCK_TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

// --- Test Data --- 
const bills: Doc<"bills">[] = [
    // Monthly - 1st of Month
    createBill({ name: 'Rent', amount: 1500, frequency: 'monthly', dueDate: 1 }),
    // Monthly - 20th of Month
    createBill({ name: 'Loan', amount: 300, frequency: 'monthly', dueDate: 20 }),
    // Fortnightly - Anchored to a specific past date (e.g., a Friday)
    createBill({ name: 'Salary Advance Repay', amount: 250, frequency: 'fortnightly', _creationTime: parseISO('2024-04-05T00:00:00Z').getTime() }), // Friday
    // Weekly - Anchored to a specific past date (e.g., a Wednesday)
    createBill({ name: 'Groceries', amount: 150, frequency: 'weekly', _creationTime: parseISO('2024-04-10T00:00:00Z').getTime() }), // Wednesday
    // One-off - In the past
    createBill({ name: 'Past Concert', amount: 100, frequency: 'one-off', dueDate: parseISO('2024-03-20T00:00:00Z').getTime() }),
    // One-off - In the future (within 14 days)
    createBill({ name: 'Upcoming Gig', amount: 80, frequency: 'one-off', dueDate: parseISO('2024-04-25T00:00:00Z').getTime() }),
    // One-off - In the future (outside 14 days)
    createBill({ name: 'Future Flight', amount: 450, frequency: 'one-off', dueDate: parseISO('2024-05-10T00:00:00Z').getTime() }),
    // Inactive Bill
    createBill({ name: 'Cancelled Sub', amount: 20, frequency: 'monthly', dueDate: 10, isActive: false }),
];

// --- calculateUpcomingBillsTotal Tests --- 
describe('calculateUpcomingBillsTotal', () => {
  it('should return 0 for an empty bills array', () => {
    const range = { startDate: MOCK_TODAY, endDate: parseISO('2024-04-29T00:00:00Z') };
    expect(calculateUpcomingBillsTotal([], range)).toBe(0);
  });

  it('should calculate total for the next 14 days correctly', () => {
    // Today: Mon Apr 15th. End: Mon Apr 29th (inclusive).
    // Expected: 
    // Loan (Apr 20th) = 300
    // Salary Repay (Apr 19th) = 250 
    // Groceries (Apr 17th, Apr 24th) = 150 + 150 = 300
    // Upcoming Gig (Apr 25th) = 80
    // TOTAL = 300 + 250 + 300 + 80 = 930
    const range = { startDate: MOCK_TODAY, endDate: parseISO('2024-04-29T00:00:00Z') }; // 14 days from Apr 15th
    expect(calculateUpcomingBillsTotal(bills, range)).toBe(930);
  });

  it('should include bills due on the start and end dates', () => {
    // Start: Apr 20th, End: Apr 25th
    // Expected:
    // Loan (Apr 20th) = 300
    // Groceries (Apr 24th) = 150
    // Upcoming Gig (Apr 25th) = 80
    // TOTAL = 300 + 150 + 80 = 530
    const range = { startDate: parseISO('2024-04-20T00:00:00Z'), endDate: parseISO('2024-04-25T00:00:00Z') };
    expect(calculateUpcomingBillsTotal(bills, range)).toBe(530);
  });

  it('should handle ranges spanning across months', () => {
    // Start: Apr 25th, End: May 5th
    // Expected: 
    // Upcoming Gig (Apr 25th) = 80
    // Groceries (May 1st) = 150
    // Salary Repay (May 3rd) = 250
    // Rent (May 1st) = 1500
    // TOTAL = 80 + 150 + 250 + 1500 = 1980
    const range = { startDate: parseISO('2024-04-25T00:00:00Z'), endDate: parseISO('2024-05-05T00:00:00Z') };
    expect(calculateUpcomingBillsTotal(bills, range)).toBe(1980);
  });

  it('should ignore inactive bills', () => {
     // Same range as first test, ensure inactive bill isn't added
    const range = { startDate: MOCK_TODAY, endDate: parseISO('2024-04-29T00:00:00Z') };
    expect(calculateUpcomingBillsTotal(bills, range)).toBe(930); // Should be same as first test
  });

});

// --- calculateBillsBetweenDates Tests --- 
describe('calculateBillsBetweenDates', () => {
  it('should return 0 for an empty bills array', () => {
    expect(calculateBillsBetweenDates([], MOCK_TODAY, parseISO('2024-04-29T00:00:00Z'))).toBe(0);
  });

  it('should calculate total between today and first payday (Apr 19th)', () => {
    // Start: Mon Apr 15th (exclusive). End: Fri Apr 19th (inclusive).
    // Expected:
    // Groceries (Apr 17th) = 150
    // Salary Repay (Apr 19th) = 250
    // TOTAL = 150 + 250 = 400
    const startDate = MOCK_TODAY;
    const endDate = parseISO('2024-04-19T00:00:00Z'); // Example first payday
    expect(calculateBillsBetweenDates(bills, startDate, endDate)).toBe(400);
  });

   it('should calculate the total for bills due between two dates (inclusive)', () => {
    // Range: Apr 19th (inclusive) to May 3rd (inclusive)
    // Expected Bills:
    // Loan Payment (Apr 19th) = 300
    // Salary Repay (Apr 19th) = 250 
    // Groceries (Apr 24th) = 150
    // Upcoming Gig (Apr 25th) = 80
    // Groceries (May 1st) = 150
    // Rent (May 1st) = 1500
    // Salary Repay (May 3rd) = 250 
    const startDate = parseISO('2024-04-19T00:00:00Z'); 
    const endDate = parseISO('2024-05-03T00:00:00Z'); 
    expect(calculateBillsBetweenDates(bills, startDate, endDate)).toBe(2680); // Corrected expectation based on recalculation
  });

  it('should calculate correctly for a range where the start date is inclusive', () => {
    // Start: Apr 20th (inclusive). End: Apr 25th (inclusive).
    // Expected:
    // Loan (Apr 20th) = 300
    // Groceries (Apr 24th) = 150
    // Upcoming Gig (Apr 25th) = 80
    // TOTAL = 300 + 150 + 80 = 530
    const startDate = parseISO('2024-04-20T00:00:00Z'); 
    const endDate = parseISO('2024-04-25T00:00:00Z'); 
    expect(calculateBillsBetweenDates(bills, startDate, endDate)).toBe(530);
  });

  it('should ignore inactive bills', () => {
     // Same range as first test, ensure inactive bill isn't added
    const startDate = MOCK_TODAY;
    const endDate = parseISO('2024-04-19T00:00:00Z');
    expect(calculateBillsBetweenDates(bills, startDate, endDate)).toBe(400);
  });

}); 