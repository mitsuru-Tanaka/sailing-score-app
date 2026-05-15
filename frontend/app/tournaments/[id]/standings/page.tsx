"use client";

import { apiFetch, API_BASE } from "@/lib/api";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import TournamentNav from "../../../components/TournamentNav";

// --- 型定義 ---

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
};

type StandingRow = {
  boat_id: number;
  boat_number: string;
  sail_number: string;
  organization_name: string;
  race_points: Array<number | null>;
  total_points: number;
  discarded_points: number[];
  net_points: number;
  rank: number;
};

type StandingSection = {
  name: string;
  rows: StandingRow[];
};

type StandingsResponse = {
  sections: StandingSection[];
};

type BoatDetailRow = {
  boat_id: number;
  sail_number: string;
  helmsman_name: string | null;
  crew_name: string | null;
  race_points: Array<number | null>;
  boat_total: number;
  discarded_race_indices: number[];
};

type TeamClassBlock = {
  rank: number;
  team_name: string;
  team_race_totals: number[];
  team_total: number;
  boats: BoatDetailRow[];
};

type ClassSection = {
  class_name: string;
  section_title: string;
  race_count: number;
  teams: TeamClassBlock[];
};

type ClassScoreItem = {
  class_name: string;
  points: number;
};

type OverallTeamRow = {
  rank: number;
  team_name: string;
  class_scores: ClassScoreItem[];
  total_points: number;
};

type OverallSection = {
  section_title: string;
  teams: OverallTeamRow[];
};

type StandingsV3Response = {
  event_template: string;
  class_sections: ClassSection[];
  overall_section: OverallSection | null;
};

// --- ユーティリティ ---

function getEventTemplateLabel(eventTemplate: string) {
  switch (eventTemplate) {
    case "INDIVIDUAL":       return "個人戦";
    case "TEAM_3_BOATS":     return "団体戦（3艇）";
    case "TEAM_4_BOATS":     return "団体戦（4艇）";
    case "MULTI_GROUP_HYBRID": return "複合集計";
    default:                 return eventTemplate;
  }
}

function formatCrew(helmsman: string | null, crew: string | null): string {
  if (helmsman && crew) return `${helmsman} / ${crew}`;
  if (helmsman)         return helmsman;
  if (crew)             return crew;
  return "-";
}

// --- スタイル定数 ---

const HEADER_BG    = "#1F4E78";
const HEADER_TEXT  = "#ffffff";
const HEADER_BORDER = "1px solid #4472a8";
const SCHOOL_BG    = "#eef2f7";
const TEAM_SEP     = "2px solid #b0b8c4";
const ROW_SEP      = "1px solid #eee";

// --- V3 クラス別セクション ---

