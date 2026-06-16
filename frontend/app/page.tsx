"use client";

import { apiFetch } from "@/lib/api";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  class_config?: string | null;
  owner_id?: string | null;
  deleted_at?: string | null;
};

const NAV = "#1F4E78";
const BORDER = "#e2e8f0";
const WHITE = "#ffffff";
const TEXT = "#1a2332";
const MUTED = "#64748b";
const INPUT_STYLE: React.CSSProperties = {
  padding: "10px 12px",
  border: `1px solid ${BORDER}`,
  borderRadius: "8px",
  fontSize: "14px",
  width: "100%",
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

function Badge({ children, variant = "navy" }: { children: string; variant?: "navy" | "teal" | "gray" }) {
  const map = {
    navy: { bg: "#eef2f7", color: NAV },
    teal: { bg: "#f0fdf9", color: "#0e6657" },
    gray: { bg: "#f1f5f9", color: "#475569" },
  };
  const s = map[variant];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: "600",
      backgroundColor: s.bg,
      color: s.color,
      letterSpacing: "0.03em",
    }}>
      {children}
    </span>
  );
}

function getTemplateLabel(t: string) {
  switch (t) {
    case "INDIVIDUAL":       return "個人戦";
    case "TEAM_3_BOATS":     return "団体戦（3艇）";
    case "TEAM_4_BOATS":     return "団体戦（4艇）";
    case "MULTI_GROUP_HYBRID": return "複合集計";
    default:                 return t;
  }
}

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [trashTournaments, setTrashTournaments] = useState<Tournament[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState<number | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState(false);

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [className, setClassName] = useState("");
  const [use470, setUse470] = useState(false);
  const [useSnipe, setUseSnipe] = useState(false);
  const [useOtherClass, setUseOtherClass] = useState(false);
  const [otherClassName, setOtherClassName] = useState("");
  const [eventTemplate, setEventTemplate] = useState("INDIVIDUAL");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchTournaments() {
    setLoading(true);
    setWaking(false);
    const wakeTimer = setTimeout(() => setWaking(true), 4000);
    // サーバーがスリープしている場合の起動待ち。1回失敗したら長めのタイムアウトで再試行する。
    const attemptTimeouts = [12000, 45000];
    try {
      let lastErr: unknown;
      for (const timeoutMs of attemptTimeouts) {
        try {
          const res = await apiFetch(`/tournaments`, { timeoutMs });
          if (!res.ok) throw new Error();
          setTournaments(await res.json());
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr;
    } catch {
      setError("大会一覧の取得に失敗しました");
    } finally {
      clearTimeout(wakeTimer);
      setWaking(false);
      setLoading(false);
    }
  }

  async function fetchCurrentUser() {
    try {
      const res = await apiFetch("/users/me");
      if (!res.ok) return;
      const u = await res.json();
      setCurrentUserId(u.id);
      setCurrentUserRole(u.role);
    } catch { /* auth disabled or not logged in */ }
  }

  async function fetchTrash() {
    setTrashLoading(true);
    try {
      const res = await apiFetch("/tournaments/trash");
      if (!res.ok) throw new Error();
      setTrashTournaments(await res.json());
    } catch {
      setError("ゴミ箱の取得に失敗しました");
    } finally {
      setTrashLoading(false);
    }
  }

  useEffect(() => {
    fetchTournaments();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (showTrash) fetchTrash();
  }, [showTrash]);

  function buildClassConfig() {
    const items: string[] = [];
    if (use470) items.push("470");
    if (useSnipe) items.push("SNIPE");
    if (useOtherClass && otherClassName.trim()) items.push(`OTHER:${otherClassName.trim()}`);
    return items.length > 0 ? items.join(",") : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("大会名は必須です"); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch("/tournaments", {
        method: "POST",
        body: JSON.stringify({
          name, short_name: shortName || null,
          start_date: startDate || null, end_date: endDate || null,
          venue: venue || null, organizer: organizer || null,
          class_name: className || null, class_config: buildClassConfig(),
          event_template: eventTemplate, notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      setName(""); setShortName(""); setStartDate(""); setEndDate("");
      setVenue(""); setOrganizer(""); setClassName(""); setEventTemplate("INDIVIDUAL");
      setNotes(""); setUse470(false); setUseSnipe(false);
      setUseOtherClass(false); setOtherClassName("");
      setShowForm(false);
      await fetchTournaments();
    } catch {
      setError("大会作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      const res = await apiFetch(`/tournaments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTournaments(prev => prev.filter(t => t.id !== id));
    } catch {
      setError("ゴミ箱への移動に失敗しました");
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  }

  async function handleRestore(id: number) {
    setRestoring(id);
    try {
      const res = await apiFetch(`/tournaments/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error();
      setTrashTournaments(prev => prev.filter(t => t.id !== id));
      await fetchTournaments();
    } catch {
      setError("復元に失敗しました");
    } finally {
      setRestoring(null);
    }
  }

  async function handlePermanentDelete(id: number) {
    setPermanentDeleting(true);
    try {
      const res = await apiFetch(`/tournaments/${id}/permanent`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTrashTournaments(prev => prev.filter(t => t.id !== id));
    } catch {
      setError("完全削除に失敗しました");
    } finally {
      setPermanentDeleting(false);
      setPermanentDeleteId(null);
    }
  }

  function canDelete(t: Tournament): boolean {
    if (currentUserRole === "admin") return true;
    if (!currentUserId) return false;
    if (t.owner_id === null || t.owner_id === undefined) return true; // 旧データ
    return t.owner_id === currentUserId;
  }

  return (
    <main style={{ padding: "32px 24px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, margin: 0 }}>大会一覧</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setShowTrash(!showTrash)}
            title="ゴミ箱"
            style={{
              padding: "9px 14px",
              backgroundColor: showTrash ? "#fef2f2" : WHITE,
              color: showTrash ? "#dc2626" : MUTED,
              border: `1px solid ${showTrash ? "#fecaca" : BORDER}`,
              borderRadius: "8px", cursor: "pointer", fontSize: "18px",
            }}
          >
            🗑️
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: "9px 18px",
              backgroundColor: showForm ? "#64748b" : NAV,
              color: WHITE, border: "none", borderRadius: "8px",
              cursor: "pointer", fontSize: "14px", fontWeight: "600",
            }}
          >
            {showForm ? "✕ 閉じる" : "+ 新規大会を作成"}
          </button>
        </div>
      </div>

      {/* 作成フォーム */}
      {showForm && (
        <div style={{ ...CARD, marginBottom: "28px" }}>
          <h2 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "20px", marginTop: 0, color: TEXT }}>
            新規大会作成
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>大会名 *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="例: 2026年春季インカレ" style={INPUT_STYLE} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>略称</label>
                <input value={shortName} onChange={e => setShortName(e.target.value)} placeholder="例: 春インカレ" style={INPUT_STYLE} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>大会種別</label>
                <select value={eventTemplate} onChange={e => setEventTemplate(e.target.value)} style={INPUT_STYLE}>
                  <option value="INDIVIDUAL">個人戦</option>
                  <option value="TEAM_3_BOATS">団体戦（3艇）</option>
                  <option value="TEAM_4_BOATS">団体戦（4艇）</option>
                  <option value="MULTI_GROUP_HYBRID">複合集計</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>開始日</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>終了日</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>会場</label>
                <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="例: 江の島ヨットハーバー" style={INPUT_STYLE} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>主催</label>
                <input value={organizer} onChange={e => setOrganizer(e.target.value)} placeholder="例: 関東学生ヨット連盟" style={INPUT_STYLE} />
              </div>
            </div>

            <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "14px", marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "10px" }}>対象クラス</div>
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                {[["use470", "470", use470, setUse470] as const,
                  ["useSnipe", "SNIPE", useSnipe, setUseSnipe] as const].map(([, label, val, setter]) => (
                  <label key={label} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                    <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} />
                    {label}
                  </label>
                ))}
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                  <input type="checkbox" checked={useOtherClass} onChange={e => setUseOtherClass(e.target.checked)} />
                  その他
                </label>
                {useOtherClass && (
                  <input value={otherClassName} onChange={e => setOtherClassName(e.target.value)}
                    placeholder="クラス名" style={{ ...INPUT_STYLE, width: "160px" }} />
                )}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>備考</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                style={{ ...INPUT_STYLE, minHeight: "72px", resize: "vertical" }} />
            </div>

            {error && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" disabled={submitting} style={{
                padding: "10px 24px", backgroundColor: NAV, color: WHITE,
                border: "none", borderRadius: "8px", cursor: "pointer",
                fontWeight: "600", fontSize: "14px",
                opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? "作成中..." : "大会を作成"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{
                padding: "10px 16px", backgroundColor: WHITE, color: MUTED,
                border: `1px solid ${BORDER}`, borderRadius: "8px", cursor: "pointer", fontSize: "14px",
              }}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 大会一覧 */}
      {loading ? (
        <p style={{ color: MUTED }}>
          {waking
            ? "サーバーを起動しています…初回は1分ほどかかることがあります"
            : "読み込み中..."}
        </p>
      ) : tournaments.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", padding: "48px", color: MUTED }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⛵</div>
          <p style={{ margin: 0 }}>大会が登録されていません。「新規大会を作成」から追加してください。</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {[...tournaments].reverse().map((t) => (
            <div
              key={t.id}
              style={{
                ...CARD,
                display: "flex", flexDirection: "column", gap: "10px",
                transition: "box-shadow 0.15s",
              }}
            >
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <Badge variant="navy">{getTemplateLabel(t.event_template)}</Badge>
                {t.class_config && t.class_config.split(",").map(c => (
                  <Badge key={c} variant="teal">{c.replace("OTHER:", "")}</Badge>
                ))}
              </div>
              <div style={{ fontSize: "17px", fontWeight: "700", color: TEXT, lineHeight: "1.3" }}>
                {t.name}
              </div>
              {(t.start_date || t.venue) && (
                <div style={{ fontSize: "13px", color: MUTED, display: "grid", gap: "3px" }}>
                  {t.start_date && (
                    <span>📅 {t.start_date}{t.end_date && t.end_date !== t.start_date ? ` 〜 ${t.end_date}` : ""}</span>
                  )}
                  {t.venue && <span>📍 {t.venue}</span>}
                </div>
              )}
              <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Link
                  href={`/tournaments/${t.id}`}
                  style={{
                    display: "inline-block", padding: "7px 16px",
                    backgroundColor: NAV, color: WHITE,
                    borderRadius: "6px", textDecoration: "none",
                    fontSize: "13px", fontWeight: "600",
                  }}
                >
                  開く →
                </Link>
                {canDelete(t) && (
                  <button
                    onClick={() => setDeleteConfirmId(t.id)}
                    title="ゴミ箱に移動"
                    style={{
                      padding: "6px 10px", backgroundColor: WHITE, color: "#dc2626",
                      border: "1px solid #fecaca", borderRadius: "6px",
                      cursor: "pointer", fontSize: "16px", lineHeight: 1,
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 削除確認モーダル */}
      {deleteConfirmId !== null && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: WHITE, borderRadius: "12px", padding: "28px 32px",
            maxWidth: "400px", width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: TEXT, marginBottom: "10px" }}>
              🗑️ ゴミ箱に移動しますか？
            </div>
            <div style={{ fontSize: "13px", color: MUTED, marginBottom: "24px" }}>
              ゴミ箱に移動します。ゴミ箱から復元できます。<br />
              完全に削除するにはゴミ箱から削除してください。
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                style={{
                  padding: "9px 18px", backgroundColor: WHITE, color: MUTED,
                  border: `1px solid ${BORDER}`, borderRadius: "8px",
                  cursor: "pointer", fontSize: "14px",
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleting}
                style={{
                  padding: "9px 18px", backgroundColor: "#dc2626", color: WHITE,
                  border: "none", borderRadius: "8px",
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontSize: "14px", fontWeight: "600",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "移動中..." : "ゴミ箱に移動"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ゴミ箱セクション */}
      {showTrash && (
        <div style={{ marginTop: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#dc2626", margin: 0 }}>🗑️ ゴミ箱</h2>
            {trashTournaments.length > 0 && (
              <span style={{ fontSize: "13px", color: MUTED }}>{trashTournaments.length}件</span>
            )}
          </div>
          {trashLoading ? (
            <p style={{ color: MUTED, fontSize: "14px" }}>読み込み中...</p>
          ) : trashTournaments.length === 0 ? (
            <p style={{ color: MUTED, fontSize: "14px" }}>ゴミ箱は空です</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {trashTournaments.map((t) => (
                <div key={t.id} style={{
                  ...CARD,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 20px", opacity: 0.85, borderColor: "#fecaca",
                }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: TEXT }}>{t.name}</div>
                    {t.deleted_at && (
                      <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>
                        {new Date(t.deleted_at).toLocaleString("ja-JP")} に移動
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleRestore(t.id)}
                      disabled={restoring === t.id}
                      style={{
                        padding: "7px 16px", backgroundColor: WHITE, color: NAV,
                        border: `1px solid ${NAV}`, borderRadius: "6px",
                        cursor: restoring === t.id ? "not-allowed" : "pointer",
                        fontSize: "13px", fontWeight: "600",
                        opacity: restoring === t.id ? 0.6 : 1,
                      }}
                    >
                      {restoring === t.id ? "復元中..." : "元に戻す"}
                    </button>
                    <button
                      onClick={() => setPermanentDeleteId(t.id)}
                      style={{
                        padding: "7px 16px", backgroundColor: "#fef2f2", color: "#dc2626",
                        border: "1px solid #fecaca", borderRadius: "6px",
                        cursor: "pointer", fontSize: "13px", fontWeight: "600",
                      }}
                    >
                      完全に削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 完全削除確認モーダル */}
      {permanentDeleteId !== null && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: WHITE, borderRadius: "12px", padding: "28px 32px",
            maxWidth: "400px", width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: TEXT, marginBottom: "10px" }}>
              完全に削除しますか？
            </div>
            <div style={{ fontSize: "14px", color: "#dc2626", marginBottom: "8px", fontWeight: "600" }}>
              この操作は取り消せません。
            </div>
            <div style={{ fontSize: "13px", color: MUTED, marginBottom: "24px" }}>
              大会に紐づくすべてのレース・成績・艇データが完全に削除されます。
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setPermanentDeleteId(null)}
                disabled={permanentDeleting}
                style={{
                  padding: "9px 18px", backgroundColor: WHITE, color: MUTED,
                  border: `1px solid ${BORDER}`, borderRadius: "8px",
                  cursor: "pointer", fontSize: "14px",
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => handlePermanentDelete(permanentDeleteId)}
                disabled={permanentDeleting}
                style={{
                  padding: "9px 18px", backgroundColor: "#dc2626", color: WHITE,
                  border: "none", borderRadius: "8px",
                  cursor: permanentDeleting ? "not-allowed" : "pointer",
                  fontSize: "14px", fontWeight: "600",
                  opacity: permanentDeleting ? 0.7 : 1,
                }}
              >
                {permanentDeleting ? "削除中..." : "完全に削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
