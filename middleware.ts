import { NextRequest, NextResponse } from "next/server";
import { verifyTideCloakToken } from "@/lib/tideJWT";
import { routeRoleMapping } from "./lib/authConfig";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Determine required roles from config
  const requiredRolesPath = Object.keys(routeRoleMapping).find(route => pathname.startsWith(route));
  if (!requiredRolesPath) return NextResponse.next(); // Skip if not a protected route

  const requiredRoles = routeRoleMapping[requiredRolesPath]; // Array of roles

  console.debug(`[Middleware] Protecting: ${pathname} | Allowed Roles: ${requiredRoles}`);

  const token = req.cookies.get("kcToken")?.value;
  if (!token) {
    console.warn("[Middleware] No token found. Redirecting to /login.");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Verify token for any of the allowed roles
    const user = await verifyTideCloakToken(token, requiredRoles);
    if (!user) throw new Error("Invalid or expired token.");

    console.debug("[Middleware] Token verified. Access granted.");
    return NextResponse.next();

  } catch (err) {
    console.error("[Middleware] Token verification failed:", err);
    return NextResponse.redirect(new URL("/auth/failure", req.url));
  }
}

export const config = {
  matcher: ["/authenticated/:path*", "/api/:path*", "/moderator/:path*"], // Protect multiple routes
};
