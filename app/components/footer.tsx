export default function Footer() {
  return (
    <footer className="mt-auto py-4 text-center text-sm text-gray-500 dark:text-gray-400">
      <p>
        Remix Prime Stack - made with{" "}
        <svg
          className="inline-block h-4 w-4 text-red-500"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>{" "}
        by icaruswings | © 2024
      </p>
    </footer>
  );
}
