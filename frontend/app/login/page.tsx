"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";

const NAV    = "#1F4E78";
const WHITE  = "#ffffff";
const MUTED  = "#64748b";
const INPUT_STYLE: React.CSSProperties = {
  padding: "11px 14px",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: "8px",
  fontSize: "15px",
  width: "100%",
  outline: "none",
  backgroundColor: "rgba(255,255,255,0.15)",
  color: WHITE,
  boxSizing: "border-box",
};

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
    <main
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000000",
        overflow: "hidden",
        padding: "24px",
      }}
    >
      {/* 背景SVG: 470（左） */}
      <div style={{
        position: "absolute",
        left: "0",
        bottom: "0",
        width: "45%",
        maxWidth: "520px",
        height: "100%",
        display: "flex",
        alignItems: "flex-end",
        pointerEvents: "none",
        opacity: 0.55,
      }}>
        <Image
          src="/470.svg"
          alt="470"
          width={476}
          height={558}
          style={{ width: "100%", height: "auto", filter: "brightness(0) invert(1)" }}
          priority
        />
      </div>

      {/* 背景SVG: SNIPE（右） */}
      <div style={{
        position: "absolute",
        right: "0",
        bottom: "0",
        width: "45%",
        maxWidth: "520px",
        height: "100%",
        display: "flex",
        alignItems: "flex-end",
        pointerEvents: "none",
        opacity: 0.55,
        transform: "scaleX(-1)",
      }}>
        <Image
          src="/snipe.svg"
          alt="SNIPE"
          width={476}
          height={558}
          style={{ width: "100%", height: "auto", filter: "brightness(0) invert(1)" }}
          priority
        />
      </div>

      {/* フォームカード（グラスモーフィズム） */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: "20px",
          padding: "44px 40px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ marginBottom: "10px", display: "flex", justifyContent: "center", gap: "12px" }}>
            <Image src="/470.svg" alt="470" width={32} height={38}
              style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }} />
            <Image src="/snipe.svg" alt="SNIPE" width={32} height={38}
              style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }} />
          </div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "700",
              color: WHITE,
              margin: 0,
              marginBottom: "6px",
              letterSpacing: "0.03em",
            }}
          >
            セーリング得点管理
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", margin: 0 }}>
            管理者から届いた招待メールでアカウントを設定後、ログインしてください
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "rgba(255,255,255,0.65)",
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}
            >
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
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "rgba(255,255,255,0.65)",
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}
            >
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={INPUT_STYLE}
            />
          </div>

          {error && (
            <p
              style={{
                color: "#fca5a5",
                fontSize: "13px",
                marginBottom: "16px",
                padding: "10px 14px",
                backgroundColor: "rgba(220,38,38,0.18)",
                borderRadius: "8px",
                border: "1px solid rgba(220,38,38,0.4)",
              }}
            >
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

        <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.45)", margin: 0 }}>
          アカウントをお持ちでない方は{" "}
          <a href="/signup" style={{ color: "rgba(255,255,255,0.8)", fontWeight: "600", textDecoration: "none" }}>
            アカウント登録
          </a>
        </p>
      </div>
    </main>
  );
}
