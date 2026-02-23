import { redirect } from "next/navigation";

/**
 * Root route — redirect to dashboard or login.
 * Middleware handles auth check; this is just a navigation shortcut.
 */
export default function HomePage() {
  redirect("/dashboard");
}
