"use client";

import { apiFetch } from "@/lib/api";

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
  nsc_rule: string;
  dne_rule: string;
  custom_result_codes?: string | null;
  team_cut_method?: string;
  overall_tie_method?: string;
  tie_fallback_extended?: boolean;
  tie_use_excluded_scores?: boolean;
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
  const [eventTemplate, setEventTemplate] = useState("");
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
    nsc_rule: "STARTERS_PLUS_1",
    dne_rule: "STARTERS_PLUS_1",
    team_cut_method: "individual",
    overall_tie_method: "kanto",
    tie_fallback_extended: true,
    tie_use_excluded_scores: true,
  });
  const [customCodes, setCustomCodes] = useState<string[]>([]);
  const [newCodeInput, setNewCodeInput] = useState("");
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
        apiFetch(`/tournaments/${tournamentId}`),
        apiFetch(`/tournaments/${tournamentId}/rules`),
      ]);
      if (tRes.ok) {
        const t = await tRes.json();
        setTournamentName(t.name);
        setEventTemplate(t.event_template ?? "");
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
        nsc_rule: data.nsc_rule ?? "STARTERS_PLUS_1",
        dne_rule: data.dne_rule ?? "STARTERS_PLUS_1",
        team_cut_method: data.team_cut_method ?? "individual",
        overall_tie_method: data.overall_tie_method ?? "kanto",
        tie_fallback_extended: data.tie_fallback_extended ?? true,
        tie_use_excluded_scores: data.tie_use_excluded_scores ?? true,
      });
      setCustomCodes(
        data.custom_result_codes
          ? data.custom_result_codes.split(",").map((s) => s.trim()).filter(Boolean)
          : []
      );
    }
    if (tournamentId) load();
  }, [tournamentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(""); setError(""); setSaving(true);
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}/rules`, {
        method: "PUT",
        body: JSON.stringify({
          scheduled_races: Number(form.scheduled_races),
          minimum_races_for_series: Number(form.minimum_races_for_series),
          discard_enabled: form.discard_enabled,
          discard_start_race_count: form.discard_start_race_count ? Number(form.discard_start_race_count) : null,
          discard_count: form.discard_count ? Number(form.discard_count) : null,
          dnc_rule: form.dnc_rule, dns_rule: form.dns_rule, ocs_rule: form.ocs_rule,
          dnf_rule: form.dnf_rule, ret_rule: form.ret_rule, dsq_rule: form.dsq_rule,
          ufd_rule: form.ufd_rule, bfd_rule: form.bfd_rule,
          nsc_rule: form.nsc_rule, dne_rule: form.dne_rule,
          custom_result_codes: customCodes.length > 0 ? customCodes.join(",") : null,
          team_cut_method: form.team_cut_method,
          overall_tie_method: form.overall_tie_method,
          tie_fallback_extended: form.tie_fallback_extended,
          tie_use_excluded_scores: form.tie_use_excluded_scores,
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

  function addCustomCode() {
    const code = newCodeInput.trim().toUpperCase();
    if (!code) return;
    if (customCodes.includes(code)) return;
    setCustomCodes((prev) => [...prev, code]);
    setNewCodeInput("");
  }

  function removeCustomCode(code: string) {
    setCustomCodes((prev) => prev.filter((c) => c !== code));
  }

  const ruleFields: { key: keyof typeof form; label: string; hint?: string }[] = [
    { key: "dnc_rule", label: "DNC", hint: "棄権・不参加" },
    { key: "dns_rule", label: "DNS", hint: "スタート不成立" },
    { key: "ocs_rule", label: "OCS", hint: "スタート早期（フライング）" },
    { key: "dnf_rule", label: "DNF", hint: "完走せず" },
    { key: "ret_rule", label: "RET", hint: "リタイア" },
    { key: "dsq_rule", label: "DSQ", hint: "失格" },
    { key: "ufd_rule", label: "UFD", hint: "旗規則違反（U旗）" },
    { key: "bfd_rule", label: "BFD", hint: "旗規則違反（ブラックフラッグ）" },
    { key: "nsc_rule", label: "NSC", hint: "コース未完走（スタートはした）" },
    { key: "dne_rule", label: "DNE", hint: "シリーズから除外できない失格" },
  ];

  // Fixed-rule codes (not configurable via ENTRIES/STARTERS)
  const fixedRuleCodes = [
    { code: "STP", rule: "着順得点 × 120%", hint: "Scoring Time Penalty" },
    { code: "SCP", rule: "着順得点 × 120%", hint: "Scoring Penalty (20%)" },
    { code: "ZFP", rule: "着順得点 × 120%", hint: "Zero Flag Penalty (20%)" },
    { code: "ARB", rule: "着順得点 × 120%", hint: "Arbitration Penalty (20%)" },
    { code: "PRP", rule: "着順得点を使用", hint: "Protest Required Penalty" },
    { code: "RDG", rule: "手動入力", hint: "Redress (裁定得点)" },
    { code: "DPI", rule: "手動入力", hint: "Discretionary Penalty (手動)" },
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

          {/* 失格得点ルール（設定可能コード） */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "4px" }}>
              失格・非完走得点ルール
            </h2>
            <p style={{ fontSize: "12px", color: MUTED, marginBottom: "18px", marginTop: 0 }}>
              STARTERS_PLUS_1: スタート艇数＋1　／　ENTRIES_PLUS_1: エントリー艇数＋1
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {ruleFields.map(({ key, label, hint }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "2px" }}>
                    {label}
                  </label>
                  {hint && <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 4px" }}>{hint}</p>}
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

          {/* 固定ルールコード（参照用） */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "18px" }}>
              特殊コード（RRSによる固定ルール）
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {fixedRuleCodes.map(({ code, rule, hint }) => (
                <div key={code} style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "700", fontSize: "13px", color: NAV }}>{code}</span>
                    <span style={{ fontSize: "11px", backgroundColor: "#e2e8f0", color: MUTED, padding: "2px 6px", borderRadius: "4px" }}>固定</span>
                  </div>
                  <p style={{ fontSize: "11px", color: MUTED, margin: "4px 0 0" }}>{hint}</p>
                  <p style={{ fontSize: "11px", color: TEXT, margin: "2px 0 0", fontWeight: "600" }}>{rule}</p>
                </div>
              ))}
            </div>
          </div>

          {/* カット方式（団体戦のみ） */}
          {(eventTemplate === "TEAM_3_BOATS" || eventTemplate === "TEAM_4_BOATS") && (
            <div style={{ ...CARD, marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
                カット方式（団体戦）
              </h2>
              <p style={{ fontSize: "12px", color: MUTED, marginBottom: "16px", marginTop: 0 }}>
                カットするレースの選び方を指定します。
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="team_cut_method"
                    value="individual"
                    checked={form.team_cut_method === "individual"}
                    onChange={() => updateField("team_cut_method", "individual")}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>方式B（個人単位カット）</div>
                    <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>各艇が独立してワーストレースをカット。艇ごとに異なるレースがカットされる場合あり。</div>
                  </div>
                </label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="team_cut_method"
                    value="team"
                    checked={form.team_cut_method === "team"}
                    onChange={() => updateField("team_cut_method", "team")}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>方式A（大学単位カット）</div>
                    <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>チーム合計点がワーストのレースを全艇共通でカット。チーム全体で同じレースが除外される。</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* タイ処理設定（団体戦のみ） */}
          {(eventTemplate === "TEAM_3_BOATS" || eventTemplate === "TEAM_4_BOATS") && (
            <div style={{ ...CARD, marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "18px" }}>
                タイ処理設定（団体戦）
              </h2>

              {/* 総合タイの処理方法 */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: TEXT, marginBottom: "10px" }}>総合タイの処理方法</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="overall_tie_method"
                      value="kanto"
                      checked={form.overall_tie_method === "kanto"}
                      onChange={() => updateField("overall_tie_method", "kanto")}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>関東学連方式</div>
                      <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>両クラスの全レース得点を混ぜて良い順に並べて比較し、それでも解けない場合は最終レースの合計点で決定する。</div>
                    </div>
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="overall_tie_method"
                      value="zennihon"
                      checked={form.overall_tie_method === "zennihon"}
                      onChange={() => updateField("overall_tie_method", "zennihon")}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>全日本学連方式</div>
                      <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>総合得点が同点の場合は同順位とし、次の順位を欠位とする（タイを解かない）。</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* フォールバック拡張（関東学連のみ） */}
              {form.overall_tie_method === "kanto" && (
                <div style={{ marginBottom: "20px", paddingLeft: "16px", borderLeft: `3px solid ${BORDER}` }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: TEXT, marginBottom: "10px" }}>フォールバック拡張</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="tie_fallback_extended"
                        value="true"
                        checked={form.tie_fallback_extended === true}
                        onChange={() => updateField("tie_fallback_extended", true)}
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>2025年以降の新規定</div>
                        <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>最終レース合計でもタイが残る場合、最後から1つ前のレースへ遡って比較を繰り返す。タイが完全に解けるまで続ける。</div>
                      </div>
                    </label>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="tie_fallback_extended"
                        value="false"
                        checked={form.tie_fallback_extended === false}
                        onChange={() => updateField("tie_fallback_extended", false)}
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>2024年以前の旧規定</div>
                        <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>最終レースの合計点で比較して終了。それでもタイの場合は同順位とする。</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* 除外得点の扱い（関東学連のみ） */}
              {form.overall_tie_method === "kanto" && (
                <div style={{ paddingLeft: "16px", borderLeft: `3px solid ${BORDER}` }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: TEXT, marginBottom: "10px" }}>タイ解消時の除外得点の扱い</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="tie_use_excluded_scores"
                        value="true"
                        checked={form.tie_use_excluded_scores === true}
                        onChange={() => updateField("tie_use_excluded_scores", true)}
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>除外得点も使用する（2025年関東学連準拠）</div>
                        <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>カットされたレースの得点も、タイを解消する際の比較対象として使用する。</div>
                      </div>
                    </label>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="tie_use_excluded_scores"
                        value="false"
                        checked={form.tie_use_excluded_scores === false}
                        onChange={() => updateField("tie_use_excluded_scores", false)}
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>除外得点は使用しない</div>
                        <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>カットされたレースの得点はタイ解消時も使用しない。</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* カスタムコード */}
          <div style={{ ...CARD, marginBottom: "24px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
              大会独自コード（その他）
            </h2>
            <p style={{ fontSize: "12px", color: MUTED, marginBottom: "16px", marginTop: 0 }}>
              この大会専用の結果コードを追加できます。追加したコードは着順入力画面でも使用可能になります。
            </p>

            {/* Existing custom codes */}
            {customCodes.length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                {customCodes.map((code) => (
                  <div key={code} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", backgroundColor: "#eef2f7", borderRadius: "20px", fontSize: "13px", fontWeight: "600", color: NAV }}>
                    {code}
                    <button
                      type="button"
                      onClick={() => removeCustomCode(code)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "14px", padding: "0 0 0 2px", lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new code */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                value={newCodeInput}
                onChange={(e) => setNewCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomCode(); }}}
                placeholder="例: CUSTOM1"
                maxLength={10}
                style={{ ...INPUT_STYLE, width: "160px" }}
              />
              <button
                type="button"
                onClick={addCustomCode}
                style={{
                  padding: "10px 16px", backgroundColor: "#f1f5f9", color: TEXT,
                  border: `1px solid ${BORDER}`, borderRadius: "8px",
                  cursor: "pointer", fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap",
                }}
              >
                + 追加
              </button>
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
