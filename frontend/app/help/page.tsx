"use client";

import Link from "next/link";
import { T } from "@/lib/theme";

const CARD: React.CSSProperties = {
  backgroundColor: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  marginBottom: "20px",
};

const H2: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "700",
  color: T.text,
  margin: "0 0 14px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const H3: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "700",
  color: T.accent,
  margin: "16px 0 6px",
};

const P: React.CSSProperties = {
  fontSize: "14px",
  color: T.text,
  lineHeight: 1.8,
  margin: "0 0 8px",
};

const LI: React.CSSProperties = {
  fontSize: "14px",
  color: T.text,
  lineHeight: 1.8,
  marginBottom: "4px",
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "1px 8px",
      borderRadius: "6px",
      backgroundColor: T.surface2,
      border: `1px solid ${T.border}`,
      color: T.text,
      fontSize: "12px",
      fontWeight: "600",
      margin: "0 2px",
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

const SECTIONS = [
  { id: "overview", label: "このアプリでできること" },
  { id: "flow", label: "基本の流れ" },
  { id: "tournaments", label: "大会一覧ページ" },
  { id: "tabs", label: "大会内の5つのタブ" },
  { id: "result-entry", label: "レース結果の入力" },
  { id: "standings", label: "総合順位とエクスポート" },
  { id: "modes", label: "クラウド / ローカルモード" },
  { id: "account", label: "アカウント・管理" },
  { id: "tips", label: "困ったときは" },
];

export default function HelpPage() {
  return (
    <main style={{ padding: "32px 24px", maxWidth: "880px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: T.text, margin: "0 0 8px" }}>
          ⛵ ヘルプ・使い方ガイド
        </h1>
        <p style={{ fontSize: "14px", color: T.muted, margin: 0 }}>
          セーリング得点管理システムの機能と画面の説明です。
        </p>
      </div>

      {/* 目次 */}
      <div style={{ ...CARD, padding: "16px 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
          {SECTIONS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{ fontSize: "13px", color: T.accent, textDecoration: "none", fontWeight: "600" }}
            >
              {i + 1}. {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* 1. 概要 */}
      <section id="overview" style={CARD}>
        <h2 style={H2}>① このアプリでできること</h2>
        <p style={P}>
          セーリング競技の大会を作成し、艇（参加者）を登録、レースごとの着順を入力すると、
          ルールに沿って<strong>得点と総合順位が自動計算</strong>されます。
          結果は PDF / Excel で出力できます。
        </p>
        <h3 style={H3}>対応する大会形式</h3>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li style={LI}><Pill>個人戦</Pill> 艇ごとの個人順位を集計</li>
          <li style={LI}><Pill>団体戦（3艇）</Pill> <Pill>団体戦（4艇）</Pill> 大学・チーム単位で合計を集計</li>
          <li style={LI}><Pill>複合集計</Pill> 複数グループをまたいだ集計</li>
        </ul>
      </section>

      {/* 2. 基本の流れ */}
      <section id="flow" style={CARD}>
        <h2 style={H2}>② 基本の流れ</h2>
        <p style={P}>大会運営は次の順番で進めます。</p>
        <ol style={{ margin: 0, paddingLeft: "20px" }}>
          <li style={LI}><strong>大会を作成</strong>（一覧ページの「+ 新規大会を作成」）</li>
          <li style={LI}><strong>艇を登録</strong>（艇登録タブ。CSV一括取り込みも可能）</li>
          <li style={LI}><strong>ルールを設定</strong>（ルールタブ。プリセットから選べます）</li>
          <li style={LI}><strong>レースを作成</strong>（レースタブで第1レース、第2レース…を追加）</li>
          <li style={LI}><strong>着順を入力</strong>（各レースの結果入力画面）</li>
          <li style={LI}><strong>総合順位を確認・出力</strong>（総合順位タブ）</li>
        </ol>
      </section>

      {/* 3. 大会一覧 */}
      <section id="tournaments" style={CARD}>
        <h2 style={H2}>③ 大会一覧ページ（トップ）</h2>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li style={LI}><Pill>+ 新規大会を作成</Pill> 大会名・日程・会場・クラス（470 / スナイプ等）・形式を設定して作成します。</li>
          <li style={LI}>各大会カードをクリックすると、その大会の管理画面に入ります。</li>
          <li style={LI}><Pill>🗑️</Pill> ボタンでゴミ箱を表示。削除した大会は<strong>復元</strong>または<strong>完全削除</strong>できます。</li>
          <li style={LI}>操作の成否は画面上部に通知（成功＝緑、失敗＝赤）で表示されます。</li>
        </ul>
      </section>

      {/* 4. 5つのタブ */}
      <section id="tabs" style={CARD}>
        <h2 style={H2}>④ 大会内の5つのタブ</h2>
        <p style={P}>大会を開くと、上部に5つのタブが並びます。</p>

        <h3 style={H3}>概要</h3>
        <p style={P}>大会名・日程・会場・形式などの基本情報。編集メンバーの追加もここで行えます。</p>

        <h3 style={H3}>艇登録</h3>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li style={LI}>艇（セール番号・所属・スキッパー/クルー名・クラス）の登録・編集・削除。</li>
          <li style={LI}><strong>CSV一括取り込み</strong>でまとめて登録できます。</li>
          <li style={LI}>登録した艇のリストを<strong>PDF出力</strong>できます。</li>
        </ul>

        <h3 style={H3}>ルール</h3>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li style={LI}>得点方式のプリセット選択（ローポイント等）。</li>
          <li style={LI}>カット（除外）レース数、同点時の優先順位、ペナルティ係数の設定。</li>
          <li style={LI}>DNE / SP / 付則T などの特殊ルールの ON/OFF。</li>
        </ul>

        <h3 style={H3}>レース</h3>
        <p style={P}>第1レース・第2レース… とレースを追加し、各レースの結果入力画面へ進みます。</p>

        <h3 style={H3}>総合順位</h3>
        <p style={P}>全レースを集計した順位表。PDF / Excel で出力できます（詳細は⑥）。</p>
      </section>

      {/* 5. 結果入力 */}
      <section id="result-entry" style={CARD}>
        <h2 style={H2}>⑤ レース結果の入力</h2>
        <p style={P}>レース結果の画面には<strong>2つの入力方法</strong>があり、タブで切り替えられます。</p>

        <h3 style={H3}>着順入力タブ</h3>
        <p style={P}>
          フィニッシュした順に上から、セール番号（または受付番号）を入力していく方式。
          現場でアナウンスを聞きながら素早く入力するのに向いています。
        </p>

        <h3 style={H3}>艇別入力タブ</h3>
        <p style={P}>
          艇の一覧に対して、それぞれの着順やリザルトコードを入力する方式。
          特定の艇だけ修正したいときに便利です。
        </p>

        <h3 style={H3}>リザルトコード・特殊処理</h3>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li style={LI}><Pill>DNF</Pill><Pill>DNS</Pill><Pill>DSQ</Pill><Pill>OCS</Pill> 等のコードを指定できます。</li>
          <li style={LI}><Pill>RDG</Pill><Pill>DPI</Pill> など得点を手動指定するコードにも対応。</li>
          <li style={LI}>着順の重複や未入力があると<strong>確認ダイアログ</strong>で警告します。</li>
          <li style={LI}>保存するとすぐに得点へ反映されます。</li>
        </ul>
      </section>

      {/* 6. 総合順位 */}
      <section id="standings" style={CARD}>
        <h2 style={H2}>⑥ 総合順位とエクスポート</h2>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li style={LI}><strong>自動更新</strong>：一定間隔で最新の順位に更新されます。<Pill>自動更新 ON / OFF</Pill> で切り替え可能。</li>
          <li style={LI}><Pill>🔄 更新</Pill> で手動更新。右側に<strong>最終更新時刻</strong>を表示します。</li>
          <li style={LI}>更新に失敗した場合は「⚠ 更新失敗（◯時◯分時点を表示中）」と表示され、直前のデータが残ります。</li>
          <li style={LI}><Pill>📄 PDF出力</Pill> <Pill>Excel出力</Pill> で正式な成績表をダウンロードできます。</li>
        </ul>
        <p style={{ ...P, marginTop: "10px", color: T.muted, fontSize: "13px" }}>
          ※ 別の端末で結果を入力しながら、この画面を会場のモニターに映しておく使い方ができます。
        </p>
      </section>

      {/* 7. モード */}
      <section id="modes" style={CARD}>
        <h2 style={H2}>⑦ クラウドモード / ローカルモード</h2>
        <p style={P}>画面右上のバッジで現在のモードがわかります。</p>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li style={LI}><Pill>CLOUD</Pill> 通常運用。どこからでもアクセスでき、データはクラウドに保存されます。</li>
          <li style={LI}><Pill>LOCAL</Pill> 大会当日に Mac 内で完結させる高速・オフライン対応モード。同じ Wi-Fi の端末からもアクセスできます。</li>
        </ul>
        <p style={{ ...P, marginTop: "10px", color: T.muted, fontSize: "13px" }}>
          ※ クラウドモードでは、しばらくアクセスがないとサーバーが休止し、初回表示に少し時間がかかることがあります（「サーバーを起動しています…」と表示されます）。
        </p>
      </section>

      {/* 8. アカウント */}
      <section id="account" style={CARD}>
        <h2 style={H2}>⑧ アカウント・管理</h2>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li style={LI}>右上のアバター（名前）から<strong>アカウント設定</strong>へ。表示名・メール・パスワードを変更できます。</li>
          <li style={LI}>管理者は<strong>管理</strong>メニューからユーザーの招待・管理ができます。</li>
        </ul>
      </section>

      {/* 9. 困ったとき */}
      <section id="tips" style={CARD}>
        <h2 style={H2}>⑨ 困ったときは</h2>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li style={LI}><strong>順位が更新されない</strong> → 総合順位タブの <Pill>🔄 更新</Pill> を押す。</li>
          <li style={LI}><strong>「取得に失敗しました」</strong> → ネットワークを確認。クラウドモードならサーバー起動待ちの可能性があるので少し待って再表示。</li>
          <li style={LI}><strong>得点がおかしい</strong> → ルールタブの設定（カット数・ペナルティ係数）と、各艇のリザルトコードを確認。</li>
          <li style={LI}><strong>大会を間違って消した</strong> → 一覧ページの <Pill>🗑️</Pill> ゴミ箱から復元。</li>
        </ul>
      </section>

      <div style={{ textAlign: "center", marginTop: "8px", marginBottom: "32px" }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            backgroundColor: T.accent,
            color: T.white,
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "700",
            fontSize: "14px",
          }}
        >
          ← 大会一覧へ戻る
        </Link>
      </div>
    </main>
  );
}
