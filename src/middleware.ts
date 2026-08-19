import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "session";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/fonts")
  );
}

// Các khu vực chỉ dành riêng cho ADMIN - kiểm tra sớm ở middleware (edge)
const ADMIN_ONLY_PREFIXES = ["/admin", "/api/admin"];

type MinimalSession = { role: string; userId: number; departmentId: number | null };

async function verify(token: string): Promise<MinimalSession | null> {
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as MinimalSession;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verify(token) : null;

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Chưa đăng nhập hoặc phiên đã hết hạn." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) &&
    session.role !== "ADMIN"
  ) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập chức năng này." },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts).*)",
  ],
};
