"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { T } from "@/lib/theme";

const IS_LOCAL = process.env.NEXT_PUBLIC_MODE === "local";

export default function TopBar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
      setDisplayName((user?.user_metadata?.display_name as string | undefined) ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setEmail(session?.user?.email ?? null);
      setDisplayName((session?.user?.user_metadata?.display_name as string | undefined) ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (displayName || email || "?")[0].toUpperCase();

  return (
    <header
      className="no-print"
      style={{
        backgroundColor: T.surface,
        color: T.text,
        padding: "0 24px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `2px solid ${T.accent}`,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* ロゴ */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <Link
          href="/"
          style={{
            color: T.text,
            textDecoration: "none",
            fontWeight: "800",
            fontSize: "16px",
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ color: T.accent, fontSize: "20px" }}>⛵</span>
          <span>SAILING</span>
          <span style={{ color: T.muted, fontWeight: "400" }}>SCORE</span>
        </Link>

        {IS_LOCAL ? (
          <span style={{
            backgroundColor: T.accent,
            color: T.white,
            fontSize: "10px",
            fontWeight: "700",
            padding: "2px 8px",
            borderRadius: "4px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            LOCAL
          </span>
        ) : (
          <span style={{
            backgroundColor: "transparent",
            color: T.muted,
            fontSize: "10px",
            fontWeight: "600",
            padding: "2px 8px",
            borderRadius: "4px",
            border: `1px solid ${T.border}`,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>
            CLOUD
          </span>
        )}
      </div>

      {/* ユーザーエリア */}
      {email && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/admin"
            style={{
              color: T.muted,
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "500",
              padding: "4px 8px",
              borderRadius: "6px",
              transition: "color 0.15s",
            }}
          >
            管理
          </Link>

          <Link
            href="/account"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
            }}
          >
            <span style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: T.accent,
              color: T.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "13px",
              flexShrink: 0,
            }}>
              {initial}
            </span>
            <span style={{
              color: T.text,
              fontSize: "13px",
              maxWidth: "160px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {displayName || email}
            </span>
          </Link>

          <button
            onClick={handleLogout}
            style={{
              padding: "5px 12px",
              backgroundColor: "transparent",
              color: T.muted,
              border: `1px solid ${T.border}`,
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              letterSpacing: "0.02em",
            }}
          >
            ログアウト
          </button>
        </div>
      )}
    </header>
  );
}
