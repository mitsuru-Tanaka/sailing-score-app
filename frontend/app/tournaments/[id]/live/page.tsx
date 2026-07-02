"use client";

import { T } from "@/lib/theme";
import { apiFetch, apiErrorMessage } from "@/lib/api";
import { getMe, Me } from "@/lib/me";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import TournamentNav from "../../../components/TournamentNav";

type Boat = {
  id: number;
  sail_number: string;
  organization_name?: string | null;
  team_name?: string | null;
  boat_class?: string | null;
};

type Race = { id: number; race_number: number };

type LiveReportPosition = {
  rank: number;
  boat_id: number;
  sail_number: string;
  team_name?: string | null;
};

type LiveReport = {
  id: number;
  boat_class?: string | null;
  race_number: number;
  stage: string;
  positions: LiveReportPosition[];
  note?: string | null;
  updated_at?: string | null;
};

const NAV = T.accent;
const BORDER = T.border;
const WHITE = T.white;
const TEXT = T.text;
const MUTED = T.muted;
const CARD: React.CSSProperties = {
  backgroundColor: T.surface,
  border: `1px solid ${BORDER}`,
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
};
const INPUT: React.CSSProperties = {
  padding: "8px 10px",
  border: `1px solid ${BORDER}`,
  borderRadius: "6px",
  fontSize: "14px",
  outline: "none",
  backgroundColor: T.surface2,
  color: TEXT,
  boxSizing: "border-box",
};

const STAGE_PRESETS = ["1上", "2上", "3上", "finish"];

function boatLabel(b: { sail_number: string; team_name?: string | null; organization_name?: string | null }) {
  return b.team_name || b.organization_name || "";
}

