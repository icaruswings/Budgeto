import { Outlet } from "@remix-run/react";
import Footer from "~/components/footer";

export default function Layout() {
  return (
    <main className="flex min-h-svh w-full flex-col">
      <div className="flex flex-1 items-center justify-center">
        <Outlet />
      </div>
      <div className="flex-none">
        <Footer />
      </div>
    </main>
  );
}
