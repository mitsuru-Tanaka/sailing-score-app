import { apiFetch } from "./api";

export type Me = {
  id: string;
  email: string;
  role: string;
  live_reporter: boolean;
};

const CACHE_KEY = "me_info";

/**
 * ログイン中ユーザーの情報（role / live_reporter）を返す。
 * タブ表示の制御用なのでセッション中は sessionStorage にキャッシュする。
 * 未ログイン・エラー時は null。
 */
export async function getMe(): Promise<Me | null> {
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as Me;
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }
  }
  try {
    const res = await apiFetch("/auth/me");
    if (!res.ok) return null;
    const me = (await res.json()) as Me;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(me));
    }
    return me;
  } catch {
    return null;
  }
}

/** ログアウト時などにキャッシュを消す */
export function clearMeCache() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CACHE_KEY);
  }
}
