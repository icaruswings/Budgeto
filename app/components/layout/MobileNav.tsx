// app/components/layout/MobileNav.tsx
// import React from "react"; // Removed unused import
import { Link } from "@remix-run/react"; // Uncomment Link
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "~/components/ui/sheet"; // Uncomment Sheet components
import { Button } from "~/components/ui/button";

export function MobileNav() {
  // Restore Sheet functionality
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden" // Only show on small screens
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <div className="flex flex-col space-y-4 pt-6">
           {/* Use SheetClose to automatically close the sheet on navigation */}
          <SheetClose asChild>
            <Link to="/" className="font-bold text-lg">
              PaySmoother
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link
              to="/schedule"
              className="text-muted-foreground hover:text-foreground"
            >
              Schedule
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link
              to="/bills"
              className="text-muted-foreground hover:text-foreground"
            >
              Bills
            </Link>
          </SheetClose>
           <SheetClose asChild>
            <Link
              to="/settings"
              className="text-muted-foreground hover:text-foreground"
            >
              Settings
            </Link>
          </SheetClose>
          {/* You could potentially add the login/logout button here too */}
        </div>
      </SheetContent>
    </Sheet>
  );
} 