import Link from "next/link"
import { notFound } from "next/navigation"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"
import { Photo } from "@/components/photo"
import { edgeIndex, m1Prelims } from "@/lib/db"
import { STAGE_SLUGS } from "@/lib/m1"
import { Heat, Name } from "../../heats"
import {
  daysOf,
  entrantsOf,
  passersOf,
  prelimYears,
  SPLIT_AT,
  stageBySlug,
  stagesOf,
  venuesOfDay,
  weekday,
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
  // 次の回戦の記録があれば「結果・通過者」として出す（「M-1 3回戦 結果」の検索向け）
  const pass = passersOf(Number(year), s)
  const passed = pass ? es.filter((e) => pass.urls.has(e.url)) : []
  // 関係の多い（よく知られた）コンビから挙げる
  const names = (xs: typeof es) =>
    xs
      .filter((e) => e.nodeId)
      .toSorted(
        (a, b) =>
          (edgeIndex.get(b.nodeId!)?.length ?? 0) -
          (edgeIndex.get(a.nodeId!)?.length ?? 0)
      )
      .slice(0, 5)
      .map((e) => e.name)
      .join("・")
  return {
    title: pass
      ? `M-1グランプリ${year} ${s}の結果・通過者（${passed.length}組）・日程・会場`
      : `M-1グランプリ${year} ${s}の出場コンビ・日程・会場`,
    description: pass
      ? `M-1グランプリ${year} ${s}の結果。出場${es.length}組のうち${passed.length}組が${pass.next}に進出（${names(passed)}ほか）。日程・会場別の出場コンビ一覧`
      : `M-1グランプリ${year} ${s}に出場したコンビ${es.length}組（${names(es)}ほか）の一覧。日程・会場別`,
    alternates: { canonical: `/m1/${year}/${stage}/` },
  }
}

const Page = async ({ params }: Props) => {
  const { year, stage } = await params
  const y = Number(year)
  const s = stageBySlug(stage)
  if (!s || !stagesOf(y).includes(s)) notFound()
  const es = entrantsOf(y, s)
  const days = daysOf(es)
  // 多い回戦は日程ごとのページへのリンクだけを並べる
  const split = es.length > SPLIT_AT
  const featured = es.filter((e) => e.nodeId && e.photo).slice(0, 24)
  const others = stagesOf(y).filter((x) => x !== s)
  const pass = passersOf(y, s)
  const passed = pass ? es.filter((e) => pass.urls.has(e.url)) : []
  return (
    <div
      style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: "1rem" }}
    >
      <Breadcrumbs
        items={[
          ["トップ", "/"],
          ["賞レース", "/races/"],
          ["M-1グランプリ", "/races/m1/"],
          [`M-1グランプリ${y} 予選`, `/m1/${y}/`],
          [s, `/m1/${y}/${stage}/`],
        ]}
      />
      <h1 className="page-title">
        M-1グランプリ{y} {s}
        {pass ? "の結果" : ""}（{es.length}組）
      </h1>
      <p style={{ fontSize: ".85rem", color: "var(--muted)" }}>
        M-1グランプリ公式サイトのエントリー一覧（プロ、{m1Prelims.fetched_at}
        時点）より、{s}
        に出場（予定を含む）したコンビ。当サイトに登録のあるコンビは詳細ページへリンクしています。
      </p>
      {pass && (
        <p>
          出場{es.length}組のうち
          <strong>{passed.length}組</strong>が
          <Link href={`/m1/${y}/${STAGE_SLUGS[pass.next]}/`}>{pass.next}</Link>
          に進出しました。
        </p>
      )}
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
      {pass && (
        <Heat title={`${pass.next}進出（${s}通過）`} entrants={passed} />
      )}
      {split ? (
        <section>
          <h2 className="pf-section">日程別の出場コンビ</h2>
          <ul className="m1-days">
            {days.map((d) => (
              <li key={d.slug}>
                <Link href={`/m1/${y}/${stage}/${d.slug}/`}>{d.label}</Link>
                <span className="pf-muted pf-small">
                  {" "}
                  {venuesOfDay(d.entrants)
                    .map(([v]) => v)
                    .filter(Boolean)
                    .join("・")}{" "}
                  {d.entrants.length}組
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        days.flatMap((d) =>
          venuesOfDay(d.entrants).map(([v, hs]) => (
            <Heat
              key={`${d.slug}-${v}`}
              title={d.date ? `${d.label} ${v}` : d.label}
              entrants={hs}
            />
          ))
        )
      )}
    </div>
  )
}

export default Page
