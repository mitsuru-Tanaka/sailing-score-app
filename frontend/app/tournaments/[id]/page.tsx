"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TournamentNav from "../../components/TournamentNav";
import { T } from "@/lib/theme";
import { apiFetch } from "@/lib/api";

type Tournament = {
  id: number;
  name: string;
  short_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  organizer?: string | null;
  class_name?: string | null;
  class_config?: string | null;
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

const NAV    = T.accent;
const BORDER = T.border;
const WHITE  = T.white;
const TEXT   = T.text;
const MUTED  = T.muted;
const INPUT_STYLE: React.CSSProperties = {
  padding: "10px 12px",
  border: `1px solid ${BORDER}`,
  borderRadius: "8px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
  backgroundColor: T.surface,
  boxSizing: "border-box",
};
const CARD: React.CSSProperties = {
  backgroundColor: T.surface,
  border: `1px solid ${BORDER}`,
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
};

const ACTIONS = [
  { href: "boats",     label: "艇登録",    icon: "⛵", desc: "参加艇・乗艇者を登録" },
  { href: "rules",     label: "ルール設定", icon: "📋", desc: "得点ルール・カット設定" },
  { href: "races",     label: "レース管理", icon: "🏁", desc: "レース追加・結果入力" },
  { href: "standings", label: "総合順位",   icon: "🏆", desc: "現時点の順位を確認" },
];

const EVENT_TEMPLATES = [
  { value: "INDIVIDUAL",         label: "個人戦" },
  { value: "TEAM_3_BOATS",       label: "団体戦（3艇）" },
  { value: "TEAM_4_BOATS",       label: "団体戦（4艇）" },
  { value: "MULTI_GROUP_HYBRID", label: "複合集計" },
];

function getEventTemplateLabel(t: string) {
  return EVENT_TEMPLATES.find(e => e.value === t)?.label ?? t;
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // メンバー追加
  const [addEmail, setAddEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addMessage, setAddMessage] = useState("");

  // 編集モーダル
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editShortName, setEditShortName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editOrganizer, setEditOrganizer] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editClassConfig, setEditClassConfig] = useState("");
  const [editEventTemplate, setEditEventTemplate] = useState("INDIVIDUAL");
  const [editNotes, setEditNotes] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  async function fetchTournament() {
    const res = await apiFetch(`/tournaments/${id}`);
    if (res.ok) setTournament(await res.json());
  }

  async function fetchMembers() {
    const res = await apiFetch(`/tournaments/${id}/members`);
    if (res.ok) setMembers(await res.json());
  }

  useEffect(() => {
    if (!id) return;
    async function init() {
      const [tRes, meRes] = await Promise.all([
        apiFetch(`/tournaments/${id}`),
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

  function openEditModal() {
    if (!tournament) return;
    setEditName(tournament.name);
    setEditShortName(tournament.short_name ?? "");
    setEditStartDate(tournament.start_date ?? "");
    setEditEndDate(tournament.end_date ?? "");
    setEditVenue(tournament.venue ?? "");
    setEditOrganizer(tournament.organizer ?? "");
    setEditClassName(tournament.class_name ?? "");
    setEditClassConfig(tournament.class_config ?? "");
    setEditEventTemplate(tournament.event_template);
    setEditNotes(tournament.notes ?? "");
    setEditError("");
    setShowEdit(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) { setEditError("大会名は必須です"); return; }
    setEditError(""); setEditLoading(true);
    try {
      const res = await apiFetch(`/tournaments/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName.trim(),
          short_name: editShortName.trim() || null,
          start_date: editStartDate || null,
          end_date: editEndDate || null,
          venue: editVenue.trim() || null,
          organizer: editOrganizer.trim() || null,
          class_name: editClassName.trim() || null,
          class_config: editClassConfig.trim() || null,
          event_template: editEventTemplate,
          notes: editNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.detail ?? "更新に失敗しました");
        return;
      }
      setTournament(await res.json());
      setShowEdit(false);
    } finally {
      setEditLoading(false);
    }
  }

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
          <p style={{ color: "#fca5a5" }}>大会情報の取得に失敗しました</p>
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
    ["クラス設定", tournament.class_config],
    ["備考",      tournament.notes],
  ];

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "5px",
  };

  return (
    <>
      <TournamentNav id={id} name={tournament.name} />
      <main style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto" }}>

        {/* 大会情報 */}
        <div style={{ ...CARD, marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", gap: "12px" }}>
            <div style={{ fontSize: "22px", fontWeight: "700", color: TEXT }}>
              {tournament.name}
            </div>
            {isOwnerOrAdmin && (
              <button
                onClick={openEditModal}
                style={{
                  padding: "7px 16px", fontSize: "13px", fontWeight: "600",
                  border: `1px solid ${BORDER}`, borderRadius: "8px",
                  backgroundColor: T.surface, color: NAV, cursor: "pointer",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                大会情報を編集
              </button>
            )}
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
                  style={{ ...INPUT_STYLE, flex: 1 }}
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
              {addError   && <p style={{ color: "#fca5a5", fontSize: "13px", marginTop: "8px", marginBottom: 0 }}>{addError}</p>}
              {addMessage && <p style={{ color: "#5eead4", fontSize: "13px", marginTop: "8px", marginBottom: 0 }}>{addMessage}</p>}
            </form>

            {members.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: T.surface2 }}>
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
                          backgroundColor: m.role === "owner" ? T.surface2 : "rgba(34,197,94,0.15)",
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

      {/* 編集モーダル */}
      {showEdit && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false); }}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "20px",
          }}
        >
          <div style={{
            backgroundColor: T.surface, borderRadius: "16px", padding: "32px",
            width: "100%", maxWidth: "560px", maxHeight: "90vh",
            overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", color: TEXT, margin: 0 }}>大会情報を編集</h2>
              <button
                onClick={() => setShowEdit(false)}
                style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: MUTED, padding: "4px 8px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>大会名 *</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} style={INPUT_STYLE} required />
                </div>
                <div className="grid-2" style={{ gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>略称</label>
                    <input value={editShortName} onChange={e => setEditShortName(e.target.value)} style={INPUT_STYLE} placeholder="例: 春イン" />
                  </div>
                  <div>
                    <label style={labelStyle}>大会種別</label>
                    <select value={editEventTemplate} onChange={e => setEditEventTemplate(e.target.value)} style={INPUT_STYLE}>
                      {EVENT_TEMPLATES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>開始日</label>
                    <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <label style={labelStyle}>終了日</label>
                    <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <label style={labelStyle}>会場</label>
                    <input value={editVenue} onChange={e => setEditVenue(e.target.value)} style={INPUT_STYLE} placeholder="例: 江の島ヨットハーバー" />
                  </div>
                  <div>
                    <label style={labelStyle}>主催</label>
                    <input value={editOrganizer} onChange={e => setEditOrganizer(e.target.value)} style={INPUT_STYLE} placeholder="例: ○○連盟" />
                  </div>
                  <div>
                    <label style={labelStyle}>クラス</label>
                    <input value={editClassName} onChange={e => setEditClassName(e.target.value)} style={INPUT_STYLE} placeholder="例: 470" />
                  </div>
                  <div>
                    <label style={labelStyle}>クラス設定</label>
                    <input value={editClassConfig} onChange={e => setEditClassConfig(e.target.value)} style={INPUT_STYLE} placeholder="例: 470,SNIPE" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>備考</label>
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    style={{ ...INPUT_STYLE, minHeight: "72px", resize: "vertical" }}
                  />
                </div>
              </div>

              {editError && <p style={{ color: "#fca5a5", fontSize: "13px", marginTop: "12px", marginBottom: 0 }}>{editError}</p>}

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button
                  type="submit"
                  disabled={editLoading}
                  style={{
                    padding: "10px 28px", backgroundColor: NAV, color: WHITE,
                    border: "none", borderRadius: "8px", cursor: "pointer",
                    fontWeight: "700", fontSize: "14px", opacity: editLoading ? 0.7 : 1,
                  }}
                >
                  {editLoading ? "保存中..." : "保存"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  style={{
                    padding: "10px 18px", backgroundColor: T.surface, color: MUTED,
                    border: `1px solid ${BORDER}`, borderRadius: "8px", cursor: "pointer", fontSize: "14px",
                  }}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
