import { Link } from "@remix-run/react";
import { MainNav } from "~/components/MainNav";
import { MobileNav } from "~/components/layout/MobileNav";
import { ThemeToggle } from "~/components/theme-toggle";
import { UserButton } from "@clerk/remix";
import { ClientOnly } from "~/components/util/ClientOnly";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Mobile Nav and Main Nav */}
        <div className="mr-4 flex items-center"> {/* Adjusted container */}
          <Link to="/" className="mr-6 flex items-center space-x-2">
            {/* <Icons.logo className="h-6 w-6" /> */}
            <span className="font-bold">PaySmoother</span>
          </Link>
          {/* Render MainNav for desktop, hidden on mobile */}
          <MainNav className="hidden md:flex" />
        </div>
        <div className="ml-auto flex items-center space-x-4">
          {/* Wrap ThemeToggle in ClientOnly */}
          <ClientOnly>
            <ThemeToggle />
          </ClientOnly>

          {/* Wrap UserButton in ClientOnly as Clerk components can sometimes cause hydration issues too */}
          <ClientOnly>
            <UserButton afterSignOutUrl="/" />
          </ClientOnly>

          {/* Uncomment and Wrap MobileNav in ClientOnly */}
          {/* Ensure MobileNav is correctly imported or defined */}
          <ClientOnly>
            <MobileNav />
          </ClientOnly>
        </div>
      </div>
    </header>
  );
} 