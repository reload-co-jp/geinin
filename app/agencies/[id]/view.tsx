import Link from "next/link"
import { notFound } from "next/navigation"
import {
  agencyIndexable,
  agencyListed,
  agencyName,
  db,
  edgeIndex,
} from "@/lib/db"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"
import { Photo } from "@/components/photo"
import { Pager } from "@/components/pager"
import { extraPages, pageHref, pageSlice, pageTitle } from "@/lib/paging"

const of = <T extends { agency_id: string | null; reading: string }>(
  xs: T[],
  id: string
) =>
  xs
    .filter((x) => x.agency_id === id)
    .toSorted((a, b) => a.reading.localeCompare(b.reading, "ja"))

// 関係（相方・師弟・共演・賞レースなど）の多い順に代表的な名前を挙げる
const notable = (id: string, n: number) =>
  [
    ...of(db.groups, id).map((g) => ({ key: `g:${g.id}`, name: g.name })),
    ...of(db.people, id).map((p) => ({ key: `p:${p.id}`, name: p.name })),
  ]
    .toSorted(
      (a, b) =>
        (edgeIndex.get(b.key)?.length ?? 0) -
        (edgeIndex.get(a.key)?.length ?? 0)
    )
    .slice(0, n)
    .map((x) => x.name)

// 検索に出す事務所ページは中身のある芸人・コンビだけを並べる。noindex の
// 事務所ページ（載せられる組が少ない）は、たどれるように全員を並べる
const listed = (id: string) => {
  const { groups, people } = agencyIndexable(id)
    ? agencyListed(id)
    : { groups: db.groups, people: db.people }
  return { groups: of(groups, id), people: of(people, id) }
}

// 1ページに並べる芸人・コンビの数（吉本興業は4,000組を超える）
export const AGENCY_PAGE_SIZE = 400

// グループ → 芸人の順に1列に並べてページで区切る
const entries = (id: string) => {
  const { groups, people } = listed(id)
  return [
    ...groups.map((g) => ({ kind: "g" as const, g })),
    ...people.map((p) => ({ kind: "p" as const, p })),
  ]
}

export const agencyExtraPages = () =>
  db.agencies.flatMap((a) =>
    extraPages(entries(a.id).length, AGENCY_PAGE_SIZE).map((n) => ({
      id: a.id,
      n,
    }))
  )

export const agencyTotal = (id: string) => entries(id).length

export const agencyMetadata = (id: string, page: number) => {
  const name = agencyName(id)
  return name
    ? {
        title: pageTitle(`${name}所属の芸人・コンビ一覧`, page),
        description: `${page > 1 ? `${page}ページ目。` : ""}${name}に所属するお笑い芸人・コンビ・グループの一覧（${of(db.groups, id).length}組・${of(db.people, id).length}人）。${notable(id, 6).join("・")}など`,
        alternates: { canonical: pageHref(`/agencies/${id}/`, page) },
        ...(!agencyIndexable(id) && {
          robots: { index: false, follow: true },
        }),
      }
    : {}
}

export const AgencyView = ({ id, page }: { id: string; page: number }) => {
  const name = agencyName(id)
  if (!name) notFound()
  const allGroups = of(db.groups, id).length
  const allPeople = of(db.people, id).length
  const all = entries(id)
  const shown = pageSlice(all, AGENCY_PAGE_SIZE, page)
  const groups = shown.flatMap((e) => (e.kind === "g" ? [e.g] : []))
  const people = shown.flatMap((e) => (e.kind === "p" ? [e.p] : []))
  const groupTotal = all.filter((e) => e.kind === "g").length
  const base = `/agencies/${id}/`
  const pager = (
    <Pager base={base} page={page} total={all.length} size={AGENCY_PAGE_SIZE} />
  )
  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        display: "grid",
        gap: "2rem",
        fontSize: ".875rem",
      }}
    >
      <Breadcrumbs
        items={[
          ["トップ", "/"],
          ["事務所", "/agencies/"],
          [name, base],
          ...(page > 1
            ? ([[`${page}ページ目`, pageHref(base, page)]] as [
                string,
                string,
              ][])
            : []),
        ]}
      />
      <h1 className="page-title">
        {name}所属の芸人・コンビ{page > 1 && `（${page}ページ目）`}
      </h1>
      {allGroups + allPeople > 0 && (
        <p className="lead">
          {name}
          に所属するお笑い芸人・コンビの一覧です（登録はグループ{allGroups}
          組・芸人
          {allPeople}人）。主な所属芸人は{notable(id, 6).join("・")}
          など。名前から相方・同期・賞レース成績などの詳細ページへ移動できます。
          {all.length < allGroups + allPeople &&
            "M-1グランプリのエントリー情報しか登録のない芸人・コンビは一覧に載せていません。"}
        </p>
      )}
      {pager}
      {groups.length > 0 && (
        <section>
          <h2 className="section-title">グループ（{groupTotal}組）</h2>
          <ul className="pf-cast">
            {groups.map((g) => (
              <li key={g.id}>
                <Photo src={g.photo_url} size={64} />
                <span className="pf-cast-body">
                  <Link href={`/groups/${g.id}/`}>{g.name}</Link>
                  {g.dissolution_date && (
                    <span className="pf-muted pf-small">
                      {g.dissolution_date}解散
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <InArticleAd />
      {people.length > 0 && (
        <section>
          <h2 className="section-title">芸人（{all.length - groupTotal}人）</h2>
          <ul className="pf-cast">
            {people.map((p) => (
              <li key={p.id}>
                <Photo src={p.photo_url} size={64} />
                <span className="pf-cast-body">
                  <Link href={`/people/${p.id}/`}>{p.name}</Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {pager}
    </div>
  )
}
