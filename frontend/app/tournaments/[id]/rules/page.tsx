"use client";

import { T } from "@/lib/theme";
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
  dne_score_method?: string;
  sp_method?: string;
  use_appendix_t?: boolean;
  same_school_rule?: boolean;
  min_races_to_complete?: number;
  fleet_split?: boolean;
  fleet_split_method?: string;
  preset_template?: string;
  stp_penalty_points?: number;
  scp_multiplier?: number;
  arb_multiplier?: number;
  prp_multiplier?: number;
  zfp_multiplier?: number;
};

type PresetKey = "kanto_team" | "kanto_individual" | "zennihon_team" | "zennihon_individual" | "kanto_women" | "custom";

type PresetValues = {
  dnc_rule: string; dns_rule: string; ocs_rule: string; dnf_rule: string;
  ret_rule: string; dsq_rule: string; ufd_rule: string; bfd_rule: string;
  nsc_rule: string; dne_rule: string;
  team_cut_method: string; overall_tie_method: string;
  tie_fallback_extended: boolean; tie_use_excluded_scores: boolean;
  dne_score_method: string; sp_method: string; use_appendix_t: boolean;
  same_school_rule: boolean; fleet_split: boolean; fleet_split_method: string;
};

const STANDARD: PresetValues = {
  dnc_rule: "ENTRIES_PLUS_1", dns_rule: "ENTRIES_PLUS_1", ocs_rule: "STARTERS_PLUS_1",
  dnf_rule: "STARTERS_PLUS_1", ret_rule: "STARTERS_PLUS_1", dsq_rule: "STARTERS_PLUS_1",
  ufd_rule: "ENTRIES_PLUS_1", bfd_rule: "ENTRIES_PLUS_1",
  nsc_rule: "STARTERS_PLUS_1", dne_rule: "STARTERS_PLUS_1",
  dne_score_method: "plus_one", sp_method: "dsq", use_appendix_t: true,
  same_school_rule: false, fleet_split: false, fleet_split_method: "own",
  team_cut_method: "individual", overall_tie_method: "kanto",
  tie_fallback_extended: true, tie_use_excluded_scores: true,
};

const PRESETS: Record<Exclude<PresetKey, "custom">, { label: string; description: string; values: PresetValues }> = {
  kanto_team: {
    label: "関東学連 団体",
    description: "関東学連団体戦標準ルール（2025年度）",
    values: { ...STANDARD },
  },
  kanto_individual: {
    label: "関東学連 個人",
    description: "関東学連個人戦標準ルール",
    values: { ...STANDARD },
  },
  zennihon_team: {
    label: "全日本学連 団体",
    description: "全日本学連団体戦（付則T無効・大学単位カット）",
    values: {
      ...STANDARD,
      team_cut_method: "team",
      overall_tie_method: "zennihon",
      tie_fallback_extended: false,
      tie_use_excluded_scores: false,
      use_appendix_t: false,
    },
  },
  zennihon_individual: {
    label: "全日本学連 個人",
    description: "全日本学連個人戦（付則T無効）",
    values: {
      ...STANDARD,
      overall_tie_method: "zennihon",
      tie_fallback_extended: false,
      tie_use_excluded_scores: false,
      use_appendix_t: false,
    },
  },
  kanto_women: {
    label: "関東女子学連",
    description: "関東女子学連（STP着順+1・同校艇特則）",
    values: { ...STANDARD, sp_method: "add_one", same_school_rule: true },
  },
};

