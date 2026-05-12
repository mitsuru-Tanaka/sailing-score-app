"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TournamentNav from "../../components/TournamentNav";
import { apiFetch, API_BASE } from "@/lib/api";

type Tournament = {
  id: number;
  name: string;
  short_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  organizer?: string | null;
  class_name?: string | null;
  event_template: string;
  notes?: string | null;
  owner_id?: string | null;
};

type Member = {
  user_id: string;
  email: string;
  role: string;
};

type Me = {
  id: string;
  email: string;
  role: string;
};

const NAV    = "#1F4E78";
const BORDER = "#e2e8f0";
const WHITE  = "#ffffff";
const TEXT   = "#1a2332";
const MUTED  = "#64748b";
const INPUT_STYLE: React.CSSProperties = {
  padding: "10px 12px",
  border: `1px solid ${BORDER}`,
  borderRadius: "8px",
  fontSize: "14px",
  flex: 1,
  outline: "none",
  backgroundColor: WHITE,
};
const CARD: React.CSSProperties = {
  backgroundColor: WHITE,
  border: `1px solid ${BORDER}`,
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const ACTIONS = [
  { href: "boats",     label: "艇登録",    icon: "⛵", desc: "参加艇・乗艇者を登録" },
  { href: "rules",     label: "ルール設定", icon: "📋", desc: "得点ルール・カット設定" },
  { href: "races",     label: "レース管理", icon: "🏁", desc: "レース追加・結果入力" },
  { href: "standings", label: "総合順位",   icon: "🏆", desc: "現時点の順位を確認" },
];

function getEventTemplateLabel(t: string) {
  switch (t) {
    case "INDIVIDUAL":         return "個人戦";
    case "TEAM_3_BOATS":       return "団体戦（3艇）";
    case "TEAM_4_BOATS":       return "団体戦（4艇）";
    case "MULTI_GROUP_HYBRID": return "複合集計";
    default:                   return t;
  }
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [addEmail, setAddEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addMessage, setAddMessage] = useState("");

  async function fetchMembers() {
    const res = await apiFetch(`/tournaments/${id}/members`);
    if (res.ok) setMembers(await res.json());
  }

  useEffect(() => {
    if (!id) return;
    async function init() {
      const [tRes, meRes] = await Promise.all([
        fetch(`${API_BASE}/tournaments/${id}`, { cache: "no-store" }),
        apiFetch("/auth/me"),
      ]);
      if (tRes.ok) setTournament(await tRes.json());
      if (meRes.ok) {
        setMe(await meRes.json());
        await fetchMembers();
      }
      setLoading(false);
    }
    init();
  }, [id]);

  const myMember = members.find((m) => m.user_id === me?.id);
  const isOwnerOrAdmin = myMember?.role === "owner" || me?.role === "admin";

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError(""); setAddMessage(""); setAddLoading(true);
    try {
      const res = await apiFetch(`/tournaments/${id}/members`, {
        method: "POST",
        body: JSON.stringify({ email: addEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAddError(data.detail ?? "追加に失敗しました");
        return;
      }
      setAddMessage(`${addEmail} を編集者として追加しました`);
      setAddEmail("");
      await fetchMembers();
    } finally {
      setAddLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <TournamentNav id={id ?? ""} name="" />
        <main style={{ padding: "32px 24px" }}>
          <p style={{ color: MUTED }}>読み込み中...</p>
        </main>
      </>
    );
  }

  if (!tournament) {
    return (
      <>
        <TournamentNav id={id ?? ""} name="" />
        <main style={{ padding: "32px 24px" }}>
          <p style={{ color: "#dc2626" }}>大会情報の取得に失敗しました</p>
        </main>
      </>
    );
  }

  type Field = [string, string | null | undefined];
  const fields: Field[] = [
    ["大会種別",  getEventTemplateLabel(tournament.event_template)],
    ["略称",      tournament.short_name],
    ["開催期間",  tournament.start_date
      ? `${tournament.start_date}${tournament.end_date && tournament.end_date !== tournament.start_date ? ` 〜 ${tournament.end_date}` : ""}`
      : null],
    ["会場",      tournament.venue],
    ["主催",      tournament.organizer],
    ["クラス",    tournament.class_name],
    ["備考",      tournament.notes],
  ];

  return (
    <>
      <TournamentNav id={id} name={tournament.name} />
      <main style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto" }}>

        {/* 大会情報 */}
        <div style={{ ...CARD, marginBottom: "28px" }}>
          <div style={{ fontSize: "22px", fontWeight: "700", color: TEXT, marginBottom: "20px" }}>
            {tournament.name}
          </div>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 24px", margin: 0 }}>
            {fields.filter(([, val]) => val).map(([label, val]) => (
              <div key={label} style={{ display: "contents" }}>
                <dt style={{ fontSize: "13px", color: MUTED, fontWeight: "600", whiteSpace: "nowrap", alignSelf: "baseline" }}>
                  {label}
                </dt>
                <dd style={{ fontSize: "14px", color: TEXT, margin: 0, alignSelf: "baseline" }}>
                  {val}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* アクションカード */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "14px", marginBottom: "28px" }}>
          {ACTIONS.map(({ href, label, icon, desc }) => (
            <Link
              key={href}
              href={`/tournaments/${tournament.id}/${href}`}
              style={{
                ...CARD,
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "20px",
              }}
            >
              <div style={{ fontSize: "26px" }}>{icon}</div>
              <div style={{ fontWeight: "700", fontSize: "15px", color: NAV }}>{label}</div>
              <div style={{ fontSize: "12px", color: MUTED }}>{desc}</div>
            </Link>
          ))}
        </div>

        {/* 編集メンバー管理（owner / admin のみ） */}
        {isOwnerOrAdmin && (
          <div style={{ ...CARD }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: TEXT, marginTop: 0, marginBottom: "20px" }}>
              編集メンバー管理
            </h2>

            {/* メンバー追加フォーム */}
            <form onSubmit={handleAddMember} style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "8px" }}>
                メールアドレスで編集者を追加（先にサインアップが必要です）
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="example@mail.com"
                  required
                  style={INPUT_STYLE}
                />
                <button
                  type="submit"
                  disabled={addLoading}
                  style={{
                    padding: "10px 18px", backgroundColor: NAV, color: WHITE,
                    border: "none", borderRadius: "8px", cursor: "pointer",
                    fontSize: "14px", fontWeight: "600",
                    opacity: addLoading ? 0.7 : 1, whiteSpace: "nowrap",
                  }}
                >
                  {addLoading ? "追加中..." : "追加"}
                </button>
              </div>
              {addError   && <p style={{ color: "#dc2626", fontSize: "13px", marginTop: "8px", marginBottom: 0 }}>{addError}</p>}
              {addMessage && <p style={{ color: "#0e6657", fontSize: "13px", marginTop: "8px", marginBottom: 0 }}>{addMessage}</p>}
            </form>

            {/* メンバー一覧 */}
            {members.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                    {["メールアドレス", "権限"].map((h) => (
                      <th key={h} style={{
                        padding: "9px 14px", textAlign: "left",
                        fontWeight: "600", fontSize: "12px", color: MUTED,
                        borderBottom: `1px solid ${BORDER}`,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.user_id}>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, color: TEXT }}>
                        {m.email}
                        {m.user_id === me?.id && (
                          <span style={{ marginLeft: "8px", fontSize: "11px", color: NAV, fontWeight: "600" }}>（あなた）</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: "999px",
                          fontSize: "11px", fontWeight: "600",
                          backgroundColor: m.role === "owner" ? "#eef2f7" : "#f0fdf9",
                          color: m.role === "owner" ? NAV : "#0e6657",
                        }}>
                          {m.role === "owner" ? "オーナー" : "編集者"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </main>
    </>
  );
}
