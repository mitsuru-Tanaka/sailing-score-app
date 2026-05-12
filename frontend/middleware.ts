import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 認証不要のパス
const PUBLIC_PATHS = ["/login"];
// /tournaments/xxx/standings にマッチ
const STANDINGS_RE = /^\/tournaments\/[^/]+\/standings(\/.*)?$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開ルートはそのまま通す
  if (
    PUBLIC_PATHS.includes(pathname) ||
    STANDINGS_RE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // 静的ファイル・_next を除く全パスに適用
    "/((?!_next/static|_next/image|favicon.*|.*\\.svg|.*\\.png|.*\\.ico).*)",
  ],
};
