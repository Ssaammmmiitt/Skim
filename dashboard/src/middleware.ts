import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/complete", "/auth/signout"];

function isApiRoute(path: string) {
  return path.startsWith("/api/");
}

function apiJsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const api = isApiRoute(path);

  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return response;
  }

  if (!user) {
    if (api) return apiJsonError(401, "Unauthorized");
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    if (api) return apiJsonError(403, "Profile not found");
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "profile");
    return NextResponse.redirect(loginUrl);
  }

  if (
    (profile.status === "pending" || profile.status === "rejected") &&
    path !== "/pending"
  ) {
    if (api) return apiJsonError(403, "Account not approved");
    const pendingUrl = request.nextUrl.clone();
    pendingUrl.pathname = "/pending";
    return NextResponse.redirect(pendingUrl);
  }

  if (path.startsWith("/admin") && !["superuser", "admin"].includes(profile.role)) {
    if (api) return apiJsonError(403, "Forbidden");
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  if (profile.status === "active" && path === "/pending") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
