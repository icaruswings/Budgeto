// import { getAuth } from "@clerk/remix/ssr.server";
// import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import ErrorBoundary from "~/components/error-boundary";
import Footer from "~/components/footer";

// export const loader = async (args: LoaderFunctionArgs) => {
//   const { sessionId } = await getAuth(args);

//   if (!sessionId) {
//     const returnUrl = new URL(args.request.url);
//     throw redirect(`/sign-in?redirect_url=${returnUrl.pathname}`, {});
//   }

//   return null;
// };

export default function Layout() {
  return (
    <div className="container mx-auto">
      <main className="flex min-h-svh w-full flex-col">
        <div className="flex flex-1 overflow-hidden">
          <Outlet />
        </div>
        <div className="flex-none">
          <Footer />
        </div>
      </main>
    </div>
  );
}
 
export { ErrorBoundary };
