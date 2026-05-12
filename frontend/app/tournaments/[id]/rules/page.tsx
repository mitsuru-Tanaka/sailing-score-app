"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TournamentNav from "../../../components/TournamentNav";

type RuleConfig = {
  id: number;
  tournament_id: number;
  scheduled_races: number;
  minimum_races_for_series: number;
  discard_enabled: number;
  discard_start_race_count?: number | null;
  discard_count?: number | null;
  dnc_rule: string;
  dns_rule: string;
  ocs_rule: string;
  dnf_rule: string;
  ret_rule: string;
  dsq_rule: string;
  ufd_rule: string;
  bfd_rule: string;
};

const ruleOptions = ["STARTERS_PLUS_1", "ENTRIES_PLUS_1"];

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

function suggestDiscard(scheduledRaces: number): { count: number; startAt: number } {
  if (scheduledRaces >= 10) return { count: 2, startAt: 10 };
  if (scheduledRaces >= 4)  return { count: 1, startAt: 4 };
  return { count: 0, startAt: 0 };
}

export default function RulesPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournamentName, setTournamentName] = useState("");
  const [form, setForm] = useState({
    scheduled_races: 1,
    minimum_races_for_series: 1,
    discard_enabled: false,
    discard_start_race_count: "",
    discard_count: "",
    dnc_rule: "ENTRIES_PLUS_1",
    dns_rule: "ENTRIES_PLUS_1",
    ocs_rule: "STARTERS_PLUS_1",
    dnf_rule: "STARTERS_PLUS_1",
    ret_rule: "STARTERS_PLUS_1",
    dsq_rule: "STARTERS_PLUS_1",
    ufd_rule: "ENTRIES_PLUS_1",
    bfd_rule: "ENTRIES_PLUS_1",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function applyDiscardSuggestion() {
    const { count, startAt } = suggestDiscard(Number(form.scheduled_races));
    setForm((prev) => ({
      ...prev,
      discard_enabled: count > 0,
      discard_count: count > 0 ? String(count) : "",
      discard_start_race_count: count > 0 ? String(startAt) : "",
    }));
  }

  useEffect(() => {
    async function load() {
      const [tRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/tournaments/${tournamentId}`),
        fetch(`${API_BASE}/tournaments/${tournamentId}/rules`),
      ]);
      if (tRes.ok) {
        const t = await tRes.json();
        setTournamentName(t.name);
      }
      if (!rRes.ok) { setError("ルール取得に失敗しました"); return; }
      const data: RuleConfig = await rRes.json();
      setForm({
        scheduled_races: data.scheduled_races,
        minimum_races_for_series: data.minimum_races_for_series,
        discard_enabled: data.discard_enabled === 1,
        discard_start_race_count: data.discard_start_race_count?.toString() ?? "",
        discard_count: data.discard_count?.toString() ?? "",
        dnc_rule: data.dnc_rule,
        dns_rule: data.dns_rule,
        ocs_rule: data.ocs_rule,
        dnf_rule: data.dnf_rule,
        ret_rule: data.ret_rule,
        dsq_rule: data.dsq_rule,
        ufd_rule: data.ufd_rule,
        bfd_rule: data.bfd_rule,
      });
    }
    if (tournamentId) load();
  }, [tournamentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(""); setError(""); setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_races: Number(form.scheduled_races),
          minimum_races_for_series: Number(form.minimum_races_for_series),
          discard_enabled: form.discard_enabled,
          discard_start_race_count: form.discard_start_race_count ? Number(form.discard_start_race_count) : null,
          discard_count: form.discard_count ? Number(form.discard_count) : null,
          dnc_rule: form.dnc_rule, dns_rule: form.dns_rule, ocs_rule: form.ocs_rule,
          dnf_rule: form.dnf_rule, ret_rule: form.ret_rule, dsq_rule: form.dsq_rule,
          ufd_rule: form.ufd_rule, bfd_rule: form.bfd_rule,
        }),
      });
      if (!res.ok) { setError("ルール保存に失敗しました"); return; }
      setMessage("ルールを保存しました");
    } finally {
      setSaving(false);
    }
  }

  function updateField(name: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const ruleFields: { key: keyof typeof form; label: string }[] = [
    { key: "dnc_rule", label: "DNC（棄権・不参加）" },
    { key: "dns_rule", label: "DNS（スタート不成立）" },
    { key: "ocs_rule", label: "OCS（スタート早期）" },
    { key: "dnf_rule", label: "DNF（完走せず）" },
    { key: "ret_rule", label: "RET（リタイア）" },
    { key: "dsq_rule", label: "DSQ（失格）" },
    { key: "ufd_rule", label: "UFD" },
    { key: "bfd_rule", label: "BFD" },
  ];

  return (
    <>
      <TournamentNav id={tournamentId} name={tournamentName} />
      <main style={{ padding: "32px 24px", maxWidth: "800px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, margin: 0 }}>ルール設定</h1>
        </div>

        <form onSubmit={handleSubmit}>

          {/* 基本設定 */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "18px" }}>
              基本設定
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "6px" }}>予定レース数</label>
                <input
                  type="number"
                  value={form.scheduled_races}
                  onChange={(e) => updateField("scheduled_races", Number(e.target.value))}
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "6px" }}>シリーズ成立最小レース数</label>
                <input
                  type="number"
                  value={form.minimum_races_for_series}
                  onChange={(e) => updateField("minimum_races_for_series", Number(e.target.value))}
                  style={INPUT_STYLE}
                />
              </div>
            </div>
          </div>

          {/* カット設定 */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "18px" }}>
              カット設定
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: TEXT }}>
                <input
                  type="checkbox"
                  checked={form.discard_enabled}
                  onChange={(e) => updateField("discard_enabled", e.target.checked)}
                />
                カットあり
              </label>
              <button
                type="button"
                onClick={applyDiscardSuggestion}
                style={{
                  padding: "7px 14px",
                  border: `1px solid #4472a8`,
                  borderRadius: "7px",
                  backgroundColor: "#eef2f7",
                  color: NAV,
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                RRS推奨値を適用（予定{form.scheduled_races}R → {suggestDiscard(Number(form.scheduled_races)).count}カット）
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "6px" }}>カット開始レース数</label>
                <input
                  type="number"
                  value={form.discard_start_race_count}
                  onChange={(e) => updateField("discard_start_race_count", e.target.value)}
                  disabled={!form.discard_enabled}
                  style={{ ...INPUT_STYLE, opacity: form.discard_enabled ? 1 : 0.5 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "6px" }}>カット数</label>
                <input
                  type="number"
                  value={form.discard_count}
                  onChange={(e) => updateField("discard_count", e.target.value)}
                  disabled={!form.discard_enabled}
                  style={{ ...INPUT_STYLE, opacity: form.discard_enabled ? 1 : 0.5 }}
                />
              </div>
            </div>
          </div>

          {/* 失格得点ルール */}
          <div style={{ ...CARD, marginBottom: "24px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "18px" }}>
              失格・非完走得点ルール
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {ruleFields.map(({ key, label }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "6px" }}>{label}</label>
                  <select
                    value={form[key] as string}
                    onChange={(e) => updateField(key, e.target.value)}
                    style={INPUT_STYLE}
                  >
                    {ruleOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {error   && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "16px" }}>{error}</p>}
          {message && <p style={{ color: "#0e6657", fontSize: "13px", marginBottom: "16px" }}>{message}</p>}

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "11px 32px", backgroundColor: NAV, color: WHITE,
              border: "none", borderRadius: "8px", cursor: "pointer",
              fontWeight: "700", fontSize: "15px", opacity: saving ? 0.7 : 1,
              boxShadow: "0 2px 6px rgba(31,78,120,0.2)",
            }}
          >
            {saving ? "保存中..." : "設定を保存"}
          </button>
        </form>

      </main>
    </>
  );
}
