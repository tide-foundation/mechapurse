import { NextRequest, NextResponse } from "next/server";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { routeRoleMapping } from "./lib/authConfig";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Determine required role from config
  const requiredRole = Object.keys(routeRoleMapping).find(route => pathname.startsWith(route));
  if (!requiredRole) return NextResponse.next(); // Skip if not a protected route

  console.debug(`[Middleware] Protecting: ${pathname} | Required Role: ${routeRoleMapping[requiredRole]}`);

  const token = req.cookies.get("kcToken")?.value;
  if (!token) {
    console.warn("[Middleware] No token found. Redirecting to /login.");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Verify the token for the required role
    const user = await verifyTideCloakToken(token, routeRoleMapping[requiredRole]);
    if (!user) throw new Error("Invalid or expired token.");

    console.debug("[Middleware] Token verified. Access granted.");

    return NextResponse.next();

  } catch (err) {
    console.error("[Middleware] Token verification failed:", err);
    return NextResponse.redirect(new URL("/auth/failure", req.url));
  }
}

export const config = {
  matcher: ["/authenticated/:path*", "/admin/:path*", "/moderator/:path*"], // Protect multiple routes
};
