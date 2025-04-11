import { type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useActionData } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import invariant from "tiny-invariant";
import { format, parseISO, isValid } from "date-fns"; // Added parseISO, isValid
import { useState, type FormEvent, type ChangeEvent } from "react"; // Added useState, FormEvent, ChangeEvent

// Import Shadcn Table components
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

// Import Button for actions later
import { Button } from "~/components/ui/button";

// Import Form components
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

// Import Dialog components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";

// Import Checkbox component
import { Checkbox } from "~/components/ui/checkbox"; // Re-enable Checkbox import

// Helper to format currency (Consider moving to a shared lib)
function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return "N/A";
    // Example using en-AU, adjust locale/currency as needed
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}

// Helper to format frequency for display
function formatFrequency(frequency: string | null | undefined): string {
    if (!frequency) return "N/A";
    switch (frequency) {
        case 'monthly': return "Monthly";
        case 'fortnightly': return "Fortnightly";
        case 'weekly': return "Weekly";
        case 'one-off': return "One-Off";
        default: return frequency; // Fallback
    }
}

// --- New Helper: Format Day as Ordinal ---
function formatDayOrdinal(day: number | null | undefined): string {
    if (day === null || day === undefined || isNaN(day) || day < 1 || day > 31) {
        return "Invalid Day"; 
    }
    // Handle 11th, 12th, 13th which are exceptions
    if (day >= 11 && day <= 13) {
        return `${day}th`;
    }
    // Handle suffixes for other numbers
    switch (day % 10) {
        case 1: return `${day}st`;
        case 2: return `${day}nd`;
        case 3: return `${day}rd`;
        default: return `${day}th`;
    }
}
// --- End Ordinal Helper ---

// Helper to format due date (Updated)
function formatDueDate(dueDate: number | null | undefined, frequency: string | null | undefined): string {
    if (dueDate === null || dueDate === undefined) return "-";
    if (frequency === 'monthly') {
        // Use the ordinal formatter and add context
        const ordinalDay = formatDayOrdinal(dueDate);
        // Avoid adding context if the day itself was invalid
        return ordinalDay === "Invalid Day" ? ordinalDay : `${ordinalDay} of the month`;
    } else if (frequency === 'one-off') {
        // Assuming dueDate is a timestamp for one-off
        try {
            return format(new Date(dueDate), "PPP"); // Format as date string
        } catch {
            return "Invalid Date";
        }
    } 
    // No specific due date needed for weekly/fortnightly in this simple format
    return "-";
}

// Frequency options for the Select dropdown
const frequencyOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "weekly", label: "Weekly" },
  { value: "one-off", label: "One-Off" },
];

// Loader function to fetch active bills
export const loader = async (args: LoaderFunctionArgs) => {
  invariant(process.env.CONVEX_URL, "Missing CONVEX_URL environment variable");
  const { userId } = await getAuth(args);

  if (!userId) {
    // Should not happen if protected by root loader/layout, but good practice
    // Depending on app structure, might redirect or throw Response
    console.warn("Unauthenticated access attempt to /bills route.");
    throw new Response("Unauthorized", { status: 401 }); 
  }

  const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

  try {
    // Fetch active bills using the query that accepts userId
    const bills = await convex.query(api.bills.listActiveBillsByUserId, { userId });
    // Return plain object for success
    return { bills }; 
  } catch (error) {
    console.error("Failed to fetch bills:", error);
    // Throw Response for error
    throw new Response("Failed to load bills.", { status: 500 });
  }
};

