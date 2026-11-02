import Link from "next/link"
import { notFound } from "next/navigation"
import { InArticleAd } from "@/components/in-article-ad"
import { Photo } from "@/components/photo"
import { m1Prelims } from "@/lib/db"
import { nodeHref } from "@/lib/graph"
import { STAGE_SLUGS } from "@/lib/m1"
import {
  entrantsOf,
  prelimYears,
  stageBySlug,
  stagesOf,
  type Entrant,
} from "../../shared"

type Props = { params: Promise<{ year: string; stage: string }> }

export const generateStaticParams = () =>
  prelimYears.flatMap((y) =>
    stagesOf(y).map((s) => ({ year: String(y), stage: STAGE_SLUGS[s] }))
  )

export const generateMetadata = async ({ params }: Props) => {
  const { year, stage } = await params
  const s = stageBySlug(stage)
  if (!s) return {}
  const es = entrantsOf(Number(year), s)
  return {
    title: `M-1グランプリ${year} ${s}の出場コンビ・日程・会場`,
    description: `M-1グランプリ${year} ${s}に出場したコンビ${es.length}組（${es
      .filter((e) => e.nodeId)
      .slice(0, 5)
      .map((e) => e.name)
      .join("・")}ほか）の一覧。日程・会場別`,
    alternates: { canonical: `/m1/${year}/${stage}/` },
  }
}

const weekday = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
  timeZone: "UTC",
})

const Name = ({ e }: { e: Entrant }) =>
  e.nodeId ? <Link href={nodeHref(e.nodeId)}>{e.name}</Link> : <>{e.name}</>

const Page = async ({ params }: Props) => {
  const { year, stage } = await params
  const y = Number(year)
  const s = stageBySlug(stage)
  if (!s || !stagesOf(y).includes(s)) notFound()
  const es = entrantsOf(y, s)
  // 日程・会場の分かる組は会場ごと、分からない組は最後にまとめる
  const heats = [
    ...Map.groupBy(
      es.toSorted(
        (a, b) =>
          (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
          (a.venue ?? "").localeCompare(b.venue ?? "")
      ),
      (e) => (e.date ? `${e.date} ${e.venue ?? ""}` : "")
    ),
  ]
  const featured = es.filter((e) => e.nodeId && e.photo).slice(0, 24)
  const others = stagesOf(y).filter((x) => x !== s)
  return (
    <div
      style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: "1rem" }}
    >
      <p style={{ fontSize: ".75rem" }}>
        <Link href="/">トップ</Link> › <Link href="/races/">賞レース</Link> ›{" "}
        <Link href={`/m1/${y}/`}>M-1グランプリ{y} 予選</Link> › {s}
      </p>
      <h1 className="page-title">
        M-1グランプリ{y} {s}（{es.length}組）
      </h1>
      <p style={{ fontSize: ".85rem", color: "var(--muted)" }}>
        M-1グランプリ公式サイトのエントリー一覧（プロ、{m1Prelims.fetched_at}
        時点）より、{s}
        に出場（予定を含む）したコンビ。当サイトに登録のあるコンビは詳細ページへリンクしています。
      </p>
      <ul className="nd-chips">
        {others.map((x) => (
          <li key={x}>
            <Link className="chip" href={`/m1/${y}/${STAGE_SLUGS[x]}/`}>
              {x}
            </Link>
          </li>
        ))}
      </ul>
      {featured.length > 0 && (
        <section>
          <h2 className="pf-section">注目の出場コンビ</h2>
          <ul className="pf-cast">
            {featured.map((e) => (
              <li key={e.url}>
                <Photo src={e.photo} size={56} />
                <span className="pf-cast-body">
                  <Name e={e} />
                  {e.date && (
                    <span className="pf-muted pf-small">
                      {weekday.format(new Date(e.date))} {e.venue}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <InArticleAd />
      {heats.map(([k, hs]) => (
        <section key={k || "unknown"}>
          <h2 className="pf-section">
            {k
              ? `${weekday.format(new Date(hs[0].date!))} ${hs[0].venue ?? ""}`
              : "日程・会場の掲載なし"}
            <small className="pf-muted"> {hs.length}組</small>
          </h2>
          <p style={{ fontSize: ".85rem", lineHeight: 1.9 }}>
            {hs.map((e, i) => (
              <span key={e.url}>
                {i > 0 && " ／ "}
                <Name e={e} />
              </span>
            ))}
          </p>
        </section>
      ))}
    </div>
  )
}

export default Page
