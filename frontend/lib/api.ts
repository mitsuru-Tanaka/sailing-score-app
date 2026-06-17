import { createClient } from "./supabase";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type ApiErrorKind = "timeout" | "network" | "auth" | "server" | "unknown";

/** apiFetch が投げる、原因が区別できるエラー */
export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

/** 原因に応じた日本語メッセージ */
export function apiErrorMessage(err: unknown, fallback = "通信に失敗しました"): string {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case "timeout":
        return "サーバーの応答がありません。時間をおいて再度お試しください（サーバー起動中の可能性があります）";
      case "network":
        return "ネットワークに接続できません。通信環境をご確認ください";
      case "auth":
        return "ログインの有効期限が切れました。再度ログインしてください";
      case "server":
        if (err.status === 501) return "この大会形式の順位表表示はまだ対応していません";
        return `サーバーエラーが発生しました（${err.status}）`;
      default:
        return err.message || fallback;
    }
  }
  return fallback;
}

/** 認証トークンを自動付与する fetch ラッパー */
export async function apiFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const timeoutMs = init?.timeoutMs ?? 12000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError("timeout", "リクエストがタイムアウトしました");
    }
    throw new ApiError("network", "ネットワークエラー");
  } finally {
    clearTimeout(timer);
  }

  // 認証切れ・サーバーエラーは投げて呼び出し側で区別できるようにする
  if (res.status === 401 || res.status === 403) {
    throw new ApiError("auth", "認証エラー", res.status);
  }
  if (res.status >= 500) {
    throw new ApiError("server", "サーバーエラー", res.status);
  }

  return res;
}