// Action Function Implementation
export const action = async (args: ActionFunctionArgs) => {
    invariant(process.env.CONVEX_URL, "Missing CONVEX_URL environment variable");
    const { request } = args;
    const { userId } = await getAuth(args);
    
    if (!userId) {
        return { success: false, message: "Authentication required." };
    }

    const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    try {
        if (intent === "addBill") {
            const name = formData.get("name") as string;
            const amountStr = formData.get("amount") as string;
            const frequency = formData.get("frequency") as string;
            const dueDateStr = formData.get("dueDate") as string | null; // Can be number or date string

            // --- Validation --- 
            if (!name || !amountStr || !frequency) {
                return { success: false, message: "Missing required fields (Name, Amount, Frequency)." };
            }
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount <= 0) {
                return { success: false, message: "Invalid amount." };
            }
            if (!frequencyOptions.map(f => f.value).includes(frequency)) {
                 return { success: false, message: "Invalid frequency." };
            }

            let dueDate: number | undefined = undefined;
            if (frequency === 'monthly') {
                const day = dueDateStr ? parseInt(dueDateStr, 10) : NaN;
                if (isNaN(day) || day < 1 || day > 31) {
                    return { success: false, message: "Invalid Due Day (1-31) for monthly bill." };
                }
                dueDate = day;
            } else if (frequency === 'one-off') {
                if (!dueDateStr) {
                     return { success: false, message: "Due Date is required for one-off bill." };
                }
                try {
                    const parsedDate = parseISO(dueDateStr); // Expects yyyy-MM-dd from <input type="date">
                    if (!isValid(parsedDate)) throw new Error();
                    dueDate = parsedDate.getTime(); // Store as timestamp number
                } catch {
                     return { success: false, message: "Invalid Due Date format for one-off bill." };
                }
            } 
            // No dueDate needed/validated for weekly/fortnightly
            
            // --- Call Convex Mutation --- 
            await convex.mutation(api.bills.addBill, {
                userId,
                name,
                amount,
                frequency: frequency as "monthly" | "fortnightly" | "weekly" | "one-off", 
                dueDate, // Pass number (day or timestamp) or undefined
                // isActive defaults to true in mutation
            });
            return { success: true, message: "Bill added successfully!" };

        } else if (intent === "deleteBill") {
            const billId = formData.get("billId") as Id<"bills"> | null;
            if (!billId) {
                 return { success: false, message: "Bill ID missing for delete operation." };
            }
            // --- Call Convex Mutation --- 
            await convex.mutation(api.bills.deleteBill, { billId, userId });
            return { success: true, message: "Bill deleted successfully!" };

        } else if (intent === "editBill") {
            const billId = formData.get("billId") as Id<"bills"> | null;
            const name = formData.get("name") as string;
            const amountStr = formData.get("amount") as string;
            const frequency = formData.get("frequency") as string;
            const dueDateStr = formData.get("dueDate") as string | null;
            const isActiveStr = formData.get("isActive") as string | undefined; // Checkbox value is 'on' or undefined

            // --- Validation ---
            if (!billId) {
                return { success: false, message: "Bill ID missing for edit operation." };
            }
            if (!name || !amountStr || !frequency) {
                return { success: false, message: "Missing required fields (Name, Amount, Frequency)." };
            }
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount <= 0) {
                return { success: false, message: "Invalid amount." };
            }
            if (!frequencyOptions.map(f => f.value).includes(frequency)) {
                return { success: false, message: "Invalid frequency." };
            }

            let dueDate: number | undefined | null = undefined; // Allow null to unset
            if (frequency === 'monthly') {
                const day = dueDateStr ? parseInt(dueDateStr, 10) : NaN;
                if (!dueDateStr) { // Allow unsetting for monthly
                    dueDate = null;
                } else if (isNaN(day) || day < 1 || day > 31) {
                    return { success: false, message: "Invalid Due Day (1-31) for monthly bill." };
                }
                dueDate = day;
            } else if (frequency === 'one-off') {
                if (!dueDateStr) { // Allow unsetting for one-off
                     dueDate = null;
                } else {
                    try {
                        const parsedDate = parseISO(dueDateStr);
                        if (!isValid(parsedDate)) throw new Error();
                        dueDate = parsedDate.getTime();
                    } catch {
                         return { success: false, message: "Invalid Due Date format for one-off bill." };
                    }
                }
            } else {
                dueDate = null; // Force null/undefined for weekly/fortnightly
            }

            const isActive = isActiveStr === "on"; // Convert checkbox value

            // --- Call Convex Mutation --- 
            await convex.mutation(api.bills.updateBill, {
                billId,
                userId, // Pass authenticated userId
                name: name || undefined,
                amount: amount || undefined,
                frequency: frequency as "monthly" | "fortnightly" | "weekly" | "one-off", // Use explicit type assertion
                dueDate: dueDate ?? undefined, // Pass number or undefined (convert null)
                isActive: isActive, 
            });
            return { success: true, message: "Bill updated successfully!" };

        } else {
             return { success: false, message: "Invalid form intent." };
        }

    } catch (error: unknown) {
        console.error(`Failed to ${intent === 'addBill' ? 'add' : intent === 'deleteBill' ? 'delete' : 'update'} bill:`, error);
        let errorMessage = "An unexpected server error occurred.";
        // Type guard for Convex errors or standard Errors
        if (typeof error === 'object' && error !== null && 'data' in error) {
            const convexError = error as { data?: { message?: string; code?: string } };
            if (typeof convexError.data === 'object' && convexError.data !== null && typeof convexError.data.message === 'string') {
                errorMessage = convexError.data.message;
            }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        return { success: false, message: `Operation failed: ${errorMessage}` };
    }
}

