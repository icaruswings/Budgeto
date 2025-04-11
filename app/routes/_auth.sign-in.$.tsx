import { SignIn } from "@clerk/remix";
import { dark } from "@clerk/themes";
import { useTheme } from "remix-themes";

export default function SignInPage() {
  const [theme] = useTheme();

  return (
    <SignIn appearance={{ baseTheme: theme === "dark" ? dark : undefined }} />
  );
}
