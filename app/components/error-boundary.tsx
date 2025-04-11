import { isRouteErrorResponse, useRouteError } from "@remix-run/react";

export default function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            {error.status} {error.statusText}
          </h1>
          <p className="text-gray-600">{error.data}</p>
        </div>
      </div>
    );
  }

  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-red-600">Something went wrong!</h1>
        <p className="text-gray-600">{errorMessage}</p>
      </div>
    </div>
  );
}
