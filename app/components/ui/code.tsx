import * as React from "react";

import { cn } from "~/lib/utils";

const Code = React.forwardRef<
  HTMLPreElement,
  React.HTMLAttributes<HTMLPreElement>
>(({ className, ...props }, ref) => (
  <pre
    ref={ref}
    className={cn("px-4 py-3 font-mono text-sm rounded-md bg-muted", className)}
    {...props}
  />
));
Code.displayName = "Code";

export { Code };
