import * as React from "react";
import { Link } from "@remix-run/react";
import { cn } from "~/lib/utils"; // Import cn utility

// MainNav component containing the desktop navigation links
export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        to="/schedule"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Schedule
      </Link>
      <Link
        to="/bills"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Bills
      </Link>
      <Link
        to="/settings"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Settings
      </Link>
    </nav>
  );
} 