import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require auth
const publicPaths = ["/", "/login", "/register", "/offline"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (publicPaths.some((path) => pathname === path || (path !== "/" && pathname.startsWith(path + "/")))) {
        return NextResponse.next();
    }

    const token = request.cookies.get("hdash_token_exists");

    if (!token) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-touch-icon.svg|manifest.json|sw.js|api).*)"],
};
