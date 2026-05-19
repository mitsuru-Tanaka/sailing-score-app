"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const NAV  = "#1F4E78";
const WHITE = "#ffffff";
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setEmail(session?.user?.email ?? null);
        setDisplayName((session?.user?.user_metadata?.display_name as string | undefined) ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="no-print"
      style={{
        backgroundColor: NAV,
        color: WHITE,
        padding: "0 24px",
        height: "52px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Link
          href="/"
          style={{
            color: WHITE,
            textDecoration: "none",
            fontWeight: "700",
            fontSize: "17px",
            letterSpacing: "0.02em",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ⛵ セーリング得点管理
        </Link>
        {IS_LOCAL ? (
          <span style={{
            backgroundColor: "#ea580c",
            color: WHITE,
            fontSize: "11px",
            fontWeight: "700",
            padding: "2px 8px",
            borderRadius: "4px",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}>
            ローカルモード
          </span>
        ) : (
          <span style={{
            backgroundColor: "rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.65)",
            fontSize: "11px",
            fontWeight: "600",
            padding: "2px 8px",
            borderRadius: "4px",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}>
            クラウドモード
          </span>
        )}
      </div>

      {email && (
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link
            href="/admin"
            style={{
              color: "rgba(255,255,255,0.75)",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            管理
          </Link>
          <Link
            href="/account"
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "13px",
              maxWidth: "200px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: "none",
            }}
          >
            {displayName || email}
          </Link>
          <button
            onClick={handleLogout}
            style={{
              padding: "5px 12px",
              backgroundColor: "rgba(255,255,255,0.12)",
              color: WHITE,
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            ログアウト
          </button>
        </div>
      )}
    </header>
  );
}
