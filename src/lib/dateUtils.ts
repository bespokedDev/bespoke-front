/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Utility functions for consistent date handling across the application
 * Solves timezone issues and provides consistent date formatting
 */

/**
 * Extracts date part (YYYY-MM-DD) from ISO date string to avoid timezone issues
 * @param isoDateString - ISO date string like "2025-09-07T00:00:00.000Z"
 * @returns Date part as string "YYYY-MM-DD"
 */
export function extractDatePart(isoDateString: string): string {
  if (!isoDateString) return "";
  return isoDateString.split("T")[0];
}

/**
 * Formats a date string for display, avoiding timezone conversion issues
 * @param isoDateString - ISO date string like "2025-09-07T00:00:00.000Z"
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDateForDisplay(isoDateString: string): string {
  if (!isoDateString) return "N/A";
  return extractDatePart(isoDateString); // Returns "2025-09-07"
}

/**
 * Creates a sorting function for date columns that works correctly with both formats
 * @param dateField - The field name containing the date
 * @returns Sorting function for use in table columns
 */
export function createDateSortingFunction(dateField: string) {
  return (rowA: any, rowB: any) => {
    const dateA = extractDatePart(String(rowA.original[dateField] || ""));
    const dateB = extractDatePart(String(rowB.original[dateField] || ""));
    return dateA.localeCompare(dateB); // ISO format sorts correctly
  };
}

/**
 * Gets current date in YYYY-MM-DD format for form inputs
 * @returns Current date as string "YYYY-MM-DD"
 */
export function getCurrentDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Converts a date string to ISO format for API calls
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns ISO date string
 */
export function dateStringToISO(dateString: string): string {
  if (!dateString) return "";
  return new Date(dateString).toISOString();
}
