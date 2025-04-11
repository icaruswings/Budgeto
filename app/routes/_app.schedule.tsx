import { useLoaderData } from "@remix-run/react";
import { type LoaderFunctionArgs } from "@remix-run/node";
import invariant from "tiny-invariant";
import { getAuth } from "@clerk/remix/ssr.server";
import convex from "~/lib/convex.server";
import { api } from "convex/_generated/api";
import type { Doc } from "convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils"; // Added cn for conditional styling
// Import Table components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
// Import date-fns for formatting if available, otherwise use built-in
import { format, addDays } from 'date-fns'; // Assuming date-fns is installed and added addDays
// Import the schedule generation function and type
import { generateProjectedSchedule, type ProjectedScheduleItem } from "~/lib/payCalculations";
// Import the bills calculation function
import { calculateUpcomingBillsTotal } from "~/lib/bills"; 
import { formatCurrency } from "~/lib/utils"; // Import from shared location

// Re-add the type definition for loader data
// Define the type for the settings data we expect from the loader
type ScheduleLoaderData = {
  settings: Doc<"userSettings"> | null;
  // Added fields for bill calculations
  bills: Doc<"bills">[]; 
  upcomingBillsTotal: number;
  leftoverAmount: number | null;
};

// Loader to fetch user settings and bills, and calculate totals
export const loader = async (args: LoaderFunctionArgs): Promise<ScheduleLoaderData> => {
  // Add log to see if loader runs
  console.log("[Schedule Loader] Executing...");
  const { userId } = await getAuth(args);
  invariant(userId, "User must be logged in to view the schedule page.");

  try {
    // Fetch settings and bills in parallel
    const [settings, bills] = await Promise.all([
      convex.query(api.userSettings.getByUserId, { userId }),
      convex.query(api.bills.listActiveBillsByUserId, { userId })
    ]);
     // Add log to see the fetched data
    console.log("[Schedule Loader] Fetched settings:", settings);
    console.log("[Schedule Loader] Fetched bills:", bills);

    // Calculate upcoming bills total for the next 14 days
    const today = new Date();
    const fourteenDaysFromNow = addDays(today, 14);
    const dateRange = { startDate: today, endDate: fourteenDaysFromNow };
    const upcomingBillsTotal = calculateUpcomingBillsTotal(bills, dateRange);
    console.log(`[Schedule Loader] Upcoming bills total: ${upcomingBillsTotal}`);

    // Calculate leftover amount
    let leftoverAmount: number | null = null;
    const smoothedPayoutAmount = settings?.desiredPayAmount;
    if (typeof smoothedPayoutAmount === 'number') {
      leftoverAmount = smoothedPayoutAmount - upcomingBillsTotal;
      console.log(`[Schedule Loader] Smoothed Payout: ${smoothedPayoutAmount}, Leftover: ${leftoverAmount}`);
    } else {
      console.warn("[Schedule Loader] User settings or desiredPayAmount not found/set, cannot calculate leftover amount.");
    }

    // Return plain object for success
    return { settings, bills, upcomingBillsTotal, leftoverAmount };

  } catch (error) {
    // Add log for errors
    console.error("[Schedule Loader] Failed to fetch data or calculate bills:", error);
    // Throw Response for error
    throw new Response("Failed to load schedule data.", { status: 500 });
  }
};

// Re-enable helper function
function formatDisplayDate(timestamp: number | string | null | undefined): string {
  if (timestamp === null || timestamp === undefined) return "Not set";
  try {
    // Handle both number (Unix ms) and string (ISO) formats
    const date = new Date(timestamp);
    // Check if date is valid after parsing
    if (isNaN(date.getTime())) {
        return "Invalid Date";
    }
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Error";
  }
}

export default function SchedulePage() {
  const { settings, bills, leftoverAmount } = useLoaderData<typeof loader>(); 

  // Generate the projected schedule, passing bills
  const projectedSchedule: ProjectedScheduleItem[] = settings
    ? generateProjectedSchedule(settings, bills, 5) 
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium">Allowance Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Review your upcoming fortnightly allowance schedule based on your settings.
        </p>
      </div>

      {settings ? (
        <Card>
          <CardHeader>
            <CardTitle>Next Actual Payday</CardTitle>
            <CardDescription>
              Your next calculated monthly payday.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Payday Date:</Label>
              <p className="text-xl font-semibold">
                {formatDisplayDate(settings.nextPaydayTimestamp)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
               <Label className="text-sm text-muted-foreground">Fortnightly Allowance Amount:</Label>
               <p className="text-xl font-semibold">
                   {formatCurrency(settings.desiredPayAmount)}
               </p>
                 {(settings.desiredPayAmount === null || settings.desiredPayAmount === undefined) && 
                   <p className="text-xs text-muted-foreground">(Ensure settings are saved if N/A)</p>
                 }
              </div>
              <div>
                 <Label className="text-sm text-muted-foreground">Money Left Over (Est. next 14 days)</Label>
                 <p className="text-xl font-semibold">
                     {formatCurrency(leftoverAmount)}
                 </p>
                 {leftoverAmount === null &&
                    <p className="text-xs text-muted-foreground">(Set income in Settings)</p>
                 }
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Display simple error message if settings failed to load
        <p className="text-destructive">
           Error: Could not load settings to display the schedule. Please try again later or check your settings page.
        </p>
      )}

      {/* Projected Schedule Table */}
      {settings && projectedSchedule.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Projected Allowance Dates</CardTitle>
            <CardDescription>
              Upcoming allowances based on your desired day ({settings.desiredPayDayOfWeek || 'N/A'}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Allowance Date</TableHead>
                  <TableHead className="text-right">Allowance Amount</TableHead>
                  <TableHead className="text-right">Bills Due (Period)</TableHead>
                  <TableHead className="text-right">Left Over (Period)</TableHead> 
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectedSchedule.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {format(item.allowanceDate, 'EEE, d MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.allowanceAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.billsDueInPeriod)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      item.leftoverForPeriod === null ? "" :
                      item.leftoverForPeriod >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(item.leftoverForPeriod)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : settings ? (
        <Card>
           <CardHeader>
             <CardTitle>Projected Allowance Dates</CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-muted-foreground">
               Could not generate projected schedule. Ensure your desired frequency, day of week, and amount are set correctly on the Settings page.
             </p>
           </CardContent>
         </Card>
      ) : null /* Settings failed loading, error already shown */}

    </div>
  );
} 