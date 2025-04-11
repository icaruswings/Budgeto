import React from "react";
import { Header } from "./Header";

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container pt-8 pb-8">
        {children}
      </main>
      {/* TODO: Add Footer? */}
    </div>
  );
} 