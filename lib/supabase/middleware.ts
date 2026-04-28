import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: CookieToSet) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isApiAdmin = pathname.startsWith("/api/admin");
  const isLogin = pathname === "/login" || pathname.startsWith("/auth");

  // Public routes that bypass auth entirely
  const isPublic =
    pathname.startsWith("/sign/") ||
    pathname.startsWith("/pay/") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/public/") ||
    pathname === "/" ||
    isLogin;

  if (isPublic) return response;

  if ((isAdmin || isApiAdmin) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Owner-only gate: only configured emails can access /admin (supports comma list)
  if ((isAdmin || isApiAdmin) && user) {
    const { isOwner } = await import("@/lib/owner");
    if (!isOwner(user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "not_authorized");
      return NextResponse.redirect(url);
    }
  }

  return response;
}
