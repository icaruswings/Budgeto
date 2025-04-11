import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Code } from "~/components/ui/code";
import { useToast } from "~/hooks/use-toast";
import { CopyIcon, CheckIcon } from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/remix";

function RemixLogo() {
  return (
    <div className="h-[144px] w-[300px]">
      <img
        src="/logo-light.png"
        alt="Remix"
        className="block w-full dark:hidden"
      />
      <img
        src="/logo-dark.png"
        alt="Remix"
        className="hidden w-full dark:block"
      />
    </div>
  );
}

export function HeroSection() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const codeSnippet =
    "npx create-remix@latest --template=icaruswings/remix-prime-stack";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "The command has been copied to your clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 px-6 text-center">
      <div className="flex flex-col justify-start items-center">
        <RemixLogo />

        <SignedIn>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl mb-6">
            Welcome back to <span className="text-primary">Prime Stack</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Ready to continue building your next great Remix application?
            Let&apos;s get started!
          </p>
        </SignedIn>

        <SignedOut>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl mb-6">
            <span className="text-primary">Prime Stack</span>
            <br />
            <span className="text-3xl sm:text-4xl md:text-5xl">
              The Ultimate Remix Template
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Supercharge your Remix applications with a pre-configured stack of
            powerful technologies. Build faster, scale effortlessly, and deliver
            exceptional user experiences.
          </p>
        </SignedOut>

        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Code className="text-xs sm:text-sm md:text-lg p-4 bg-secondary text-secondary-foreground rounded-md pr-12">
              {codeSnippet}
            </Code>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={copyToClipboard}
            >
              {copied ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