const ruleOptions = ["STARTERS_PLUS_1", "ENTRIES_PLUS_1"];

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
};
const CARD: React.CSSProperties = {
  backgroundColor: T.surface,
  border: `1px solid ${BORDER}`,
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
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
    dne_score_method: "plus_one",
    sp_method: "dsq",
    use_appendix_t: true,
    same_school_rule: false,
    min_races_to_complete: 1,
    fleet_split: false,
    fleet_split_method: "own",
    preset_template: "custom",
    stp_penalty_points: 3,
    scp_multiplier: 1.3,
    arb_multiplier: 1.3,
    prp_multiplier: 1.3,
    zfp_multiplier: 1.2,
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

  function applyPreset(key: PresetKey) {
    if (key === "custom") {
      setForm((prev) => ({ ...prev, preset_template: "custom" }));
      return;
    }
    setForm((prev) => ({ ...prev, ...PRESETS[key].values, preset_template: key }));
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
        dne_score_method: data.dne_score_method ?? "plus_one",
        sp_method: data.sp_method ?? "dsq",
        use_appendix_t: data.use_appendix_t ?? true,
        same_school_rule: data.same_school_rule ?? false,
        min_races_to_complete: data.min_races_to_complete ?? 1,
        fleet_split: data.fleet_split ?? false,
        fleet_split_method: data.fleet_split_method ?? "own",
        preset_template: data.preset_template ?? "custom",
        stp_penalty_points: data.stp_penalty_points ?? 3,
        scp_multiplier: data.scp_multiplier ?? 1.3,
        arb_multiplier: data.arb_multiplier ?? 1.3,
        prp_multiplier: data.prp_multiplier ?? 1.3,
        zfp_multiplier: data.zfp_multiplier ?? 1.2,
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
          dne_score_method: form.dne_score_method,
          sp_method: form.sp_method,
          use_appendix_t: form.use_appendix_t,
          same_school_rule: form.same_school_rule,
          min_races_to_complete: Number(form.min_races_to_complete),
          fleet_split: form.fleet_split,
          fleet_split_method: form.fleet_split_method,
          preset_template: form.preset_template,
          stp_penalty_points: Number(form.stp_penalty_points),
          scp_multiplier: Number(form.scp_multiplier),
          arb_multiplier: Number(form.arb_multiplier),
          prp_multiplier: Number(form.prp_multiplier),
          zfp_multiplier: Number(form.zfp_multiplier),
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

  const isTeamEvent = eventTemplate === "TEAM_3_BOATS" || eventTemplate === "TEAM_4_BOATS";

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
  ];

  const fixedRuleCodes = [
    { code: "SCP", rule: `着順得点 × ${form.scp_multiplier}（切り上げ）`, hint: "Scoring Penalty" },
    { code: "ZFP", rule: `着順得点 × ${form.zfp_multiplier}（切り上げ）`, hint: "Zero Flag Penalty (規則30.2)" },
    { code: "ARB", rule: `着順得点 × ${form.arb_multiplier}（切り上げ）`, hint: "Arbitration Penalty" },
    { code: "RDG", rule: "手動入力", hint: "Redress（裁定得点）" },
    { code: "DPI", rule: "手動入力", hint: "Discretionary Penalty（手動）" },
  ];

  const presetOptions: { key: PresetKey; label: string; description: string }[] = [
    { key: "kanto_team",        label: "関東学連 団体",  description: "関東学連団体戦標準ルール" },
    { key: "kanto_individual",  label: "関東学連 個人",  description: "関東学連個人戦標準ルール" },
    { key: "zennihon_team",     label: "全日本学連 団体", description: "全日本学連団体戦（付則T無効）" },
    { key: "zennihon_individual", label: "全日本学連 個人", description: "全日本学連個人戦（付則T無効）" },
    { key: "kanto_women",       label: "関東女子学連",   description: "関東女子学連（STP着順+1・同校艇特則）" },
    { key: "custom",            label: "カスタム",       description: "全て手動で設定" },
  ];

  return (
    <>
      <TournamentNav id={tournamentId} name={tournamentName} />
      <main style={{ padding: "32px 24px", maxWidth: "800px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, margin: 0 }}>ルール設定</h1>
        </div>

        <form onSubmit={handleSubmit}>

          {/* プリセット */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "16px" }}>
              プリセット
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {presetOptions.map(({ key, label, description }) => {
                const selected = form.preset_template === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    style={{
                      padding: "12px",
                      border: `2px solid ${selected ? NAV : BORDER}`,
                      borderRadius: "10px",
                      backgroundColor: selected ? T.surface2 : WHITE,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: "700", color: selected ? NAV : TEXT, marginBottom: "4px" }}>{label}</div>
                    <div style={{ fontSize: "11px", color: MUTED, lineHeight: "1.4" }}>{description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 基本設定 */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "18px" }}>
              基本設定
            </h2>
            <div className="grid-2" style={{ gap: "14px" }}>
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

          {/* 大会成立条件 */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
              大会成立条件
            </h2>
            <p style={{ fontSize: "12px", color: MUTED, marginBottom: "14px", marginTop: 0 }}>
              大会が成立するために必要な最低完了レース数。
            </p>
            <div style={{ maxWidth: "200px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "6px" }}>最低完了レース数</label>
              <input
                type="number"
                min="1"
                value={form.min_races_to_complete}
                onChange={(e) => updateField("min_races_to_complete", Number(e.target.value))}
                style={INPUT_STYLE}
              />
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
                  backgroundColor: T.surface2,
                  color: NAV,
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                RRS推奨値を適用（予定{form.scheduled_races}R → {suggestDiscard(Number(form.scheduled_races)).count}カット）
              </button>
            </div>
            <div className="grid-2" style={{ gap: "14px" }}>
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

          {/* DNE得点の計算方法 */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
              DNE得点の計算方法
            </h2>
            <p style={{ fontSize: "12px", color: MUTED, marginBottom: "16px", marginTop: 0 }}>
              DNE（シリーズから除外できない失格）の得点算出方式を指定します。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio" name="dne_score_method" value="plus_one"
                  checked={form.dne_score_method === "plus_one"}
                  onChange={() => updateField("dne_score_method", "plus_one")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>エントリー艇数 ＋ 1点（RRS A5.2）</div>
                  <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>RRSデフォルト。エントリー総数＋1点を与える。</div>
                </div>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio" name="dne_score_method" value="plus_five"
                  checked={form.dne_score_method === "plus_five"}
                  onChange={() => updateField("dne_score_method", "plus_five")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>エントリー艇数 ＋ 5点</div>
                  <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>エントリー総数＋5点を与える。</div>
                </div>
              </label>
            </div>
          </div>

          {/* SP（STP）の方式 */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
              SP（STP）の方式
            </h2>
            <p style={{ fontSize: "12px", color: MUTED, marginBottom: "16px", marginTop: 0 }}>
              STP（Scoring Time Penalty）の得点算出方式を指定します。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio" name="sp_method" value="dsq"
                  checked={form.sp_method === "dsq"}
                  onChange={() => updateField("sp_method", "dsq")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>失格と同じ得点（STARTERS / ENTRIES ＋ 1）</div>
                  <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>SPを失格（DSQ）と同等の得点として扱う。RRSデフォルト。</div>
                </div>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio" name="sp_method" value="add_one"
                  checked={form.sp_method === "add_one"}
                  onChange={() => updateField("sp_method", "add_one")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>着順 ＋ 1点</div>
                  <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>実際の着順に1点を加えた得点を与える。関東女子学連で使用。</div>
                </div>
              </label>
            </div>
          </div>

          {/* ペナルティー係数設定 */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
              ペナルティー係数
            </h2>
            <p style={{ fontSize: "12px", color: MUTED, marginBottom: "16px", marginTop: 0 }}>
              各ペナルティコードの得点倍率を設定します。
            </p>
            <div className="grid-2" style={{ gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "2px" }}>STP 加算点数</label>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 4px" }}>「着順＋加算」方式の場合のみ使用</p>
                <input
                  type="number" step="0.5" min="0"
                  value={form.stp_penalty_points}
                  onChange={(e) => updateField("stp_penalty_points", Number(e.target.value))}
                  disabled={form.sp_method !== "add_one"}
                  style={{ ...INPUT_STYLE, opacity: form.sp_method === "add_one" ? 1 : 0.5 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "2px" }}>SCP 乗数</label>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 4px" }}>Scoring Penalty</p>
                <input type="number" step="0.01" min="1" value={form.scp_multiplier} onChange={(e) => updateField("scp_multiplier", Number(e.target.value))} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "2px" }}>ARB 乗数</label>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 4px" }}>Arbitration Penalty</p>
                <input type="number" step="0.01" min="1" value={form.arb_multiplier} onChange={(e) => updateField("arb_multiplier", Number(e.target.value))} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "2px" }}>PRP 乗数</label>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 4px" }}>付則T — 有効の場合のみ使用</p>
                <input
                  type="number" step="0.01" min="1"
                  value={form.prp_multiplier}
                  onChange={(e) => updateField("prp_multiplier", Number(e.target.value))}
                  disabled={!form.use_appendix_t}
                  style={{ ...INPUT_STYLE, opacity: form.use_appendix_t ? 1 : 0.5 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "2px" }}>ZFP 乗数</label>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 4px" }}>Zero Flag Penalty（規則30.2）</p>
                <input type="number" step="0.01" min="1" value={form.zfp_multiplier} onChange={(e) => updateField("zfp_multiplier", Number(e.target.value))} style={INPUT_STYLE} />
              </div>
            </div>
          </div>

          {/* 付則T（PRP） */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
              付則T（Appendix T）
            </h2>
            <p style={{ fontSize: "12px", color: MUTED, marginBottom: "16px", marginTop: 0 }}>
              PRP（Protest Required Penalty）コードを使用可能にするか設定します。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio" name="use_appendix_t" value="true"
                  checked={form.use_appendix_t === true}
                  onChange={() => updateField("use_appendix_t", true)}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>有効（PRP使用可）</div>
                  <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>付則Tを適用し、PRPコードを使用できる。着順×130%（切り上げ）。</div>
                </div>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio" name="use_appendix_t" value="false"
                  checked={form.use_appendix_t === false}
                  onChange={() => updateField("use_appendix_t", false)}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>無効（PRP使用不可）</div>
                  <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>付則Tを適用しない。PRPコードを入力するとエラーになります。</div>
                </div>
              </label>
            </div>
          </div>

          {/* 同校艇間特則 */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
              同校艇間特則
            </h2>
            <p style={{ fontSize: "12px", color: MUTED, marginBottom: "16px", marginTop: 0 }}>
              同一校の艇同士が接触した場合の特例ルールを適用するか設定します。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio" name="same_school_rule" value="false"
                  checked={form.same_school_rule === false}
                  onChange={() => updateField("same_school_rule", false)}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>なし（標準RRS）</div>
                  <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>通常のRRSルールを適用する。</div>
                </div>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="radio" name="same_school_rule" value="true"
                  checked={form.same_school_rule === true}
                  onChange={() => updateField("same_school_rule", true)}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>あり（同校艇特則適用）</div>
                  <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>同一校の艇同士の接触に特例ルールを適用する。関東女子学連で使用。</div>
                </div>
              </label>
            </div>
          </div>

          {/* フリート分割（個人戦のみ） */}
          {!isTeamEvent && (
            <div style={{ ...CARD, marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
                フリート分割
              </h2>
              <p style={{ fontSize: "12px", color: MUTED, marginBottom: "16px", marginTop: 0 }}>
                エントリー艇数が多い場合にフリートを分割して運営するか設定します。
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: form.fleet_split ? "16px" : "0" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="radio" name="fleet_split" value="false"
                    checked={form.fleet_split === false}
                    onChange={() => updateField("fleet_split", false)}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>なし（全艇同一フリート）</div>
                    <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>全艇が同じフリートで競技する。</div>
                  </div>
                </label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="radio" name="fleet_split" value="true"
                    checked={form.fleet_split === true}
                    onChange={() => updateField("fleet_split", true)}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>あり（フリート分割）</div>
                    <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>艇数に応じてフリートを分割して運営する。</div>
                  </div>
                </label>
              </div>

              {form.fleet_split && (
                <div style={{ paddingLeft: "16px", borderLeft: `3px solid ${BORDER}` }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: TEXT, marginBottom: "10px" }}>得点計算方式</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="radio" name="fleet_split_method" value="own"
                        checked={form.fleet_split_method === "own"}
                        onChange={() => updateField("fleet_split_method", "own")}
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>自フリート内で計算</div>
                        <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>自フリートの艇数・着順のみで得点を計算する。</div>
                      </div>
                    </label>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="radio" name="fleet_split_method" value="combined"
                        checked={form.fleet_split_method === "combined"}
                        onChange={() => updateField("fleet_split_method", "combined")}
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>全フリート合算で計算</div>
                        <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>全フリートの艇数・着順を合算して得点を計算する。</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 失格得点ルール（設定可能コード） */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "4px" }}>
              失格・非完走得点ルール
            </h2>
            <p style={{ fontSize: "12px", color: MUTED, marginBottom: "18px", marginTop: 0 }}>
              STARTERS_PLUS_1: スタート艇数＋1　／　ENTRIES_PLUS_1: エントリー艇数＋1
            </p>
            <div className="grid-2" style={{ gap: "14px" }}>
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

          {/* 特殊コード */}
          <div style={{ ...CARD, marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "18px" }}>
              特殊コード（RRSによる固定ルール）
            </h2>
            <div className="grid-2" style={{ gap: "10px" }}>
              {/* STP — sp_method に依存 */}
              <div style={{ padding: "10px 12px", backgroundColor: T.surface2, borderRadius: "8px", border: `1px solid ${BORDER}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "700", fontSize: "13px", color: NAV }}>STP</span>
                  <span style={{ fontSize: "11px", backgroundColor: "rgba(37,99,235,0.22)", color: "#93c5fd", padding: "2px 6px", borderRadius: "4px" }}>設定による</span>
                </div>
                <p style={{ fontSize: "11px", color: MUTED, margin: "4px 0 0" }}>Scoring Time Penalty</p>
                <p style={{ fontSize: "11px", color: TEXT, margin: "2px 0 0", fontWeight: "600" }}>
                  {form.sp_method === "add_one" ? "着順 ＋ 1点" : "失格と同じ得点（DSQルール）"}
                </p>
              </div>
              {/* PRP — use_appendix_t に依存 */}
              <div style={{ padding: "10px 12px", backgroundColor: T.surface2, borderRadius: "8px", border: `1px solid ${BORDER}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "700", fontSize: "13px", color: form.use_appendix_t ? NAV : "#94a3b8" }}>PRP</span>
                  <span style={{ fontSize: "11px", backgroundColor: form.use_appendix_t ? T.surface2 : "rgba(220,38,38,0.15)", color: form.use_appendix_t ? MUTED : "#dc2626", padding: "2px 6px", borderRadius: "4px" }}>
                    {form.use_appendix_t ? "有効" : "無効"}
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: MUTED, margin: "4px 0 0" }}>Protest Required Penalty（付則T）</p>
                <p style={{ fontSize: "11px", color: TEXT, margin: "2px 0 0", fontWeight: "600" }}>
                  {form.use_appendix_t ? "着順得点 × 130%（切り上げ）" : "使用不可（エラー）"}
                </p>
              </div>
              {fixedRuleCodes.map(({ code, rule, hint }) => (
                <div key={code} style={{ padding: "10px 12px", backgroundColor: T.surface2, borderRadius: "8px", border: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "700", fontSize: "13px", color: NAV }}>{code}</span>
                    <span style={{ fontSize: "11px", backgroundColor: T.surface2, color: MUTED, padding: "2px 6px", borderRadius: "4px" }}>固定</span>
                  </div>
                  <p style={{ fontSize: "11px", color: MUTED, margin: "4px 0 0" }}>{hint}</p>
                  <p style={{ fontSize: "11px", color: TEXT, margin: "2px 0 0", fontWeight: "600" }}>{rule}</p>
                </div>
              ))}
            </div>
          </div>

          {/* カット方式（団体戦のみ） */}
          {isTeamEvent && (
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
                    type="radio" name="team_cut_method" value="individual"
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
                    type="radio" name="team_cut_method" value="team"
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
          {isTeamEvent && (
            <div style={{ ...CARD, marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "18px" }}>
                タイ処理設定（団体戦）
              </h2>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: TEXT, marginBottom: "10px" }}>総合タイの処理方法</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="radio" name="overall_tie_method" value="kanto"
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
                      type="radio" name="overall_tie_method" value="zennihon"
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

              {form.overall_tie_method === "kanto" && (
                <div style={{ marginBottom: "20px", paddingLeft: "16px", borderLeft: `3px solid ${BORDER}` }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: TEXT, marginBottom: "10px" }}>フォールバック拡張</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="radio" name="tie_fallback_extended" value="true"
                        checked={form.tie_fallback_extended === true}
                        onChange={() => updateField("tie_fallback_extended", true)}
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT }}>2025年以降の新規定</div>
                        <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>最終レース合計でもタイが残る場合、最後から1つ前のレースへ遡って比較を繰り返す。</div>
                      </div>
                    </label>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="radio" name="tie_fallback_extended" value="false"
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

              {form.overall_tie_method === "kanto" && (
                <div style={{ paddingLeft: "16px", borderLeft: `3px solid ${BORDER}` }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: TEXT, marginBottom: "10px" }}>タイ解消時の除外得点の扱い</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="radio" name="tie_use_excluded_scores" value="true"
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
                        type="radio" name="tie_use_excluded_scores" value="false"
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

            {customCodes.length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                {customCodes.map((code) => (
                  <div key={code} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", backgroundColor: T.surface2, borderRadius: "20px", fontSize: "13px", fontWeight: "600", color: NAV }}>
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
                  padding: "10px 16px", backgroundColor: T.surface2, color: TEXT,
                  border: `1px solid ${BORDER}`, borderRadius: "8px",
                  cursor: "pointer", fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap",
                }}
              >
                + 追加
              </button>
            </div>
          </div>

          {error   && <p style={{ color: "#fca5a5", fontSize: "13px", marginBottom: "16px" }}>{error}</p>}
          {message && <p style={{ color: "#5eead4", fontSize: "13px", marginBottom: "16px" }}>{message}</p>}

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
