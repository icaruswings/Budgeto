import { useState, useEffect } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional fallback UI while mounting
}

/**
 * Utility component to only render its children on the client side after mounting.
 * Helps prevent hydration mismatches for components that behave differently
 * between server and client rendering (e.g., ones generating unique IDs).
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // Render nothing (or a fallback) on the server and initial client render
    return fallback;
  }

  // Render children only after mounting on the client
  return <>{children}</>;
} 