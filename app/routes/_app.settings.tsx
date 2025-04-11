import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Form, useLoaderData, useNavigation, Link } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import invariant from "tiny-invariant";
import { calculateAnnualSalary, calculateTargetCycleAmount, calculateNextPayday } from "~/lib/payCalculations";
import { api } from "convex/_generated/api";
import { EmailAddress, getAuth } from "@clerk/remix/ssr.server";
import type { Doc } from "convex/_generated/dataModel";
import convex from "~/lib/convex.server";
import { parseISO, isValid, format } from "date-fns";
import clerk from "~/lib/clerk.server";

// Define days of the week for the select dropdown
const daysOfWeek = [
  { value: "Sunday", label: "Sunday" },
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
  { value: "Saturday", label: "Saturday" },
];

// Define default settings structure
const defaultSettings: Partial<Doc<"userSettings">> = {
  actualPayAmount: undefined,
  actualPayFrequency: "monthly",
  actualPayDayOfMonth: undefined,
  desiredPayFrequency: "fortnightly", 
  desiredPayDayOfWeek: undefined, 
  nextPaydayTimestamp: undefined,
  desiredPayAmount: undefined, 
};

// Interface for loader data
interface LoaderData {
    settings: Partial<Doc<"userSettings">>;
    currentAnnualSalary: number | null;
    currentDesiredCycleAmount: number | null;
    currentNextPayday: string | null; 
    daysOfWeek: typeof daysOfWeek;
}

// Loader function
export const loader = async (args: LoaderFunctionArgs): Promise<LoaderData> => {
  const { userId } = await getAuth(args);
  invariant(userId, "UserId not found");
  invariant(process.env.CONVEX_URL, "Missing CONVEX_URL environment variable");

  try {
    const userSettings = await convex.query(api.userSettings.getByUserId, { userId });
    const effectiveSettings = userSettings ?? defaultSettings;

    const currentAnnualSalary = calculateAnnualSalary(
      effectiveSettings.actualPayAmount,
      "monthly"
    );
    const currentDesiredCycleAmount = calculateTargetCycleAmount(
      currentAnnualSalary,
      "fortnightly"
    );

    let currentNextPayday: string | null = null;
    if (effectiveSettings.nextPaydayTimestamp) {
      try {
        currentNextPayday = format(new Date(effectiveSettings.nextPaydayTimestamp), "PPP");
      } catch (e) { console.error("Error formatting next payday timestamp:", e); }
    }

    return {
      settings: effectiveSettings,
      currentAnnualSalary,
      currentDesiredCycleAmount,
      currentNextPayday,
      daysOfWeek,
    };

  } catch (error) {
    console.error("Failed to fetch settings from Convex:", error);
    return {
        settings: defaultSettings,
        currentAnnualSalary: null,
        currentDesiredCycleAmount: null,
        currentNextPayday: null,
        daysOfWeek,
      };
  }
};

// Helper to format currency
function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}

