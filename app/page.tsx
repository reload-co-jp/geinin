import Link from "next/link"
import { FC } from "react"
import { SearchBox } from "@/components/search-box"
import { db } from "@/lib/db"
import { graphHref } from "@/lib/graph"

const entries = [
  {
    title: "師匠から弟子へ",
    text: "深見千三郎 → ビートたけし → たけし軍団",
    href: graphHref("p:fukami", "&depth=3&kinds=master"),
  },
  {
    title: "同期でつながる",
    text: "NSC大阪1期: ダウンタウン・トミーズ・ハイヒール",
    href: graphHref("p:matsumoto", "&kinds=doki,member"),
  },
  {
    title: "コンビの変遷",
    text: "アルファルファ・プラスドライバー → 東京03",
    href: graphHref("g:tokyo03", "&kinds=member,former_member"),
  },
  {
    title: "賞レースで競演",
    text: "M-1 2008 決勝: NON STYLE・オードリー・ナイツ",
    href: graphHref("g:nonstyle", "&kinds=competition,member"),
  },
  {
    title: "共演から広がる",
    text: "明石家さんま × ビートたけし（ひょうきん族）",
    href: graphHref("p:sanma", "&depth=3"),
  },
  {
    title: "解散したコンビ",
    text: "猿岩石 → 有吉弘行、師匠オール巨人へ",
    href: graphHref("g:saruganseki", "&depth=3"),
  },
]

const Page: FC = () => (
  <div
    style={{
      maxWidth: 880,
      margin: "0 auto",
      display: "grid",
      gap: "2rem",
      padding: "1rem 0",
    }}
  >
    <section style={{ display: "grid", gap: "1rem" }}>
      <h2 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", lineHeight: 1.3 }}>
        芸人から、芸人へ。関係性をたどる。
      </h2>
      <p style={{ color: "var(--muted)" }}>
        誰が誰の師匠で、誰と同期で、どのコンビを経て今に至るのか。師弟・同期・コンビ変遷・共演・賞レースのつながりをネットワークグラフで探索できます。
      </p>
      <SearchBox />
    </section>
    <section>
      <h2 style={{ fontSize: "1.1rem", marginBottom: ".75rem" }}>探索の入口</h2>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          borderTop: "1px solid var(--line)",
        }}
      >
        {entries.map((e) => (
          <li
            key={e.title}
            style={{
              borderBottom: "1px solid var(--line)",
              padding: ".75rem .25rem",
            }}
          >
            <Link href={e.href} style={{ fontWeight: "bold" }}>
              {e.title} →
            </Link>
            <p style={{ fontSize: ".85rem", color: "var(--muted)" }}>
              {e.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
    <section>
      <h2 style={{ fontSize: "1.1rem", marginBottom: ".5rem" }}>登録データ</h2>
      <p style={{ fontSize: ".9rem" }}>
        芸人 {db.people.length}人 / グループ {db.groups.length}組 / 関係{" "}
        {db.relationships.length + db.memberships.length}件 / 賞レース結果{" "}
        {db.competitionResults.length}件 — <Link href="/list/">一覧で見る</Link>
      </p>
    </section>
  </div>
)

export default Page
