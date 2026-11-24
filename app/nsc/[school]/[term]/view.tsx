import Link from "next/link"
import { notFound } from "next/navigation"
import {
  indexedTerms,
  neighbors,
  sameYearTerms,
  termOf,
  terms,
  TERM_MIN_INDEXED,
} from "@/app/nsc/shared"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"
import { JsonLd } from "@/components/json-ld"
import { Photo } from "@/components/photo"
import { years } from "@/app/doki/shared"
import { nodeHref } from "@/lib/graph"
import { Pager } from "@/components/pager"
import { extraPages, pageHref, pageSlice, pageTitle } from "@/lib/paging"

const SITE = "https://geinin.reload.co.jp"

// 1ページに並べる芸人の数（東京校の近年の期は300人を超える）
export const TERM_PAGE_SIZE = 200

export const termTotal = (school: string, term: string) =>
  termOf(school, Number(term))?.members.length ?? 0

export const termExtraPages = () =>
  terms.flatMap((t) =>
    extraPages(t.members.length, TERM_PAGE_SIZE).map((n) => ({
      school: t.slug,
      term: String(t.term),
      n,
    }))
  )

export const termMetadata = (school: string, term: string, page: number) => {
  const t = termOf(school, Number(term))
  if (!t) return {}
  const names = pageSlice(t.members, TERM_PAGE_SIZE, page)
    .slice(0, 6)
    .map((m) => m.name)
  return {
    title: pageTitle(
      `${t.label}の芸人一覧｜同期の芸人・コンビ${t.members.length}人`,
      page
    ),
    description: `${page > 1 ? `${page}ページ目。` : ""}${t.label}${t.year ? `（${t.year}年${t.yearEstimated ? "ごろ" : ""}入学）` : ""}出身のお笑い芸人${t.members.length}人の一覧。${names.join("・")}${t.members.length > names.length ? "ほか" : ""}。${
      t.inTerm.length
        ? `同期どうしで組んだ${t.inTerm
            .slice(0, 3)
            .map((g) => g.name)
            .join("・")}なども掲載。`
        : ""
    }`,
    alternates: { canonical: pageHref(t.href, page) },
    ...(t.members.length < TERM_MIN_INDEXED && {
      robots: { index: false, follow: true },
    }),
  }
}

export const TermView = ({
  school,
  term,
  page,
}: {
  school: string
  term: string
  page: number
}) => {
  const t = termOf(school, Number(term))
  if (!t) notFound()
  const members = pageSlice(t.members, TERM_PAGE_SIZE, page)
  const offset = (page - 1) * TERM_PAGE_SIZE
  const pager = (
    <Pager
      base={t.href}
      page={page}
      total={t.members.length}
      size={TERM_PAGE_SIZE}
    />
  )
  const { prev, next } = neighbors(t)
  const others = sameYearTerms(t).filter((x) => indexedTerms.includes(x))
  // デビュー年の同期ページ（/doki/<年>/）は卒業年（入学の翌年）でまとめている
  const dokiYear =
    t.year && years.some(([y]) => y === t.year! + 1) ? t.year + 1 : null
  return (
    <div className="page">
      <style>{css}</style>
      <Breadcrumbs
        items={[
          ["トップ", "/"],
          ["同期", "/doki/"],
          ["NSCの期別一覧", "/nsc/"],
          [t.label, t.href],
          ...(page > 1
            ? ([[`${page}ページ目`, pageHref(t.href, page)]] as [
                string,
                string,
              ][])
            : []),
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${t.label}の芸人`,
          numberOfItems: t.members.length,
          itemListElement: members.map((m, i) => ({
            "@type": "ListItem",
            position: offset + i + 1,
            name: m.name,
            url: `${SITE}${nodeHref(`p:${m.id}`)}`,
          })),
        }}
      />
      <h1 className="page-title">
        {t.label}の芸人
        <span style={{ color: "var(--muted)", fontWeight: "normal" }}>
          {" "}
          {t.members.length}人{page > 1 && `（${page}ページ目）`}
        </span>
      </h1>
      <p className="lead">
        吉本総合芸能学院（NSC）{t.school.replace("NSC", "")}校の{t.term}
        期生として、吉本興業の公式プロフィールまたは Wikipedia
        に記載のある芸人です。
        {t.year &&
          (t.yearEstimated
            ? `入学年は期生のデビュー年から推定すると${t.year}年ごろです。`
            : `${t.year}年入学の期です（Wikipedia「吉本総合芸能学院」の表による）。`)}
        同じ年にデビューしただけの芸人は含めていません。賞レースの成績が良い順に並べています。
      </p>
      {pager}
      <ul className="nsc-members">
        {members.map((m) => (
          <li key={m.id}>
            <Photo src={m.photo} size={48} />
            <span>
              <Link href={nodeHref(`p:${m.id}`)} className="nsc-name">
                {m.name}
              </Link>
              {m.groups.length > 0 && (
                <small>
                  {m.groups.map((g, i) => (
                    <span key={g.id}>
                      {i > 0 && "・"}
                      {g.former && "元"}
                      <Link href={nodeHref(`g:${g.id}`)}>{g.name}</Link>
                    </span>
                  ))}
                </small>
              )}
              {m.best && <small>{m.best}</small>}
            </span>
          </li>
        ))}
      </ul>
      {pager}
      {t.inTerm.length > 0 && (
        <section>
          <h2 className="nsc-h2">
            {t.label}の同期どうしで組んだコンビ・グループ
          </h2>
          <ul className="nd-chips">
            {t.inTerm.map((g) => (
              <li key={g.id}>
                <Link className="chip" href={nodeHref(`g:${g.id}`)}>
                  {g.name}
                  {g.dissolution_date && <small>解散</small>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <InArticleAd />
      {(others.length > 0 || dokiYear) && (
        <section>
          <h2 className="nsc-h2">
            {t.year}年{t.yearEstimated && "ごろ"}入学の同期
          </h2>
          <ul className="nd-chips">
            {others.map((x) => (
              <li key={x.href}>
                <Link className="chip" href={x.href}>
                  {x.label}
                  <small>{x.members.length}人</small>
                </Link>
              </li>
            ))}
            {dokiYear && (
              <li>
                <Link className="chip" href={`/doki/${dokiYear}/`}>
                  {dokiYear}年デビューの芸人
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}
      <nav
        aria-label="前後の期"
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: ".85rem",
          marginTop: "1rem",
        }}
      >
        {prev ? <Link href={prev.href}>← {prev.label}</Link> : <span />}
        {next && <Link href={next.href}>{next.label} →</Link>}
      </nav>
    </div>
  )
}

const css = `
.nsc-members { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: .5rem; margin: 1rem 0; }
.nsc-members li { display: flex; gap: .5rem; align-items: center; }
.nsc-members li > span { min-width: 0; overflow-wrap: anywhere; }
.nsc-name { font-weight: bold; }
.nsc-members small { display: block; color: var(--muted); font-size: .75rem; }
.nsc-h2 { font-size: 1rem; margin: 1.5rem 0 .5rem; }
`