function ClassSectionView({ section }: { section: ClassSection }) {
  const raceCount = section.race_count;

  return (
    <section
      style={{
        border: "1px solid #ddd",
        borderRadius: "12px",
        backgroundColor: "#fff",
        padding: "20px",
      }}
    >
      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>
        {section.section_title}
      </h2>

      {section.teams.length === 0 ? (
        <p style={{ color: "#888" }}>集計対象がありません</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: `${520 + raceCount * 56}px`,
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: HEADER_BG, color: HEADER_TEXT }}>
                {(["順位", "学校名", "セールNo.", "乗艇者"] as const).map((label) => (
                  <th
                    key={label}
                    style={{
                      padding: "10px",
                      textAlign: label === "順位" ? "center" : "left",
                      whiteSpace: "nowrap",
                      border: HEADER_BORDER,
                    }}
                  >
                    {label}
                  </th>
                ))}
                {Array.from({ length: raceCount }).map((_, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "10px",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      border: HEADER_BORDER,
                    }}
                  >
                    R{i + 1}
                  </th>
                ))}
                <th style={{ padding: "10px", textAlign: "right", whiteSpace: "nowrap", border: HEADER_BORDER }}>
                  艇合計
                </th>
                <th style={{ padding: "10px", textAlign: "right", whiteSpace: "nowrap", border: HEADER_BORDER }}>
                  {raceCount > 1 ? `${section.class_name}合計` : `${section.class_name}得点`}
                </th>
              </tr>
            </thead>
            <tbody>
              {section.teams.flatMap((team) =>
                team.boats.map((boat, boatIdx) => {
                  const isFirst = boatIdx === 0;
                  const isLast  = boatIdx === team.boats.length - 1;
                  const rowBorderBottom = isLast ? TEAM_SEP : ROW_SEP;

                  return (
                    <tr key={`${team.team_name}-${boat.boat_id}`}>
                      {isFirst && (
                        <>
                          <td
                            rowSpan={team.boats.length}
                            style={{
                              padding: "10px",
                              textAlign: "center",
                              verticalAlign: "middle",
                              fontWeight: "bold",
                              fontSize: "16px",
                              backgroundColor: SCHOOL_BG,
                              borderRight: "1px solid #ccc",
                              borderBottom: TEAM_SEP,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {team.rank}
                          </td>
                          <td
                            rowSpan={team.boats.length}
                            style={{
                              padding: "10px",
                              verticalAlign: "middle",
                              fontWeight: "bold",
                              backgroundColor: SCHOOL_BG,
                              borderRight: "1px solid #ccc",
                              borderBottom: TEAM_SEP,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {team.team_name}
                          </td>
                        </>
                      )}
                      <td style={{ padding: "8px 10px", borderBottom: rowBorderBottom, whiteSpace: "nowrap" }}>
                        {boat.sail_number}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          borderBottom: rowBorderBottom,
                          whiteSpace: "nowrap",
                          color: "#555",
                        }}
                      >
                        {formatCrew(boat.helmsman_name, boat.crew_name)}
                      </td>
                      {boat.race_points.map((pt, rIdx) => {
                        const isDiscarded = boat.discarded_race_indices.includes(rIdx);
                        return (
                          <td
                            key={rIdx}
                            style={{
                              padding: "8px 10px",
                              textAlign: "center",
                              borderBottom: rowBorderBottom,
                              whiteSpace: "nowrap",
                              color: isDiscarded ? "#aaa" : "inherit",
                              textDecoration: isDiscarded ? "line-through" : "none",
                            }}
                          >
                            {pt ?? "-"}
                          </td>
                        );
                      })}
                      <td
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          borderBottom: rowBorderBottom,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {boat.boat_total}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          borderBottom: rowBorderBottom,
                          fontWeight: isLast ? "bold" : "normal",
                          color: isLast ? HEADER_BG : "inherit",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isLast ? team.team_total : ""}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// --- V3 総合順位セクション ---

function OverallSectionView({ section }: { section: OverallSection }) {
  if (section.teams.length === 0) return null;

  const classNames =
    section.teams[0]?.class_scores.map((cs) => cs.class_name) ?? [];

  return (
    <section
      style={{
        border: "1px solid #ddd",
        borderRadius: "12px",
        backgroundColor: "#fff",
        padding: "20px",
      }}
    >
      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>
        {section.section_title}
      </h2>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: `${300 + classNames.length * 100}px`,
            fontSize: "14px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: HEADER_BG, color: HEADER_TEXT }}>
              <th style={{ padding: "10px", textAlign: "center", border: HEADER_BORDER }}>順位</th>
              <th style={{ padding: "10px", textAlign: "left",   border: HEADER_BORDER }}>学校名</th>
              {classNames.map((cn) => (
                <th
                  key={cn}
                  style={{ padding: "10px", textAlign: "right", whiteSpace: "nowrap", border: HEADER_BORDER }}
                >
                  {cn}得点
                </th>
              ))}
              <th style={{ padding: "10px", textAlign: "right", border: HEADER_BORDER }}>総合得点</th>
            </tr>
          </thead>
          <tbody>
            {section.teams.map((row) => (
              <tr key={row.team_name}>
                <td
                  style={{
                    padding: "10px",
                    textAlign: "center",
                    borderBottom: ROW_SEP,
                    fontWeight: "bold",
                    fontSize: "16px",
                  }}
                >
                  {row.rank}
                </td>
                <td style={{ padding: "10px", borderBottom: ROW_SEP, fontWeight: "bold" }}>
                  {row.team_name}
                </td>
                {row.class_scores.map((cs) => (
                  <td
                    key={cs.class_name}
                    style={{ padding: "10px", textAlign: "right", borderBottom: ROW_SEP }}
                  >
                    {cs.points}
                  </td>
                ))}
                <td
                  style={{
                    padding: "10px",
                    textAlign: "right",
                    borderBottom: ROW_SEP,
                    fontWeight: "bold",
                    color: HEADER_BG,
                  }}
                >
                  {row.total_points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// --- V2 セクション（個人戦などのフォールバック） ---

function V2SectionView({
  section,
  isTeamEvent,
}: {
  section: StandingSection;
  isTeamEvent: boolean;
}) {
  const maxRaceCount =
    section.rows.length > 0
      ? Math.max(...section.rows.map((row) => row.race_points.length))
      : 0;

  return (
    <section
      style={{
        border: "1px solid #ddd",
        borderRadius: "12px",
        backgroundColor: "#fff",
        padding: "20px",
      }}
    >
      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>
        {section.name}
      </h2>

      {section.rows.length === 0 ? (
        <p style={{ color: "#888" }}>集計対象がありません</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "900px",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: HEADER_BG, color: HEADER_TEXT }}>
                <th style={{ padding: "10px", textAlign: "center", border: HEADER_BORDER }}>順位</th>
                {!isTeamEvent && (
                  <>
                    <th style={{ padding: "10px", textAlign: "left", border: HEADER_BORDER }}>艇番</th>
                    <th style={{ padding: "10px", textAlign: "left", border: HEADER_BORDER }}>セールNo.</th>
                  </>
                )}
                <th style={{ padding: "10px", textAlign: "left", border: HEADER_BORDER }}>
                  {isTeamEvent ? "学校名" : "所属"}
                </th>
                {Array.from({ length: maxRaceCount }).map((_, idx) => (
                  <th
                    key={idx}
                    style={{ padding: "10px", textAlign: "center", border: HEADER_BORDER }}
                  >
                    R{idx + 1}
                  </th>
                ))}
                <th style={{ padding: "10px", textAlign: "right", border: HEADER_BORDER }}>合計得点</th>
                <th style={{ padding: "10px", textAlign: "right", border: HEADER_BORDER }}>カット得点</th>
                <th style={{ padding: "10px", textAlign: "right", border: HEADER_BORDER }}>総合得点</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => (
                <tr key={`${section.name}-${row.boat_id}-${row.rank}`}>
                  <td style={{ padding: "10px", textAlign: "center", borderBottom: ROW_SEP, fontWeight: "bold" }}>
                    {row.rank}
                  </td>
                  {!isTeamEvent && (
                    <>
                      <td style={{ padding: "10px", borderBottom: ROW_SEP }}>{row.boat_number || "-"}</td>
                      <td style={{ padding: "10px", borderBottom: ROW_SEP }}>{row.sail_number || "-"}</td>
                    </>
                  )}
                  <td style={{ padding: "10px", borderBottom: ROW_SEP, fontWeight: isTeamEvent ? "bold" : "normal" }}>
                    {row.organization_name}
                  </td>
                  {Array.from({ length: maxRaceCount }).map((_, idx) => (
                    <td key={idx} style={{ padding: "10px", textAlign: "center", borderBottom: ROW_SEP }}>
                      {row.race_points[idx] ?? "-"}
                    </td>
                  ))}
                  <td style={{ padding: "10px", textAlign: "right", borderBottom: ROW_SEP }}>
                    {row.race_points.some(p => p !== null) ? row.total_points : "-"}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right", borderBottom: ROW_SEP }}>
                    {row.discarded_points.length > 0 ? row.discarded_points.join(", ") : "-"}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      textAlign: "right",
                      borderBottom: ROW_SEP,
                      fontWeight: "bold",
                      color: HEADER_BG,
                    }}
                  >
                    {row.race_points.some(p => p !== null) ? row.net_points : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// --- メインページ ---

export default function StandingsPage() {
  const params = useParams();
  const id = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [v3Response, setV3Response] = useState<StandingsV3Response | null>(null);
  const [v2Response, setV2Response] = useState<StandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const tRes = await apiFetch(`/tournaments/${id}`);
      if (!tRes.ok) throw new Error("大会情報の取得に失敗しました");
      const t: Tournament = await tRes.json();
      setTournament(t);

      if (t.event_template === "TEAM_3_BOATS") {
        const sRes = await apiFetch(`/tournaments/${id}/standings-v3`);
        if (!sRes.ok) throw new Error("順位の取得に失敗しました");
        setV3Response(await sRes.json());
      } else {
        const sRes = await apiFetch(`/tournaments/${id}/standings-v2`);
        if (!sRes.ok) throw new Error("順位の取得に失敗しました");
        setV2Response(await sRes.json());
      }
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return <main style={{ padding: "24px" }}><p>読み込み中...</p></main>;
  }

  if (error && !tournament) {
    return <main style={{ padding: "24px" }}><p style={{ color: "red" }}>{error}</p></main>;
  }

  if (!tournament) return null;

  const useV3 = tournament.event_template === "TEAM_3_BOATS";
  const isTeamEvent =
    tournament.event_template === "TEAM_3_BOATS" ||
    tournament.event_template === "TEAM_4_BOATS";

  const hasContent = useV3
    ? (v3Response?.class_sections ?? []).some((s) => s.teams.length > 0)
    : (v2Response?.sections ?? []).length > 0;

  const NAV_COLOR = "#1F4E78";
  const BORDER_COLOR = "#e2e8f0";
  const WHITE = "#ffffff";
  const TEXT_COLOR = "#1a2332";
  const MUTED_COLOR = "#64748b";

  return (
    <>
      <TournamentNav id={id} name={tournament.name} />
      <main style={{ padding: "32px 24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT_COLOR, margin: 0 }}>
          総合順位
        </h1>
        <div className="no-print" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: "9px 18px",
              backgroundColor: WHITE,
              color: TEXT_COLOR,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            🖨️ 印刷
          </button>
          <button
            onClick={async () => {
              const res = await apiFetch(`/tournaments/${id}/export/excel`);
              if (!res.ok) return;
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `tournament_${id}_standings.xlsx`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              display: "inline-block",
              padding: "9px 18px",
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: "8px",
              backgroundColor: WHITE,
              color: TEXT_COLOR,
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            📊 Excel出力
          </button>
        </div>
      </div>

      <section
        style={{
          backgroundColor: WHITE,
          border: `1px solid ${BORDER_COLOR}`,
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ fontSize: "20px", fontWeight: "700", color: TEXT_COLOR, marginBottom: "12px" }}>
          {tournament.name}
        </div>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", fontSize: "13px", color: MUTED_COLOR }}>
          <span style={{ fontWeight: "600", color: NAV_COLOR }}>{getEventTemplateLabel(tournament.event_template)}</span>
          {tournament.start_date && (
            <span>📅 {tournament.start_date}{tournament.end_date && tournament.end_date !== tournament.start_date ? ` 〜 ${tournament.end_date}` : ""}</span>
          )}
          {tournament.venue && <span>📍 {tournament.venue}</span>}
          {tournament.organizer && <span>🏛 {tournament.organizer}</span>}
        </div>
      </section>

      {!hasContent ? (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            backgroundColor: "#fff",
            padding: "20px",
          }}
        >
          <p style={{ color: "#888" }}>集計対象がありません</p>
        </section>
      ) : useV3 && v3Response ? (
        <div style={{ display: "grid", gap: "24px" }}>
          {v3Response.class_sections.map((section) => (
            <ClassSectionView key={section.class_name} section={section} />
          ))}
          {v3Response.overall_section && (
            <OverallSectionView section={v3Response.overall_section} />
          )}
        </div>
      ) : v2Response ? (
        <div style={{ display: "grid", gap: "24px" }}>
          {v2Response.sections.map((section, idx) => (
            <V2SectionView
              key={`${section.name}-${idx}`}
              section={section}
              isTeamEvent={isTeamEvent}
            />
          ))}
        </div>
      ) : null}
    </main>
    </>
  );
}
