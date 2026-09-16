import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/courses", "/login", "/register", "/privacy", "/terms", "/paths", "/certificates", "/checkout"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Decode role from JWT payload (base64 middle segment — no verification needed here,
  // API routes enforce auth with the full secret)
  let role = "student";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    role = payload.role ?? "student";
  } catch {}

  if (pathname.startsWith("/instructor") && role !== "instructor" && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
