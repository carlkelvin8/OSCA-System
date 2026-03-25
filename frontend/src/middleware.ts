/**
 * Next.js Middleware — route-level auth guard.
 * Redirects unauthenticated users to /login.
 * Runs on Edge runtime for fast execution.
 *
 * Must live at src/middleware.ts (one level above /app) to be picked up by Next.js.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/api", "/welcome"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow landing page and public routes
    if (pathname === "/" || PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Check for access token cookie
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    // Exclude Next.js internals, static files, and any path with a file extension
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|pdf|css|js)).*)"],
};
