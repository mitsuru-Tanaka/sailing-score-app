import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開ルートはそのまま通す
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // 環境変数未設定時はスキップ（ローカル開発・設定ミス対策）
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
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
    });

    // getUser() はネットワーク呼び出しが発生して遅延・タイムアウトの原因になるため
    // ミドルウェアではクッキー内の JWT をローカル検証する getSession() を使用する
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }

    return response;
  } catch (e) {
    // Supabase クライアント初期化エラー時は通過させる（ログイン画面に飛ばさない）
    console.error("[middleware] supabase error:", e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.*|.*\\.svg|.*\\.png|.*\\.ico).*)",
  ],
};
