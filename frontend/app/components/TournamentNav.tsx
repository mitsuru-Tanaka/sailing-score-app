"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/me";
import { T } from "@/lib/theme";

type Props = { id: string; name: string };

const TABS = [
  { label: "概要",   suffix: "" },
  { label: "艇登録", suffix: "/boats" },
  { label: "ルール", suffix: "/rules" },
  { label: "レース", suffix: "/races" },
  { label: "総合順位", suffix: "/standings" },
];

export default function TournamentNav({ id, name }: Props) {
  const pathname = usePathname() ?? "";
  const [canLiveReport, setCanLiveReport] = useState(false);

  useEffect(() => {
    getMe().then((me) => {
      setCanLiveReport(me?.role === "admin" || !!me?.live_reporter);
    });
  }, []);

  const tabs = canLiveReport
    ? [...TABS, { label: "速報", suffix: "/live" }]
    : TABS;

  function isActive(suffix: string) {
    const href = `/tournaments/${id}${suffix}`;
    if (suffix === "") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="no-print"
      style={{
        backgroundColor: T.surface,
        borderBottom: `1px solid ${T.border}`,
        position: "sticky",
        top: "52px",
        zIndex: 90,
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "stretch",
          gap: "0",
          overflowX: "auto",
        }}
      >
        <Link
          href="/"
          style={{
            color: T.muted,
            textDecoration: "none",
            fontSize: "13px",
            padding: "13px 12px 13px 0",
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            marginRight: "4px",
          }}
        >
          ← 一覧
        </Link>
        <span
          style={{
            color: T.text,
            fontWeight: "600",
            fontSize: "14px",
            padding: "13px 16px 13px 8px",
            display: "flex",
            alignItems: "center",
            borderRight: `1px solid ${T.border}`,
            marginRight: "8px",
            whiteSpace: "nowrap",
            maxWidth: "240px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name || "---"}
        </span>
        {tabs.map((tab) => (
          <Link
            key={tab.suffix}
            href={`/tournaments/${id}${tab.suffix}`}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "13px 14px",
              fontSize: "13px",
              textDecoration: "none",
              whiteSpace: "nowrap",
              color: isActive(tab.suffix) ? T.accent : T.muted,
              borderBottom: isActive(tab.suffix)
                ? `2px solid ${T.accent}`
                : "2px solid transparent",
              fontWeight: isActive(tab.suffix) ? "600" : "400",
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
