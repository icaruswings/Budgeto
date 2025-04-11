import { Waitlist } from "@clerk/remix";
import { dark } from "@clerk/themes";
import { useTheme } from "remix-themes";

export default function WaitlistPage() {
  const [theme] = useTheme();

  return (
    <Waitlist appearance={{ baseTheme: theme === "dark" ? dark : undefined }} />
  );
}
