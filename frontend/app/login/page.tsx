"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

const NAV = "#1F4E78";
const WHITE = "#ffffff";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "メールアドレスまたはパスワードが正しくありません"
          : authError.message
      );
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", backgroundColor: "#000000", overflow: "hidden" }}>

      {/* 背景 470（左） */}
      <img
        src="/470.svg"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "0",
          bottom: "0",
          height: "90vh",
          width: "auto",
          opacity: 0.6,
          pointerEvents: "none",
          userSelect: "none",
        }}
      />

      {/* 背景 SNIPE（右・左右反転） */}
      <img
        src="/snipe.svg"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          right: "0",
          bottom: "0",
          height: "90vh",
          width: "auto",
          opacity: 0.6,
          transform: "scaleX(-1)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />

      {/* ログインフォーム（中央オーバーレイ） */}
      <div style={{
        position: "relative",
        zIndex: 10,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "20px",
          padding: "44px 40px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}>
          {/* タイトル */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>⛵</div>
            <h1 style={{
              fontSize: "20px",
              fontWeight: "700",
              color: WHITE,
              margin: 0,
              marginBottom: "8px",
              letterSpacing: "0.03em",
            }}>
              セーリング得点管理
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
              招待メールでアカウントを設定後、ログインしてください
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "rgba(255,255,255,0.6)",
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}>
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                required
                style={{
                  padding: "11px 14px",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: "8px",
                  fontSize: "15px",
                  width: "100%",
                  outline: "none",
                  backgroundColor: "rgba(255,255,255,0.12)",
                  color: WHITE,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "rgba(255,255,255,0.6)",
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}>
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  padding: "11px 14px",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: "8px",
                  fontSize: "15px",
                  width: "100%",
                  outline: "none",
                  backgroundColor: "rgba(255,255,255,0.12)",
                  color: WHITE,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <p style={{
                color: "#fca5a5",
                fontSize: "13px",
                marginBottom: "16px",
                padding: "10px 14px",
                backgroundColor: "rgba(220,38,38,0.2)",
                borderRadius: "8px",
                border: "1px solid rgba(220,38,38,0.4)",
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: NAV,
                color: WHITE,
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "15px",
                fontWeight: "700",
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 2px 12px rgba(31,78,120,0.5)",
                marginBottom: "16px",
              }}
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
            アカウントをお持ちでない方は{" "}
            <a href="/signup" style={{ color: "rgba(255,255,255,0.75)", fontWeight: "600", textDecoration: "none" }}>
              アカウント登録
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
