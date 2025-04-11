import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency.
 * Uses en-AU locale and AUD currency by default.
 * Returns "N/A" if the amount is null or undefined.
 * 
 * @param amount - The number to format.
 * @returns The formatted currency string or "N/A".
 */
export function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return "N/A";
    // TODO: Consider making locale and currency configurable if needed
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}
