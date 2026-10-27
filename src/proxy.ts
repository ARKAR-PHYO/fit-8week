import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * First line of defence: send signed-out visitors to /login and reject signed-out API calls.
 * This is not the only check. Every API route also calls requireUser() itself, because
 * proxy/middleware must never be the sole authorization boundary.
 */
export default auth((req) => {
  if (req.auth?.user) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const login = new URL("/login", req.nextUrl.origin);
  login.searchParams.set("callbackUrl", pathname + search);
  return NextResponse.redirect(login);
});

export const config = {
  matcher: [
    // Everything except: Auth.js endpoints, the login page, Next static assets,
    // the public PWA files (manifest, icons, launch images, service worker, offline page), and dish photos.
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|icons/|splash/|meals/|manifest.webmanifest|sw.js|offline.html).*)",
  ],
};
