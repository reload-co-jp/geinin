import Link from "next/link"
import { notFound } from "next/navigation"
import { InArticleAd } from "@/components/in-article-ad"
import { JsonLd } from "@/components/json-ld"
import { Photo } from "@/components/photo"
import { graph, livesFetchedAt, today, venueBySlug, venues } from "@/lib/db"
import { nodeHref } from "@/lib/graph"

type Props = { params: Promise<{ slug: string }> }

const SITE = "https://geinin.reload.co.jp"
const SCHEDULE_SHOWN = 60
const REGULARS_SHOWN = 32
const CAST_SHOWN = 8

const weekday = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
  timeZone: "UTC",
})

export const generateStaticParams = () => venues.map((v) => ({ slug: v.slug }))

// 登録済みの芸人・コンビだけ（出演者欄の名前照合で拾えたもの）
const regularsOf = (slug: string) =>
  (venueBySlug.get(slug)?.regulars ?? []).flatMap((r) => {
    const n = graph.nodes.get(r.id)
    return n ? [{ ...r, node: n }] : []
  })

export const generateMetadata = async ({ params }: Props) => {
  const v = venueBySlug.get((await params).slug)
  if (!v) return {}
  const names = regularsOf(v.slug)
    .slice(0, 5)
    .map((r) => r.node.label)
  return {
    title: `${v.label}の出演芸人・公演スケジュール`,
    description: `${v.label}${v.prefecture ? `（${v.prefecture}）` : ""}に出演するお笑い芸人・コンビ（${names.join("・")}ほか）と今後の公演予定`,
    alternates: { canonical: `/venues/${v.slug}/` },
  }
}

const Page = async ({ params }: Props) => {
  const v = venueBySlug.get((await params).slug)
  if (!v) notFound()
  const upcoming = v.lives.filter((l) => l.date >= today)
  const regulars = regularsOf(v.slug)
  const nearby = venues.filter(
    (x) => x.slug !== v.slug && x.prefecture && x.prefecture === v.prefecture
  )
  return (
    <article className="nd">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            ["トップ", "/"],
            ["劇場", "/venues/"],
            [v.label, `/venues/${v.slug}/`],
          ].map(([name, href], i) => ({
            "@type": "ListItem",
            position: i + 1,
            name,
            item: `${SITE}${href}`,
          })),
        }}
      />
      <nav aria-label="パンくずリスト" style={{ fontSize: ".75rem" }}>
        <Link href="/">トップ</Link> › <Link href="/venues/">劇場</Link> ›{" "}
        {v.label}
      </nav>
      <p className="pf-muted pf-reading" style={{ marginTop: "1rem" }}>
        {v.prefecture ?? "劇場・ライブ会場"}
      </p>
      <h1 className="pf-name page-title">{v.label}</h1>
      <p className="pf-lead" style={{ marginTop: "1rem" }}>
        {v.label}
        {v.prefecture && `（${v.prefecture}）`}
        の公演情報{v.lives.length}
        件のうち、出演者が当サイトに登録されている芸人・コンビは
        {regulars.length}組。
        {regulars.length > 0 &&
          `出演が多いのは${regulars
            .slice(0, 3)
            .map((r) => r.node.label)
            .join("・")}。`}
      </p>
      {regulars.length > 0 && (
        <section className="pf-sec">
          <h2 className="pf-section">よく出演する芸人</h2>
          <ul className="pf-cast">
            {regulars.slice(0, REGULARS_SHOWN).map((r) => (
              <li key={r.id}>
                <Photo src={r.node.photo} size={64} />
                <span className="pf-cast-body">
                  <span className="pf-muted pf-small">
                    {r.id.startsWith("g:") ? "コンビ・グループ" : "芸人"}
                  </span>
                  <Link href={nodeHref(r.id)} style={{ fontWeight: "bold" }}>
                    {r.node.label}
                  </Link>
                  <span className="pf-muted pf-small">{r.count}公演</span>
                </span>
              </li>
            ))}
          </ul>
          {regulars.length > REGULARS_SHOWN && (
            <p className="pf-muted pf-small">
              ほか{regulars.length - REGULARS_SHOWN}組
            </p>
          )}
        </section>
      )}
      <InArticleAd />
      <section className="pf-sec">
        <h2 className="pf-section">今後の公演（{upcoming.length}件）</h2>
        {upcoming.length === 0 ? (
          <p className="pf-muted pf-small">
            {livesFetchedAt}時点の公演情報に、今後の公演は載っていません。
          </p>
        ) : (
          <ul className="pf-list">
            {upcoming.slice(0, SCHEDULE_SHOWN).map((l) => {
              const cast = l.cast.flatMap((id) => {
                const n = graph.nodes.get(id)
                return n ? [{ id, label: n.label }] : []
              })
              return (
                <li
                  key={`${l.url} ${l.date} ${l.start} ${l.title}`}
                  style={{ marginBottom: ".5rem" }}
                >
                  <span className="pf-muted">
                    {weekday.format(new Date(l.date))}
                    {l.start && ` ${l.start}`}
                  </span>{" "}
                  <a href={l.url} target="_blank" rel="noopener noreferrer">
                    {l.title}
                  </a>
                  {cast.length > 0 && (
                    <span className="pf-small" style={{ display: "block" }}>
                      出演:{" "}
                      {cast.slice(0, CAST_SHOWN).map((c, i) => (
                        <span key={c.id}>
                          {i > 0 && "・"}
                          <Link href={nodeHref(c.id)}>{c.label}</Link>
                        </span>
                      ))}
                      {cast.length > CAST_SHOWN &&
                        ` ほか${cast.length - CAST_SHOWN}組`}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <p className="pf-muted pf-small">
          {[...new Set(v.lives.map((l) => l.source))].join("・")}（
          {livesFetchedAt}時点）より。出演者は変更になる場合があります。
          {upcoming.length > SCHEDULE_SHOWN &&
            ` ほか${upcoming.length - SCHEDULE_SHOWN}件。`}
        </p>
      </section>
      {nearby.length > 0 && (
        <section className="pf-sec">
          <h2 className="pf-section">{v.prefecture}のほかの劇場</h2>
          <ul className="nd-chips">
            {nearby.map((x) => (
              <li key={x.slug}>
                <Link className="chip" href={`/venues/${x.slug}/`}>
                  {x.label}
                  <small>{x.lives.length}公演</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="nd-more">
        <Link href="/venues/">劇場一覧へ →</Link>
      </p>
    </article>
  )
}

export default Page
