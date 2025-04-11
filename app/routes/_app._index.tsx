import { ThemeToggle } from "~/components/theme-toggle";
import { HeroSection } from "~/components/hero-section";
import { FeatureGrid } from "~/components/feature-grid";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/remix";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useState } from "react";
import { inngest } from "~/inngest/client";
import { useSubmit } from "@remix-run/react";

export async function action() {
  await inngest.send({
    name: "update-message/event.sent",
    data: {
      message: "Hello from Inngest!",
    },
  });
  return null;
}

export default function HomePage() {
  const submit = useSubmit();
  const updateMessage = useMutation(api.messages.updateMessage);
  const message = useQuery(api.messages.getMessage);
  const [inputValue, setInputValue] = useState("");

  const handleProcessTask = () => {
    submit({}, { method: "post" });
  };

  const handleUpdateMessage = () => {
    if (inputValue.trim()) {
      updateMessage({ message: inputValue });
      setInputValue("");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <header className="container mx-auto py-6 px-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Prime Stack</h1>
        <div className="flex items-center gap-4">
          <SignedIn>
            <div className="flex items-center gap-4">
              <UserButton />
            </div>
          </SignedIn>

          <ThemeToggle />

          <SignedOut>
            <SignInButton>Log in</SignInButton>
          </SignedOut>
        </div>
      </header>
      <main>
        <HeroSection />
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-xl mx-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Test Integrations</h2>
              <div className="flex items-center gap-4">
                <Input
                  type="text"
                  placeholder="Enter a message"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <Button onClick={handleUpdateMessage}>Update Message</Button>
              </div>
              <p className="text-muted-foreground">Current message: {message}</p>
            </div>
            <div>
              <Button onClick={handleProcessTask}>
                Run Background Task
              </Button>
            </div>
          </div>
        </div>
        <FeatureGrid />
      </main>
      <footer className="container mx-auto py-6 px-4 text-center text-muted-foreground">
        <p>&copy; 2023 Prime Stack. All rights reserved.</p>
      </footer>
    </div>
  );
}
