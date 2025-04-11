import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import invariant from "tiny-invariant";
import { addDays } from 'date-fns';
import { calculateUpcomingBillsTotal } from "../lib/bills";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import convex from "~/lib/convex.server";
import { formatCurrency } from "~/lib/utils";

// Define the types for the data returned by the loader
interface LoaderData {
  settings: Doc<"userSettings"> | null;
  bills: Doc<"bills">[];
  upcomingBillsTotal: number;
  leftoverAmount: number | null;
}

// Loader function
export const loader = async (args: LoaderFunctionArgs): Promise<LoaderData> => {
  invariant(process.env.CONVEX_URL, "Missing CONVEX_URL environment variable");
  const { userId } = await getAuth(args);

  if (!userId) {
    // Should be handled by root loader/layout, but good to double check
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    // Fetch settings and bills in parallel using the userId
    const [settings, bills] = await Promise.all([
      convex.query(api.userSettings.getByUserId, { userId }), // Use getByUserId
      convex.query(api.bills.listActiveBillsByUserId, { userId }) // Use listActiveBillsByUserId
    ]);
    
    // Calculate upcoming bills total for the next 14 days
    const today = new Date();
    const fourteenDaysFromNow = addDays(today, 14);
    const dateRange = { startDate: today, endDate: fourteenDaysFromNow };
    
    const upcomingBillsTotal = calculateUpcomingBillsTotal(bills, dateRange);
    console.log(`Upcoming bills total for next 14 days: ${upcomingBillsTotal}`);
    
    // Calculate leftover amount
    let leftoverAmount: number | null = null;
    const smoothedPayoutAmount = settings?.desiredPayAmount;
    
    if (typeof smoothedPayoutAmount === 'number') {
      leftoverAmount = smoothedPayoutAmount - upcomingBillsTotal;
      console.log(`Smoothed Payout: ${smoothedPayoutAmount}, Leftover: ${leftoverAmount}`);
    } else {
      console.warn("User settings or desiredPayAmount not found/set, cannot calculate leftover amount.");
    }
    
    // Return plain object for success
    return { settings, bills, upcomingBillsTotal, leftoverAmount };

  } catch (error) {
    console.error("Failed to fetch dashboard data or calculate bills:", error);
    // Throw Response for error
    throw new Response("Failed to load dashboard data.", { status: 500 });
  }
};

export default function HomePage() {
  const data = useLoaderData<typeof loader>();

  // Prepare display values
  const displaySmoothedPayout = formatCurrency(data.settings?.desiredPayAmount);
  const displayUpcomingBills = formatCurrency(data.upcomingBillsTotal);
  const displayLeftover = formatCurrency(data.leftoverAmount);
  const leftoverValue = data.leftoverAmount;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Fortnightly Summary</CardTitle>
          <CardDescription>Your estimated finances for the next 14 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fortnightly Allowance</p>
                <p className="text-2xl font-bold">{displaySmoothedPayout}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Bills Total</p>
                <p className="text-2xl font-bold">{displayUpcomingBills}</p>
              </div>
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-sm font-medium text-muted-foreground cursor-help">
                      Money Left Over *
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Estimated amount remaining after subtracting upcoming bills (next 14 days) from your Fortnightly Allowance.</p>
                  </TooltipContent>
                </Tooltip>
                {leftoverValue !== null ? (
                  <p className={cn(
                    "text-2xl font-bold",
                    leftoverValue >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {displayLeftover}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">N/A - Set income in Settings</p>
                )}
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Temporary Debug Data (Optional - can be removed later) */}
      <details className="mt-4">
        <summary>Debug Data</summary>
        <h2>Settings</h2>
        <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(data.settings, null, 2)}</pre>
        <h2>Bills</h2>
        <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(data.bills, null, 2)}</pre>
      </details>
    </div>
  );
}
