import Link from "next/link"
import { notFound } from "next/navigation"
import { agencyName, db, edgeIndex, graph } from "@/lib/db"
import { linksOf } from "@/lib/graph"
import { KanaNav } from "../nav"
import { OTHER, ROWS, rowOf, tableCss } from "../shared"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"
import { Pager } from "@/components/pager"
import { extraPages, pageHref, pageSlice, pageTitle } from "@/lib/paging"

const rows = [...ROWS, OTHER]
const byReading = <T extends { reading: string }>(xs: T[], row: string) =>
  xs
    .filter((x) => rowOf(x.reading) === row)
    .toSorted((a, b) => a.reading.localeCompare(b.reading, "ja"))

// 1ページに並べる芸人・コンビの数（あ行は3,000件を超える）
export const LIST_PAGE_SIZE = 500

// グループ → 芸人の順に1列に並べてページで区切る
const entriesCache = new Map<
  string,
  (
    | { kind: "g"; g: (typeof db.groups)[number] }
    | { kind: "p"; p: (typeof db.people)[number] }
  )[]
>()
const entries = (row: string) => {
  let es = entriesCache.get(row)
  if (!es) {
    es = [
      ...byReading(db.groups, row).map((g) => ({ kind: "g" as const, g })),
      ...byReading(db.people, row).map((p) => ({ kind: "p" as const, p })),
    ]
    entriesCache.set(row, es)
  }
  return es
}

export const listRows = rows
export const listTotal = (row: string) => entries(row).length
export const listExtraPages = () =>
  rows.flatMap((r) =>
    extraPages(entries(r.slug).length, LIST_PAGE_SIZE).map((n) => ({
      row: r.slug,
      n,
    }))
  )

export const listMetadata = (row: string, page: number) => {
  const label = rows.find((r) => r.slug === row)?.label
  return {
    title: pageTitle(`芸人・コンビ一覧（${label}）`, page),
    description: `${page > 1 ? `${page}ページ目。` : ""}読みが${label}の芸人・コンビ・グループの一覧`,
    alternates: { canonical: pageHref(`/list/${row}/`, page) },
  }
}

export const ListView = ({ row, page }: { row: string; page: number }) => {
  const current = rows.find((r) => r.slug === row)
  if (!current) notFound()
  const all = entries(row)
  const shown = pageSlice(all, LIST_PAGE_SIZE, page)
  const groups = shown.flatMap((e) => (e.kind === "g" ? [e.g] : []))
  const people = shown.flatMap((e) => (e.kind === "p" ? [e.p] : []))
  const groupTotal = all.filter((e) => e.kind === "g").length
  const base = `/list/${row}/`
  const pager = (
    <Pager base={base} page={page} total={all.length} size={LIST_PAGE_SIZE} />
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
          ["一覧", "/list/"],
          [current.label, base],
          ...(page > 1
            ? ([[`${page}ページ目`, pageHref(base, page)]] as [
                string,
                string,
              ][])
            : []),
        ]}
      />
      <h1 className="page-title">
        芸人・コンビ一覧（{current.label}
        {page > 1 && `・${page}ページ目`}）
      </h1>
      <KanaNav current={row} />
      {pager}
      {groups.length > 0 && (
        <section>
          <h2 className="section-title">
            グループ（{current.label}・{groupTotal}組）
          </h2>
          <ul
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: ".25rem 1rem",
              listStyle: "none",
              padding: 0,
            }}
          >
            {groups.map((g) => (
              <li key={g.id}>
                <Link href={`/groups/${g.id}/`}>{g.name}</Link>
                {g.dissolution_date && (
                  <span style={{ color: "var(--muted)" }}>
                    （{g.dissolution_date}解散）
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <InArticleAd />
      {people.length > 0 && (
        <section>
          <h2 className="section-title">
            芸人（{current.label}・{all.length - groupTotal}人）
          </h2>
          <div style={{ overflowX: "auto" }}>
            <style>{tableCss}</style>
            <table
              className="stack-table lt"
              style={{
                borderCollapse: "collapse",
                width: "100%",
                background: "var(--surface)",
              }}
            >
              <thead>
                <tr>
                  <th>芸名</th>
                  <th>所属グループ</th>
                  <th>事務所</th>
                  <th>養成所</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td data-label="芸名">
                      <Link href={`/people/${p.id}/`}>{p.name}</Link>
                    </td>
                    <td data-label="所属グループ">
                      {linksOf(edgeIndex, `p:${p.id}`)
                        .filter(
                          (l) =>
                            l.edge.kind === "member" ||
                            l.edge.kind === "former_member"
                        )
                        .map(
                          (l) =>
                            `${graph.nodes.get(l.other)?.label}${l.edge.kind === "former_member" ? "（元）" : ""}`
                        )
                        .join("、")}
                    </td>
                    <td data-label="事務所">{agencyName(p.agency_id)}</td>
                    <td data-label="養成所">
                      {p.training_school &&
                        `${p.training_school} ${p.training_school_term ?? "?"}期`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {pager}
    </div>
  )
}
