"use client";
import { T } from "@/lib/theme";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const NAV    = T.accent;
const BORDER = T.border;
const WHITE  = T.white;
const TEXT   = T.text;
const MUTED  = T.muted;
const INPUT_STYLE: React.CSSProperties = {
  padding: "11px 14px",
  border: `1px solid ${BORDER}`,
  borderRadius: "8px",
  fontSize: "15px",
  width: "100%",
  outline: "none",
  backgroundColor: T.surface,
  boxSizing: "border-box",
};

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // メール確認が不要の場合はセッションが即時返る
    if (data.session) {
      window.location.href = "/";
      return;
    }

    // メール確認が必要な場合
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <main style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", backgroundColor: T.surface2, padding: "24px",
      }}>
        <div style={{
          width: "100%", maxWidth: "400px", backgroundColor: T.surface,
          border: `1px solid ${BORDER}`, borderRadius: "16px", padding: "40px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center",
        }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📧</div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: TEXT, marginBottom: "12px" }}>
            確認メールを送信しました
          </h2>
          <p style={{ fontSize: "14px", color: MUTED, marginBottom: "24px", lineHeight: "1.6" }}>
            <strong>{email}</strong> に確認メールを送りました。
            メール内のリンクをクリックしてアカウントを有効化してください。
          </p>
          <Link href="/login" style={{
            display: "inline-block", padding: "10px 24px",
            backgroundColor: NAV, color: WHITE, borderRadius: "8px",
            textDecoration: "none", fontSize: "14px", fontWeight: "700",
          }}>
            ログインへ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", backgroundColor: T.surface2, padding: "24px",
    }}>
      <div style={{
        width: "100%", maxWidth: "400px", backgroundColor: T.surface,
        border: `1px solid ${BORDER}`, borderRadius: "16px", padding: "40px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>⛵</div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: TEXT, margin: 0, marginBottom: "6px" }}>
            アカウント登録
          </h1>
          <p style={{ fontSize: "14px", color: MUTED, margin: 0 }}>
            メールアドレスとパスワードを設定してください
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "6px" }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              required
              style={INPUT_STYLE}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "6px" }}>
              パスワード（6文字以上）
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={INPUT_STYLE}
            />
          </div>

          {error && (
            <p style={{
              color: "#fca5a5", fontSize: "13px", marginBottom: "16px",
              padding: "10px 14px", backgroundColor: "rgba(220,38,38,0.15)",
              borderRadius: "8px", border: "1px solid #fecaca",
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "12px", backgroundColor: NAV, color: WHITE,
              border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer",
              fontSize: "15px", fontWeight: "700", opacity: loading ? 0.7 : 1,
              boxShadow: "0 2px 8px rgba(31,78,120,0.2)", marginBottom: "16px",
            }}
          >
            {loading ? "登録中..." : "アカウントを作成"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "13px", color: MUTED, margin: 0 }}>
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" style={{ color: NAV, fontWeight: "600", textDecoration: "none" }}>
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
