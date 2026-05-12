import { API_BASE } from "@/lib/api";

import Link from "next/link";
import TournamentNav from "../../components/TournamentNav";

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
};

async function getTournament(id: string): Promise<Tournament> {
  const res = await fetch(`${API_BASE}/tournaments/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("大会情報の取得に失敗しました");
  return res.json();
}

function getEventTemplateLabel(t: string) {
  switch (t) {
    case "INDIVIDUAL":        return "個人戦";
    case "TEAM_3_BOATS":      return "団体戦（3艇）";
    case "TEAM_4_BOATS":      return "団体戦（4艇）";
    case "MULTI_GROUP_HYBRID": return "複合集計";
    default:                  return t;
  }
}

const NAV    = "#1F4E78";
const BORDER = "#e2e8f0";
const WHITE  = "#ffffff";
const TEXT   = "#1a2332";
const MUTED  = "#64748b";
const CARD: React.CSSProperties = {
  backgroundColor: WHITE,
  border: `1px solid ${BORDER}`,
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const ACTIONS = [
  { href: "boats",     label: "艇登録",   icon: "⛵", desc: "参加艇・乗艇者を登録" },
  { href: "rules",     label: "ルール設定", icon: "📋", desc: "得点ルール・カット設定" },
  { href: "races",     label: "レース管理", icon: "🏁", desc: "レース追加・結果入力" },
  { href: "standings", label: "総合順位",  icon: "🏆", desc: "現時点の順位を確認" },
];

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTournament(id);

  type Field = [string, string | null | undefined];
  const fields: Field[] = [
    ["大会種別",  getEventTemplateLabel(t.event_template)],
    ["略称",      t.short_name],
    ["開催期間",  t.start_date
      ? `${t.start_date}${t.end_date && t.end_date !== t.start_date ? ` 〜 ${t.end_date}` : ""}`
      : null],
    ["会場",      t.venue],
    ["主催",      t.organizer],
    ["クラス",    t.class_name],
    ["備考",      t.notes],
  ];

  return (
    <>
      <TournamentNav id={id} name={t.name} />
      <main style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto" }}>

        <div style={{ ...CARD, marginBottom: "28px" }}>
          <div style={{ fontSize: "22px", fontWeight: "700", color: TEXT, marginBottom: "20px" }}>
            {t.name}
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "14px" }}>
          {ACTIONS.map(({ href, label, icon, desc }) => (
            <Link
              key={href}
              href={`/tournaments/${t.id}/${href}`}
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

      </main>
    </>
  );
}