// Basic component structure
export default function BillsPage() {
  const { bills } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>(); // Get action data
  const [selectedFrequency, setSelectedFrequency] = useState<string>("");
  
  // --- State for Edit Bill Dialog ---
  const [editingBill, setEditingBill] = useState<Doc<"bills"> | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // State to hold the values being edited in the form
  const [editFormState, setEditFormState] = useState<Partial<Doc<"bills">>>({});
  // Separate state for the Select component value in the edit form
  const [editSelectedFrequency, setEditSelectedFrequency] = useState<string>("");
  // --- End Edit State ---

  // --- Event Handlers for Edit --- 
  // Function to open the edit dialog and initialize form state
  const handleEditClick = (bill: Doc<"bills">) => {
    setEditingBill(bill);
    // Initialize edit form state with the bill's current values
    setEditFormState({
        name: bill.name,
        amount: bill.amount,
        frequency: bill.frequency,
        dueDate: bill.dueDate,
        isActive: bill.isActive ?? true, // Default to true if null/undefined
    });
    setEditSelectedFrequency(bill.frequency || ""); // Initialize select value
    setIsEditDialogOpen(true);
  };

  // Function to close the edit dialog
  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingBill(null); // Clear editing state
    setEditFormState({}); // Clear form state
    setEditSelectedFrequency("");
  };
  // --- End Edit Handlers ---

  // --- Event Handlers for Edit Form --- 
  const handleEditFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setEditFormState(prev => ({ ...prev, [name]: value }));
  };
   // Handle Checkbox change specifically for Shadcn component
   const handleEditIsActiveChange = (checked: boolean | 'indeterminate') => {
     if (checked !== 'indeterminate') {
       setEditFormState(prev => ({ ...prev, isActive: checked }));
     }
   };
    // Handle Select change specifically for Shadcn component
   const handleEditFrequencyChange = (value: string) => {
     setEditSelectedFrequency(value);
     setEditFormState(prev => ({
         ...prev,
         frequency: value as Doc<"bills">["frequency"] | undefined,
         dueDate: (value === 'weekly' || value === 'fortnightly') ? undefined : prev.dueDate 
     }));
   };
   // --- End Edit Form Handlers ---

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Manage Bills</h1>

      {/* Action Feedback */} 
      {actionData?.success === false && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{actionData.message}</span>
        </div>
      )}
      {actionData?.success === true && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Success! </strong>
          <span className="block sm:inline">{actionData.message}</span>
        </div>
      )}

      {/* Add Bill Form */}
      <div className="mb-8 p-6 border rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Add New Bill</h2>
        <Form method="post" className="space-y-4">
           {/* Add an intent field for the action function */}
           <input type="hidden" name="intent" value="addBill" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">Bill Name</Label>
              <Input id="name" name="name" placeholder="e.g., Rent, Netflix" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" placeholder="e.g., 150.50" required step="0.01" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="frequency">Frequency</Label>
              <Select name="frequency" required value={selectedFrequency} onValueChange={setSelectedFrequency}>
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Conditionally render Due Date input */}
            {(selectedFrequency === 'monthly' || selectedFrequency === 'one-off') && (
              <div className="space-y-1">
                <Label htmlFor="dueDate">
                    {selectedFrequency === 'monthly' ? "Due Day (1-31)" : "Due Date"}
                </Label>
                 {/* Use type="number" for monthly day, type="date" for one-off date */}
                 <Input 
                    id="dueDate" 
                    name="dueDate" 
                    type={selectedFrequency === 'monthly' ? "number" : "date"} 
                    placeholder={selectedFrequency === 'monthly' ? "e.g., 15" : ""}
                    min={selectedFrequency === 'monthly' ? 1 : undefined}
                    max={selectedFrequency === 'monthly' ? 31 : undefined}
                    required 
                 />
              </div>
            )}
          </div>
          <Button type="submit">Add Bill</Button>
        </Form>
      </div>

      {/* Bill Listing Table */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Your Bills</h2>
        <div className="border rounded-lg">
          <Table>
            <TableCaption>A list of your active bills.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Due Date/Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead> 
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No bills added yet.</TableCell>
                </TableRow>
              ) : (
                bills.map((bill) => (
                  <TableRow key={bill._id}>
                    <TableCell className="font-medium">{bill.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(bill.amount)}</TableCell>
                    <TableCell>{formatFrequency(bill.frequency)}</TableCell>
                    <TableCell>{formatDueDate(bill.dueDate, bill.frequency)}</TableCell>
                    <TableCell>{bill.isActive === false ? "Inactive" : "Active"}</TableCell>
                    <TableCell className="text-right">
                      {/* Edit Button - onClick is updated */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mr-2" 
                        onClick={() => handleEditClick(bill)} // Use new handler
                      >
                        Edit
                      </Button>
                      {/* Delete Button Form */}
                      <Form 
                        method="post" 
                        className="inline-block" 
                        onSubmit={(e: FormEvent<HTMLFormElement>) => !confirm('Are you sure you want to delete this bill?') && e.preventDefault() } // Typed event 'e'
                      >
                        <input type="hidden" name="intent" value="deleteBill" />
                        <input type="hidden" name="billId" value={bill._id} />
                        <Button variant="destructive" size="sm" type="submit">
                          Delete
                        </Button>
                      </Form>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Bill Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && handleEditDialogClose()}> 
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={handleEditDialogClose}>
          <DialogHeader>
            <DialogTitle>Edit Bill: {editingBill?.name}</DialogTitle>
            <DialogDescription>
              Make changes to your bill details below.
            </DialogDescription>
          </DialogHeader>
          
          {/* Edit Bill Form - Replacing Placeholder */}
          <Form method="post" className="space-y-4 pt-4" onSubmit={() => setIsEditDialogOpen(false)} > 
            <input type="hidden" name="intent" value="editBill" />
            <input type="hidden" name="billId" value={editingBill?._id || ''} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name Input */}
              <div className="space-y-1">
                <Label htmlFor="edit-name">Bill Name</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  placeholder="e.g., Rent, Netflix" 
                  required 
                  value={editFormState.name || ''} 
                  onChange={handleEditFormChange} 
                />
              </div>
              {/* Amount Input */}
              <div className="space-y-1">
                <Label htmlFor="edit-amount">Amount</Label>
                <Input 
                  id="edit-amount" 
                  name="amount" 
                  type="number" 
                  placeholder="e.g., 150.50" 
                  required 
                  step="0.01" 
                  value={editFormState.amount || ''} 
                  onChange={handleEditFormChange} 
                />
              </div>
              {/* Frequency Select */}
              <div className="space-y-1">
                <Label htmlFor="edit-frequency">Frequency</Label>
                <Select 
                  name="frequency" 
                  required 
                  value={editSelectedFrequency} 
                  onValueChange={handleEditFrequencyChange}
                >
                  <SelectTrigger id="edit-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Due Date Input */}
              {(editSelectedFrequency === 'monthly' || editSelectedFrequency === 'one-off') && (
                <div className="space-y-1">
                  <Label htmlFor="edit-dueDate">
                    {editSelectedFrequency === 'monthly' ? 'Due Day (1-31)' : 'Due Date'}
                  </Label>
                  <Input
                    id="edit-dueDate"
                    name="dueDate"
                    type={editSelectedFrequency === 'monthly' ? 'number' : 'date'}
                    placeholder={editSelectedFrequency === 'monthly' ? 'e.g., 1' : ''}
                    min={editSelectedFrequency === 'monthly' ? 1 : undefined}
                    max={editSelectedFrequency === 'monthly' ? 31 : undefined}
                    // Format date correctly for input type=date
                    value={editSelectedFrequency === 'one-off' && editFormState.dueDate 
                             ? format(new Date(editFormState.dueDate), 'yyyy-MM-dd') 
                             : editFormState.dueDate?.toString() || ''}
                    onChange={handleEditFormChange}
                  />
                   <p className="text-xs text-muted-foreground">Leave blank to remove due date (if applicable).</p>
                </div>
              )}
            </div>
            
            {/* Is Active Checkbox */}
            <div className="flex items-center space-x-2 pt-2">
                 <Checkbox 
                    id="edit-isActive" 
                    name="isActive" 
                    checked={editFormState.isActive ?? true} 
                    onCheckedChange={handleEditIsActiveChange} 
                 />
                 <Label htmlFor="edit-isActive" className="text-sm font-medium leading-none">
                    Bill is Active
                 </Label>
             </div>

             <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={handleEditDialogClose}>Cancel</Button>
                <Button type="submit">Save Changes</Button> 
             </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
} 