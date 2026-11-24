import Link from "next/link"
import { notFound } from "next/navigation"
import { css, ESTIMATED_NOTE, Names, years } from "@/app/doki/shared"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"
import { Pager } from "@/components/pager"
import { extraPages, pageHref, pageSlice, pageTitle } from "@/lib/paging"

// 1ページに並べる芸人の数（2024年デビューは700人を超える）
export const DOKI_PAGE_SIZE = 300

const byYear = new Map(years)

export const dokiTotal = (year: string) => byYear.get(Number(year))?.length ?? 0

export const dokiExtraPages = () =>
  years.flatMap(([y, ps]) =>
    extraPages(ps.length, DOKI_PAGE_SIZE).map((n) => ({ year: String(y), n }))
  )

export const dokiMetadata = (year: string, page: number) => {
  const ps = byYear.get(Number(year))
  return ps
    ? {
        // 「2010年組」「〇〇 同期」のような検索語に合わせ、主な芸人名も添える
        title: pageTitle(
          `${year}年デビューの同期芸人一覧（${year}年組・${ps.length}人）`,
          page
        ),
        description: `${page > 1 ? `${page}ページ目。` : ""}${year}年にデビューしたお笑い芸人${ps.length}人の同期一覧。${pageSlice(
          ps,
          DOKI_PAGE_SIZE,
          page
        )
          .slice(0, 8)
          .map((p) => p.label)
          .join("・")}${ps.length > 8 ? "ほか" : ""}。出身養成所・期も掲載`,
        alternates: { canonical: pageHref(`/doki/${year}/`, page) },
      }
    : {}
}

export const DokiView = ({ year, page }: { year: string; page: number }) => {
  const y = Number(year)
  const ps = byYear.get(y)
  if (!ps) notFound()
  const i = years.findIndex(([v]) => v === y)
  const [prev, next] = [years[i - 1]?.[0], years[i + 1]?.[0]]
  const base = `/doki/${y}/`
  const pager = (
    <Pager base={base} page={page} total={ps.length} size={DOKI_PAGE_SIZE} />
  )
  return (
    <div className="page">
      <style>{css}</style>
      <Breadcrumbs
        items={[
          ["トップ", "/"],
          ["同期", "/doki/"],
          [`${y}年デビュー`, base],
          ...(page > 1
            ? ([[`${page}ページ目`, pageHref(base, page)]] as [
                string,
                string,
              ][])
            : []),
        ]}
      />
      <h1 className="page-title">
        {y}年デビューの芸人
        <span style={{ color: "var(--muted)", fontWeight: "normal" }}>
          {" "}
          {ps.length.toLocaleString()}人{page > 1 && `（${page}ページ目）`}
        </span>
      </h1>
      <p className="lead">
        賞レース成績や共演の多い順に並べています。名前の下は出身養成所と期です。
        {ESTIMATED_NOTE}
      </p>
      <InArticleAd />
      {pager}
      <Names ps={pageSlice(ps, DOKI_PAGE_SIZE, page)} />
      {pager}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: ".85rem",
        }}
      >
        {prev ? <Link href={`/doki/${prev}/`}>← {prev}年</Link> : <span />}
        {next && <Link href={`/doki/${next}/`}>{next}年 →</Link>}
      </nav>
    </div>
  )
}
