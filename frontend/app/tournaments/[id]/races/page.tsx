"use client";

import { apiFetch, API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TournamentNav from "../../../components/TournamentNav";

type Race = {
  id: number;
  tournament_id: number;
  race_number: number;
  name?: string | null;
  status: string;
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

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    DRAFT:     { bg: "#f1f5f9", color: "#475569", label: "下書き" },
    FINISHED:  { bg: "#f0fdf9", color: "#0e6657", label: "完了" },
    CANCELLED: { bg: "#fef2f2", color: "#991b1b", label: "中止" },
  };
  const s = map[status] ?? { bg: "#f1f5f9", color: "#475569", label: status };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: "999px",
      fontSize: "11px", fontWeight: "600", backgroundColor: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

export default function RacesPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournamentName, setTournamentName] = useState("");
  const [races, setRaces] = useState<Race[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [raceNumber, setRaceNumber] = useState("");
  const [raceName, setRaceName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchTournament() {
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}`);
    if (res.ok) {
      const data = await res.json();
      setTournamentName(data.name);
    }
  }

  async function fetchRaces() {
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/races`);
    if (!res.ok) { setError("レース一覧の取得に失敗しました"); return; }
    setRaces(await res.json());
  }

  useEffect(() => {
    if (tournamentId) {
      fetchTournament();
      fetchRaces();
    }
  }, [tournamentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!raceNumber) { setError("レース番号は必須です"); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}/races`, {
        method: "POST",
        body: JSON.stringify({ race_number: Number(raceNumber), name: raceName || null, status: "DRAFT" }),
      });
      if (!res.ok) { setError("レース追加に失敗しました"); return; }
      setRaceNumber(""); setRaceName(""); setShowForm(false);
      await fetchRaces();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TournamentNav id={tournamentId} name={tournamentName} />
      <main style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, margin: 0 }}>レース管理</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: "9px 18px",
              backgroundColor: showForm ? MUTED : NAV,
              color: WHITE, border: "none", borderRadius: "8px",
              cursor: "pointer", fontSize: "14px", fontWeight: "600",
            }}
          >
            {showForm ? "✕ 閉じる" : "+ レースを追加"}
          </button>
        </div>

        {showForm && (
          <div style={{ ...CARD, marginBottom: "28px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", marginTop: 0, marginBottom: "20px", color: TEXT }}>新規レース追加</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>レース番号 *</label>
                  <input
                    type="number"
                    value={raceNumber}
                    onChange={e => setRaceNumber(e.target.value)}
                    placeholder="例: 1"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>レース名（任意）</label>
                  <input
                    type="text"
                    value={raceName}
                    onChange={e => setRaceName(e.target.value)}
                    placeholder="例: 第1レース"
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              {error && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" disabled={submitting} style={{
                  padding: "10px 24px", backgroundColor: NAV, color: WHITE,
                  border: "none", borderRadius: "8px", cursor: "pointer",
                  fontWeight: "600", fontSize: "14px", opacity: submitting ? 0.7 : 1,
                }}>
                  {submitting ? "追加中..." : "レースを追加"}
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

        {races.length === 0 ? (
          <div style={{ ...CARD, textAlign: "center", padding: "48px", color: MUTED }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏁</div>
            <p style={{ margin: 0 }}>レースが登録されていません。「レースを追加」から追加してください。</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {races.map((race) => (
              <div
                key={race.id}
                style={{
                  ...CARD,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "16px 20px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "8px",
                    backgroundColor: "#eef2f7", color: NAV,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: "700", fontSize: "16px", flexShrink: 0,
                  }}>
                    {race.race_number}
                  </div>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "15px", color: TEXT }}>
                      {race.name || `第${race.race_number}レース`}
                    </div>
                    <div style={{ marginTop: "4px" }}>
                      {statusBadge(race.status)}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/tournaments/${tournamentId}/races/${race.id}`}
                  style={{
                    display: "inline-block", padding: "7px 16px",
                    backgroundColor: NAV, color: WHITE,
                    borderRadius: "6px", textDecoration: "none",
                    fontSize: "13px", fontWeight: "600",
                    whiteSpace: "nowrap",
                  }}
                >
                  結果入力 →
                </Link>
              </div>
            ))}
          </div>
        )}

      </main>
    </>
  );
}