export default function LiveReportPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined=読込中
  const [tournamentName, setTournamentName] = useState("");
  const [boats, setBoats] = useState<Boat[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [reports, setReports] = useState<LiveReport[]>([]);

  const [boatClass, setBoatClass] = useState<string>("");
  const [raceNumber, setRaceNumber] = useState<number>(1);
  const [stage, setStage] = useState<string>("1上");
  const [customStage, setCustomStage] = useState("");
  const [order, setOrder] = useState<number[]>([]); // boat_id の回航順
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [withSail, setWithSail] = useState(false);
  const [copied, setCopied] = useState(false);

  const effectiveStage = stage === "__custom__" ? customStage : stage;

  // ─── 初期ロード ───────────────────────────────────────────
  useEffect(() => {
    getMe().then((m) => setMe(m));
  }, []);

  useEffect(() => {
    if (!tournamentId || !me || (me.role !== "admin" && !me.live_reporter)) return;
    (async () => {
      try {
        const [tRes, bRes, rRes] = await Promise.all([
          apiFetch(`/tournaments/${tournamentId}`),
          apiFetch(`/tournaments/${tournamentId}/boats`),
          apiFetch(`/tournaments/${tournamentId}/races`),
        ]);
        if (tRes.ok) setTournamentName((await tRes.json()).name);
        if (bRes.ok) setBoats(await bRes.json());
        if (rRes.ok) {
          const rs: Race[] = await rRes.json();
          setRaces(rs);
          if (rs.length > 0) setRaceNumber(rs[rs.length - 1].race_number);
        }
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    })();
  }, [tournamentId, me]);

  const classes = useMemo(() => {
    const s = new Set<string>();
    boats.forEach((b) => { if (b.boat_class) s.add(b.boat_class); });
    return Array.from(s).sort();
  }, [boats]);

  useEffect(() => {
    if (classes.length > 0 && !boatClass) setBoatClass(classes[0]);
  }, [classes, boatClass]);

  const classBoats = useMemo(
    () => boats.filter((b) => !boatClass || b.boat_class === boatClass),
    [boats, boatClass]
  );

  // ─── 速報の読込（クラス・レース・地点が変わったら保存済みを反映） ───
  async function fetchReports() {
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}/live-reports`);
      if (res.ok) setReports(await res.json());
    } catch {
      /* 一覧は補助情報なのでエラーは無視 */
    }
  }
  useEffect(() => {
    if (!tournamentId || !me || (me.role !== "admin" && !me.live_reporter)) return;
    fetchReports();
  }, [tournamentId, me]);

  useEffect(() => {
    const existing = reports.find(
      (r) =>
        r.race_number === raceNumber &&
        r.stage === effectiveStage &&
        (r.boat_class ?? "") === (boatClass ?? "")
    );
    setOrder(existing ? existing.positions.map((p) => p.boat_id) : []);
    setMessage("");
  }, [raceNumber, effectiveStage, boatClass, reports]);

  // ─── 入力操作 ────────────────────────────────────────────
  function addBoat(id: number) {
    setOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }
  function removeBoat(id: number) {
    setOrder((prev) => prev.filter((x) => x !== id));
  }
  function moveBoat(index: number, dir: -1 | 1) {
    setOrder((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  async function handleSave() {
    if (!effectiveStage.trim()) { setError("地点（1上・finishなど）を入力してください"); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}/live-reports`, {
        method: "PUT",
        body: JSON.stringify({
          boat_class: boatClass || null,
          race_number: raceNumber,
          stage: effectiveStage,
          boat_ids: order,
        }),
      });
      if (!res.ok) { setError("保存に失敗しました"); return; }
      setMessage("保存しました");
      await fetchReports();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(reportId: number) {
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}/live-reports/${reportId}`, { method: "DELETE" });
      if (res.ok || res.status === 204) await fetchReports();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  }

  // ─── SNS用テキスト ────────────────────────────────────────
  const boatMap = useMemo(() => new Map(boats.map((b) => [b.id, b])), [boats]);

  const snsText = useMemo(() => {
    const header = `${boatClass ? boatClass + "級 " : ""}第${raceNumber}R ${effectiveStage}速報`;
    const lines = order.map((id, i) => {
      const b = boatMap.get(id);
      if (!b) return `${i + 1} ?`;
      return withSail
        ? `${i + 1} ${boatLabel(b)} (${b.sail_number})`
        : `${i + 1} ${boatLabel(b)}`;
    });
    return [tournamentName, header, ...lines].filter(Boolean).join("\n");
  }, [tournamentName, boatClass, raceNumber, effectiveStage, order, boatMap, withSail]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("コピーに失敗しました");
    }
  }

  // ─── ガード ──────────────────────────────────────────────
  if (me === undefined) {
    return <main style={{ padding: "32px 24px" }}><p style={{ color: MUTED }}>読み込み中...</p></main>;
  }
  if (!me || (me.role !== "admin" && !me.live_reporter)) {
    return (
      <main style={{ padding: "32px 24px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ ...CARD, color: "#fca5a5", textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔒</div>
          <p style={{ margin: 0 }}>このページは速報担当のみアクセスできます。管理者に依頼してください。</p>
        </div>
      </main>
    );
  }

  const filteredBoats = classBoats.filter((b) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      b.sail_number.toLowerCase().includes(q) ||
      boatLabel(b).toLowerCase().includes(q)
    );
  });

  const raceReports = reports.filter(
    (r) => r.race_number === raceNumber && (r.boat_class ?? "") === (boatClass ?? "")
  );

  return (
    <>
      <TournamentNav id={tournamentId} name={tournamentName} />
      <main style={{ padding: "24px 16px 48px", maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, marginBottom: "18px" }}>
          速報入力
          <span style={{ marginLeft: "10px", fontSize: "13px", fontWeight: "400", color: MUTED }}>
            1上・2上・finishなどの回航順位を入力してSNS速報を作成
          </span>
        </h1>

        {/* 条件選択 */}
        <div style={{ ...CARD, marginBottom: "16px", display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "flex-end" }}>
          {classes.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>クラス</label>
              <div style={{ display: "flex", gap: "6px" }}>
                {classes.map((c) => (
                  <button key={c} onClick={() => setBoatClass(c)} style={{
                    padding: "8px 16px", borderRadius: "6px", cursor: "pointer",
                    fontWeight: "700", fontSize: "13px",
                    border: `1px solid ${boatClass === c ? NAV : BORDER}`,
                    backgroundColor: boatClass === c ? NAV : T.surface2,
                    color: boatClass === c ? WHITE : MUTED,
                  }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>レース</label>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button onClick={() => setRaceNumber((n) => Math.max(1, n - 1))} style={{
                width: "34px", height: "34px", borderRadius: "6px", border: `1px solid ${BORDER}`,
                backgroundColor: T.surface2, color: TEXT, cursor: "pointer", fontSize: "16px",
              }}>−</button>
              <span style={{ color: TEXT, fontWeight: "700", fontSize: "16px", minWidth: "58px", textAlign: "center" }}>
                第{raceNumber}R
              </span>
              <button onClick={() => setRaceNumber((n) => n + 1)} style={{
                width: "34px", height: "34px", borderRadius: "6px", border: `1px solid ${BORDER}`,
                backgroundColor: T.surface2, color: TEXT, cursor: "pointer", fontSize: "16px",
              }}>＋</button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>地点</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {STAGE_PRESETS.map((s) => (
                <button key={s} onClick={() => setStage(s)} style={{
                  padding: "8px 14px", borderRadius: "6px", cursor: "pointer",
                  fontWeight: "700", fontSize: "13px",
                  border: `1px solid ${stage === s ? NAV : BORDER}`,
                  backgroundColor: stage === s ? NAV : T.surface2,
                  color: stage === s ? WHITE : MUTED,
                }}>
                  {s}
                </button>
              ))}
              <button onClick={() => setStage("__custom__")} style={{
                padding: "8px 14px", borderRadius: "6px", cursor: "pointer",
                fontWeight: "700", fontSize: "13px",
                border: `1px solid ${stage === "__custom__" ? NAV : BORDER}`,
                backgroundColor: stage === "__custom__" ? NAV : T.surface2,
                color: stage === "__custom__" ? WHITE : MUTED,
              }}>
                その他
              </button>
              {stage === "__custom__" && (
                <input
                  value={customStage}
                  onChange={(e) => setCustomStage(e.target.value)}
                  placeholder="例: 1下"
                  style={{ ...INPUT, width: "100px" }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
          {/* 艇選択 */}
          <div style={CARD}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: TEXT, margin: 0 }}>
                艇を回航順にタップ
              </h2>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="セール番号/大学で絞込"
                style={{ ...INPUT, width: "170px" }}
              />
            </div>
            {classBoats.length === 0 ? (
              <p style={{ color: MUTED, fontSize: "13px" }}>艇が登録されていません。先に艇登録を行ってください。</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "420px", overflowY: "auto" }}>
                {filteredBoats.map((b) => {
                  const used = order.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      onClick={() => (used ? removeBoat(b.id) : addBoat(b.id))}
                      style={{
                        padding: "8px 10px", borderRadius: "8px", cursor: "pointer",
                        border: `1px solid ${used ? NAV : BORDER}`,
                        backgroundColor: used ? "rgba(249,115,22,0.15)" : T.surface2,
                        color: used ? NAV : TEXT,
                        fontSize: "13px", fontWeight: "600",
                        textAlign: "left", lineHeight: 1.3,
                      }}
                    >
                      <span style={{ fontFamily: "monospace" }}>{b.sail_number}</span>
                      <br />
                      <span style={{ fontSize: "11px", color: used ? NAV : MUTED }}>
                        {boatLabel(b)}
                        {used && ` ・${order.indexOf(b.id) + 1}位`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 回航順リスト + SNSテキスト */}
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700", color: TEXT, margin: 0 }}>
                  {effectiveStage || "…"} 回航順（{order.length}艇）
                </h2>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setOrder([])} disabled={order.length === 0} style={{
                    padding: "6px 12px", fontSize: "12px", fontWeight: "600",
                    border: `1px solid ${BORDER}`, borderRadius: "6px", cursor: "pointer",
                    backgroundColor: T.surface2, color: MUTED,
                  }}>
                    クリア
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{
                    padding: "6px 18px", fontSize: "13px", fontWeight: "700",
                    border: "none", borderRadius: "6px", cursor: "pointer",
                    backgroundColor: NAV, color: WHITE, opacity: saving ? 0.7 : 1,
                  }}>
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>

              {error && <p style={{ color: "#fca5a5", fontSize: "13px", margin: "0 0 8px" }}>{error}</p>}
              {message && <p style={{ color: "#5eead4", fontSize: "13px", margin: "0 0 8px" }}>{message}</p>}

              {order.length === 0 ? (
                <p style={{ color: MUTED, fontSize: "13px", margin: 0 }}>
                  左の一覧から回航した順に艇をタップしてください。
                </p>
              ) : (
                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "4px" }}>
                  {order.map((id, i) => {
                    const b = boatMap.get(id);
                    return (
                      <li key={id} style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "6px 10px", borderRadius: "6px",
                        backgroundColor: T.surface2, border: `1px solid ${BORDER}`,
                      }}>
                        <span style={{ color: NAV, fontWeight: "800", width: "26px", textAlign: "right" }}>{i + 1}</span>
                        <span style={{ color: TEXT, fontSize: "13px", flex: 1 }}>
                          {b ? `${boatLabel(b)} ` : "?"}
                          <span style={{ color: MUTED, fontFamily: "monospace", fontSize: "12px" }}>
                            {b?.sail_number}
                          </span>
                        </span>
                        <button onClick={() => moveBoat(i, -1)} disabled={i === 0} style={{
                          border: `1px solid ${BORDER}`, backgroundColor: "transparent", color: MUTED,
                          borderRadius: "4px", cursor: "pointer", padding: "2px 7px",
                        }}>↑</button>
                        <button onClick={() => moveBoat(i, 1)} disabled={i === order.length - 1} style={{
                          border: `1px solid ${BORDER}`, backgroundColor: "transparent", color: MUTED,
                          borderRadius: "4px", cursor: "pointer", padding: "2px 7px",
                        }}>↓</button>
                        <button onClick={() => removeBoat(id)} style={{
                          border: "none", backgroundColor: "transparent", color: "#fca5a5",
                          cursor: "pointer", padding: "2px 6px", fontSize: "14px",
                        }}>✕</button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700", color: TEXT, margin: 0 }}>SNS用テキスト</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label style={{ fontSize: "12px", color: MUTED, display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                    <input type="checkbox" checked={withSail} onChange={(e) => setWithSail(e.target.checked)} />
                    セール番号
                  </label>
                  <button onClick={handleCopy} style={{
                    padding: "6px 14px", fontSize: "12px", fontWeight: "700",
                    border: `1px solid ${copied ? T.accent2 : BORDER}`, borderRadius: "6px",
                    cursor: "pointer", backgroundColor: T.surface2,
                    color: copied ? T.accent2 : TEXT,
                  }}>
                    {copied ? "✓ コピーしました" : "コピー"}
                  </button>
                </div>
              </div>
              <pre style={{
                margin: 0, padding: "12px", borderRadius: "8px",
                backgroundColor: T.bg, border: `1px solid ${BORDER}`,
                color: TEXT, fontSize: "13px", whiteSpace: "pre-wrap", lineHeight: 1.6,
              }}>
                {snsText}
              </pre>
            </div>
          </div>
        </div>

        {/* このレースの保存済み速報 */}
        <div style={{ ...CARD, marginTop: "16px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: TEXT, marginTop: 0, marginBottom: "12px" }}>
            第{raceNumber}R{boatClass ? `（${boatClass}）` : ""} の保存済み速報
          </h2>
          {raceReports.length === 0 ? (
            <p style={{ color: MUTED, fontSize: "13px", margin: 0 }}>まだ保存された速報はありません。</p>
          ) : (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {raceReports.map((r) => (
                <div key={r.id} style={{
                  border: `1px solid ${BORDER}`, borderRadius: "8px",
                  padding: "10px 14px", backgroundColor: T.surface2, minWidth: "180px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ color: NAV, fontWeight: "700", fontSize: "13px" }}>{r.stage}</span>
                    <button onClick={() => handleDelete(r.id)} style={{
                      border: "none", backgroundColor: "transparent", color: "#fca5a5",
                      cursor: "pointer", fontSize: "12px",
                    }}>削除</button>
                  </div>
                  <div style={{ fontSize: "12px", color: TEXT, lineHeight: 1.7 }}>
                    {r.positions.slice(0, 5).map((p) => (
                      <div key={p.boat_id}>{p.rank} {p.team_name || p.sail_number}</div>
                    ))}
                    {r.positions.length > 5 && (
                      <div style={{ color: MUTED }}>…全{r.positions.length}艇</div>
                    )}
                  </div>
                  {r.updated_at && (
                    <div style={{ fontSize: "11px", color: MUTED, marginTop: "6px" }}>
                      {new Date(r.updated_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 更新
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