// Component
export default function SettingsPage() {
  const { settings, currentAnnualSalary, currentDesiredCycleAmount, currentNextPayday, daysOfWeek } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Form state
  const [actualAmountInput, setActualAmountInput] = useState<string>(
    (settings?.actualPayAmount ?? "").toString()
  );
  const [actualPayDayOfMonth, setActualPayDayOfMonth] = useState<string>(
    (settings?.actualPayDayOfMonth ?? "").toString()
  );
  const [desiredPayDayOfWeek, setDesiredPayDayOfWeek] = useState<string>(
    settings?.desiredPayDayOfWeek ?? ""
  );
  const [nextPaydayDate, setNextPaydayDate] = useState<string>(
    settings?.nextPaydayTimestamp ? format(new Date(settings.nextPaydayTimestamp), 'yyyy-MM-dd') : ''
  );

  // Calculated display values state
  const [displayAnnualSalary, setDisplayAnnualSalary] = useState<string>(
    currentAnnualSalary ? formatCurrency(currentAnnualSalary) : ''
  );
  const [displayDesiredAmount, setDisplayDesiredAmount] = useState<string>(
    currentDesiredCycleAmount ? formatCurrency(currentDesiredCycleAmount) : ''
  );
  const [displayNextPayday, setDisplayNextPayday] = useState<string>(
    currentNextPayday ?? ''
  );

  // Effect to update calculated display values
  useEffect(() => {
    const amountNumber = parseFloat(actualAmountInput.replace(/[$,]/g, ''));
    const dayOfMonth = parseInt(actualPayDayOfMonth);
    const actualFreq = "monthly";
    const desiredFreq = "fortnightly";

    const annual = calculateAnnualSalary(isNaN(amountNumber) ? null : amountNumber, actualFreq);
    setDisplayAnnualSalary(annual ? formatCurrency(annual) : 'Enter valid amount');

    const targetAmount = calculateTargetCycleAmount(annual, desiredFreq);
    setDisplayDesiredAmount(targetAmount ? formatCurrency(targetAmount) : 'N/A');

    let nextPayday: Date | null = null;
    if (nextPaydayDate) {
      try {
        const parsed = parseISO(nextPaydayDate);
        if (isValid(parsed)) nextPayday = parsed;
      } catch { 
        // Ignore parsing errors
      }
    } else if (!isNaN(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31) {
      nextPayday = calculateNextPayday(actualFreq, dayOfMonth, undefined);
    }
    setDisplayNextPayday(nextPayday ? format(nextPayday, "PPP") : 'Enter day/date');

  }, [actualAmountInput, actualPayDayOfMonth, nextPaydayDate]);

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
      </header>

      {/* Action feedback display can be added here */} 

      <Form method="post" className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Pay Details</CardTitle>
            <CardDescription>Enter details about your regular pay cycle (assumed monthly).</CardDescription> 
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="actualPayAmount">Monthly Pay Amount</Label>
              <Input
                id="actualPayAmount"
                name="actualPayAmount"
                type="text" 
                placeholder="e.g., $5,000.00"
                value={actualAmountInput}
                onChange={(e) => setActualAmountInput(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualPayDayOfMonth">Payday (Day of Month)</Label>
              <Input
                id="actualPayDayOfMonth"
                name="actualPayDayOfMonth"
                type="number"
                min="1"
                max="31"
                placeholder="e.g., 15"
                value={actualPayDayOfMonth}
                onChange={(e) => setActualPayDayOfMonth(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nextPaydayDate">Next Actual Payday Date (Optional)</Label>
              <Input 
                id="nextPaydayDate"
                name="nextPaydayDate" 
                type="date" 
                value={nextPaydayDate} 
                onChange={(e) => setNextPaydayDate(e.target.value)} 
              />
              <p className="text-sm text-muted-foreground">If known, otherwise we&rsquo;ll calculate based on your pay day.</p> 
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calculated Values</CardTitle>
             <CardDescription>Based on your pay details.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Estimated Annual Salary</p>
                <p className="text-lg font-semibold">{displayAnnualSalary || "-"}</p>
             </div>
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Next Calculated Payday</p>
                <p className="text-lg font-semibold">{displayNextPayday || "-"}</p>
             </div>
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Fortnightly Allowance Amount</p>
                <p className="text-lg font-semibold">{displayDesiredAmount || "-"}</p>
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Smoothed Allowance Cycle</CardTitle>
            <CardDescription>Set your preferred fortnightly allowance schedule.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="desiredPayDayOfWeek">Allowance Day (Day of Week)</Label>
              <Select 
                name="desiredPayDayOfWeek" 
                required 
                value={desiredPayDayOfWeek} 
                onValueChange={setDesiredPayDayOfWeek}
              >
                <SelectTrigger id="desiredPayDayOfWeek">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </Card>
      </Form>

      {/* Projected Schedule Removed */} 

      <div className="mt-8 text-center">
          <Link to="/dashboard" className="text-blue-600 hover:underline">
              &larr; Back to Dashboard
          </Link>
      </div>
    </div>
  );
}

// Define args type based on Convex mutation, excluding internal/calculated fields
type UpsertUserSettingsArgs = Omit<typeof api.userSettings.upsert._args, 'desiredPayAmount' | 'desiredPayFrequency' | 'actualPayFrequency'>;

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);
  invariant(userId, "User must be logged in to save settings.");
  const user = await clerk.users.getUser(userId);
  const primaryEmail = user.emailAddresses.find((e: EmailAddress) => e.id === user.primaryEmailAddressId)?.emailAddress;
  invariant(primaryEmail, "Primary email not found for user.");

  const formData = await args.request.formData();

  // Extract and validate data
  const actualPayAmountStr = formData.get("actualPayAmount") as string;
  const actualPayDayOfMonthStr = formData.get("actualPayDayOfMonth") as string;
  const desiredPayDayOfWeek = formData.get("desiredPayDayOfWeek") as string;
  const nextPaydayDateStr = formData.get("nextPaydayDate") as string;

  // Basic validation
  if (!actualPayAmountStr || !actualPayDayOfMonthStr || !desiredPayDayOfWeek) {
    // Fix: Return plain object
    return { success: false, message: "Missing required fields: Amount, Pay Day, Desired Payout Day." };
  }

  const actualPayAmount = parseFloat(actualPayAmountStr.replace(/[$,]/g, ''));
  const actualPayDayOfMonth = parseInt(actualPayDayOfMonthStr, 10);

  if (isNaN(actualPayAmount) || actualPayAmount <= 0) {
    // Fix: Return plain object
    return { success: false, message: "Invalid actual pay amount." };
  }
  if (isNaN(actualPayDayOfMonth) || actualPayDayOfMonth < 1 || actualPayDayOfMonth > 31) {
    // Fix: Return plain object
    return { success: false, message: "Invalid actual pay day (must be 1-31)." };
  }
  if (!daysOfWeek.map(d => d.value).includes(desiredPayDayOfWeek)) {
    // Fix: Return plain object
    return { success: false, message: "Invalid desired payout day of week." };
  }

  // Handle optional next payday date
  let nextPaydayTimestamp: number | undefined = undefined;
  if (nextPaydayDateStr) {
    try {
      const parsedDate = parseISO(nextPaydayDateStr);
      if (!isValid(parsedDate)) throw new Error("Invalid date format");
      nextPaydayTimestamp = parsedDate.getTime(); // Store as timestamp
    } catch {
        // Fix: Return plain object
        return { success: false, message: "Invalid format for Next Payday Date." };
    }
  } else {
      // If not provided, calculate based on day of month
      const calculatedNext = calculateNextPayday("monthly", actualPayDayOfMonth, undefined);
      if (calculatedNext) {
          nextPaydayTimestamp = calculatedNext.getTime();
      } else {
          console.warn("Could not calculate next payday from day of month, leaving unset.");
          // Optionally return an error if calculation is mandatory when date isn't provided
          // return { success: false, message: "Could not calculate next payday. Please provide the date." };
      }
  }

  // Prepare data for Convex mutation
  const dataToSave: UpsertUserSettingsArgs = {
    userId: userId,
    userEmail: primaryEmail,
    actualPayAmount: actualPayAmount,
    actualPayDayOfMonth: actualPayDayOfMonth,
    desiredPayDayOfWeek: desiredPayDayOfWeek,
    nextPaydayTimestamp: nextPaydayTimestamp, // Pass timestamp or undefined
  };

  try {
    await convex.mutation(api.userSettings.upsert, dataToSave);
    // Fix: Return plain object for success
    return { success: true, message: "Settings saved successfully!" };
  } catch (error) {
    console.error("Failed to save settings to Convex:", error);
    // Fix: Throw Response for unexpected errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Response(JSON.stringify({ success: false, message: `Failed to save settings: ${errorMessage}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}; 