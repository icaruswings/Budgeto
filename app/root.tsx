import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { useState } from "react";
import { rootAuthLoader } from "@clerk/remix/ssr.server";
import { ClerkApp, useAuth } from "@clerk/remix";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import {
  PreventFlashOnWrongTheme,
  ThemeProvider,
  useTheme,
} from "remix-themes";
import invariant from "tiny-invariant";
import tailwind from "./tailwind.css?url";
import { themeSessionResolver } from "./sessions.server";
import { cn } from "./lib/utils";
import { RootLayout } from "~/components/layout/RootLayout";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwind },
];

export const loader = async (args: LoaderFunctionArgs) => {
  return await rootAuthLoader(args, async ({ request }) => {
    const { getTheme } = await themeSessionResolver(request);

    invariant(
      process.env.CLERK_PUBLISHABLE_KEY,
      "CLERK_PUBLISHABLE_KEY is required"
    );
    invariant(process.env.CONVEX_URL, "CONVEX_URL is required");

    return {
      theme: getTheme(),
      ENV: {
        CONVEX_URL: process.env.CONVEX_URL,
        CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
      },
    };
  });
};

export const useRootLoaderData = () =>
  useRouteLoaderData<typeof loader>("root");

function App() {
  const data = useRootLoaderData();
  const [theme] = useTheme();

  return (
    <html lang="en" className={cn(theme)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data?.theme)} />
      </head>
      <body className={cn("font-sans antialiased")}>
        <RootLayout>
          <Outlet />
        </RootLayout>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function AppWithProviders() {
  const { theme, ENV } = useLoaderData<typeof loader>();
  const [convexClient] = useState(new ConvexReactClient(ENV.CONVEX_URL));

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      <ThemeProvider specifiedTheme={theme} themeAction="/action/set-theme">
        <App />
      </ThemeProvider>
    </ConvexProviderWithClerk>
  );
}

export default ClerkApp(AppWithProviders);
