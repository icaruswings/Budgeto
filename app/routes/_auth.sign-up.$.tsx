import { SignUp } from "@clerk/remix";
import { dark } from "@clerk/themes";
import { useTheme } from "remix-themes";

export default function SignUpPage() {
  const [theme] = useTheme();

  return (
    <SignUp appearance={{ baseTheme: theme === "dark" ? dark : undefined }} />
  );
}
