"use client";
import { T } from "@/lib/theme";

import { useEffect, useState } from "react";
import { apiFetch, API_BASE } from "@/lib/api";
import TournamentNav from "../components/TournamentNav";

type User = {
  id: string;
  email: string;
  role: string;
  live_reporter: boolean;
};

type Tournament = {
  id: number;
  name: string;
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
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

export default function AdminPage() {
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 招待フォーム
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteTournamentIds, setInviteTournamentIds] = useState<number[]>([]);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);

  async function fetchAll() {
    try {
      setLoading(true);
      setError("");

      const [meRes, usersRes, tournamentsRes] = await Promise.all([
        apiFetch("/auth/me"),
        apiFetch("/admin/users"),
        fetch(`${API_BASE}/tournaments`),
      ]);

      if (!meRes.ok) {
        setError("認証エラーです。ログインし直してください。");
        return;
      }

      const meData: User = await meRes.json();
      setMe(meData);

      if (meData.role !== "admin") {
        setError("このページは管理者のみアクセスできます。");
        return;
      }

      if (usersRes.ok) setUsers(await usersRes.json());
      if (tournamentsRes.ok) setTournaments(await tournamentsRes.json());
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(""); setInviteMessage(""); setInviting(true);

    try {
      const res = await apiFetch("/admin/invite", {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          tournament_ids: inviteRole === "member" ? inviteTournamentIds : [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setInviteError(data.detail ?? "招待に失敗しました");
        return;
      }

      setInviteMessage(`${inviteEmail} に招待メールを送信しました`);
      setInviteEmail(""); setInviteTournamentIds([]);
      await fetchAll();
    } finally {
      setInviting(false);
    }
  }

  function toggleTournament(id: number) {
    setInviteTournamentIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  if (loading) {
    return (
      <main style={{ padding: "32px 24px" }}>
        <p style={{ color: MUTED }}>読み込み中...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: "32px 24px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ ...CARD, color: "#fca5a5", textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔒</div>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto" }}>

      <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, marginBottom: "28px" }}>
        管理者ページ
      </h1>

      {/* 招待フォーム */}
      <div style={{ ...CARD, marginBottom: "28px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "700", color: TEXT, marginTop: 0, marginBottom: "20px" }}>
          ユーザーを招待
        </h2>
        <form onSubmit={handleInvite}>
          <div className="grid-2" style={{ gap: "14px", marginBottom: "16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "6px" }}>
                メールアドレス *
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="example@mail.com"
                required
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "6px" }}>
                権限
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                style={INPUT_STYLE}
              >
                <option value="member">member（担当大会のみ）</option>
                <option value="admin">admin（全大会管理）</option>
              </select>
            </div>
          </div>

          {inviteRole === "member" && tournaments.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "8px" }}>
                担当大会（複数選択可）
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {tournaments.map((t) => (
                  <label
                    key={t.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      cursor: "pointer", fontSize: "14px",
                      padding: "6px 12px",
                      border: `1px solid ${inviteTournamentIds.includes(t.id) ? NAV : BORDER}`,
                      borderRadius: "8px",
                      backgroundColor: inviteTournamentIds.includes(t.id) ? T.surface2 : WHITE,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={inviteTournamentIds.includes(t.id)}
                      onChange={() => toggleTournament(t.id)}
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {inviteError   && <p style={{ color: "#fca5a5", fontSize: "13px", marginBottom: "12px" }}>{inviteError}</p>}
          {inviteMessage && <p style={{ color: "#5eead4", fontSize: "13px", marginBottom: "12px" }}>{inviteMessage}</p>}

          <button
            type="submit"
            disabled={inviting}
            style={{
              padding: "10px 28px", backgroundColor: NAV, color: WHITE,
              border: "none", borderRadius: "8px", cursor: "pointer",
              fontWeight: "700", fontSize: "14px", opacity: inviting ? 0.7 : 1,
            }}
          >
            {inviting ? "送信中..." : "招待メールを送信"}
          </button>
        </form>
      </div>

      {/* ユーザー一覧 */}
      <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: TEXT, margin: 0 }}>
            ユーザー一覧
            <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: "400", color: MUTED }}>
              {users.length} 名
            </span>
          </h2>
        </div>
        {users.length === 0 ? (
          <p style={{ padding: "32px 24px", color: MUTED, margin: 0 }}>ユーザーがいません</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: NAV, color: WHITE }}>
                {["メールアドレス", "権限", "操作", "速報担当", "ユーザーID"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? T.surface : T.surface2 }}>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${BORDER}` }}>
                    {u.email}
                    {u.id === me?.id && (
                      <span style={{ marginLeft: "8px", fontSize: "11px", color: NAV, fontWeight: "600" }}>（あなた）</span>
                    )}
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: "999px",
                      fontSize: "11px", fontWeight: "600",
                      backgroundColor: u.role === "admin" ? T.surface2 : "rgba(34,197,94,0.15)",
                      color: u.role === "admin" ? NAV : "#0e6657",
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${BORDER}` }}>
                    {u.id !== me?.id && (
                      <button
                        onClick={async () => {
                          const res = await apiFetch(`/admin/users/${u.id}/role`, { method: "PUT" });
                          if (res.ok) await fetchAll();
                        }}
                        style={{
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: "600",
                          border: `1px solid ${BORDER}`,
                          borderRadius: "6px",
                          cursor: "pointer",
                          backgroundColor: T.surface,
                          color: u.role === "admin" ? "#dc2626" : NAV,
                        }}
                      >
                        {u.role === "admin" ? "member に変更" : "admin に昇格"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${BORDER}` }}>
                    <button
                      onClick={async () => {
                        const res = await apiFetch(`/admin/users/${u.id}/live-reporter`, { method: "PUT" });
                        if (res.ok) await fetchAll();
                      }}
                      title="速報タブの表示と速報入力を許可します"
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontWeight: "600",
                        border: `1px solid ${u.live_reporter ? NAV : BORDER}`,
                        borderRadius: "6px",
                        cursor: "pointer",
                        backgroundColor: u.live_reporter ? "rgba(249,115,22,0.15)" : T.surface,
                        color: u.live_reporter ? NAV : MUTED,
                      }}
                    >
                      {u.live_reporter ? "✓ 速報担当" : "OFF"}
                    </button>
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${BORDER}`, color: MUTED, fontSize: "12px", fontFamily: "monospace" }}>
                    {u.id.slice(0, 8)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </main>
  );
}
