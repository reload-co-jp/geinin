import Link from "next/link"
import { notFound } from "next/navigation"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"
import { db, graph, m1Prelims } from "@/lib/db"
import { nodeHref, raceId } from "@/lib/graph"
import { STAGE_SLUGS } from "@/lib/m1"
import { Heat } from "../heats"
import { entrantsOf, prelimYears, stagesOf } from "../shared"

type Props = { params: Promise<{ year: string }> }

// その年の決勝の順位。決勝ページへのリンクと、予選から決勝までの流れを1ページで見せる
const finalsOf = (year: number) =>
  db.competitionResults
    .filter(
      (r) =>
        r.competition_name === "M-1グランプリ" &&
        r.stage === "決勝" &&
        r.year === year
    )
    .toSorted((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .map((r) => ({
      rank: r.rank,
      nodeId: r.entrant_id,
      name: graph.nodes.get(r.entrant_id)?.label ?? "",
    }))

export const generateStaticParams = () =>
  prelimYears.map((y) => ({ year: String(y) }))

export const generateMetadata = async ({ params }: Props) => {
  const { year } = await params
  return {
    title: `M-1グランプリ${year} 予選の結果・出場コンビ`,
    description: `M-1グランプリ${year}の予選（${stagesOf(Number(year)).join("・")}）に出場したコンビの一覧と日程・会場`,
    alternates: { canonical: `/m1/${year}/` },
  }
}

const Page = async ({ params }: Props) => {
  const y = Number((await params).year)
  if (!prelimYears.includes(y)) notFound()
  const stages = stagesOf(y)
  const finals = finalsOf(y)
  const semi = stages.includes("準決勝") ? entrantsOf(y, "準決勝") : []
  const counts = stages.map((s) => [s, entrantsOf(y, s).length] as const)
  return (
    <div
      style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: "1rem" }}
    >
      <Breadcrumbs
        items={[
          ["トップ", "/"],
          ["賞レース", "/races/"],
          ["M-1グランプリ", "/races/m1/"],
          [`M-1グランプリ${y} 予選`, `/m1/${y}/`],
        ]}
      />
      <h1 className="page-title">M-1グランプリ{y} 予選</h1>
      <p style={{ fontSize: ".85rem", color: "var(--muted)" }}>
        M-1グランプリ公式サイトのエントリー一覧（プロ、{m1Prelims.fetched_at}
        時点）より。回戦ごとに、出場（予定を含む）したコンビを日程・会場別にまとめています。
      </p>
      <ul className="nd-chips">
        {stages.toReversed().map((s) => (
          <li key={s}>
            <Link className="chip" href={`/m1/${y}/${STAGE_SLUGS[s]}/`}>
              {s}
              <small>{entrantsOf(y, s).length}組</small>
            </Link>
          </li>
        ))}
      </ul>
      <p>
        M-1グランプリ{y}の予選には
        {counts.map(([s, n], i) => (
          <span key={s}>
            {i > 0 && "、"}
            {s}に{n}組
          </span>
        ))}
        が出場しました。
        {finals.length > 0 &&
          `決勝には${finals.length}組が進出し、${finals[0].rank === 1 ? `${finals[0].name}が優勝` : `${finals.map((f) => f.name).join("・")}が出場`}しました。`}
      </p>
      {finals.length > 0 && (
        <section>
          <h2 className="pf-section">決勝の結果</h2>
          <ol style={{ fontSize: ".85rem", paddingLeft: "1.5rem" }}>
            {finals.map((f) => (
              <li key={f.nodeId}>
                {f.rank ? `${f.rank}位 ` : ""}
                <Link href={nodeHref(f.nodeId)}>{f.name}</Link>
              </li>
            ))}
          </ol>
          <p style={{ fontSize: ".85rem" }}>
            <Link href={nodeHref(raceId("M-1グランプリ", y))}>
              M-1グランプリ{y} 決勝の詳細 →
            </Link>
          </p>
        </section>
      )}
      {semi.length > 0 && <Heat title="準決勝進出" entrants={semi} />}
      <InArticleAd />
      {prelimYears.length > 1 && (
        <p style={{ fontSize: ".85rem" }}>
          ほかの年:{" "}
          {prelimYears
            .filter((x) => x !== y)
            .map((x, i) => (
              <span key={x}>
                {i > 0 && "・"}
                <Link href={`/m1/${x}/`}>{x}</Link>
              </span>
            ))}
        </p>
      )}
    </div>
  )
}

export default Page
