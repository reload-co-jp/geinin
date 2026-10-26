import Link from "next/link"
import { notFound } from "next/navigation"
import { agencyName, db } from "@/lib/db"
import { InArticleAd } from "@/components/in-article-ad"

type Props = { params: Promise<{ id: string }> }

const of = <T extends { agency_id: string | null; reading: string }>(
  xs: T[],
  id: string
) =>
  xs
    .filter((x) => x.agency_id === id)
    .toSorted((a, b) => a.reading.localeCompare(b.reading, "ja"))

const listStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: ".25rem 1rem",
  listStyle: "none",
  padding: 0,
} as const

export const generateStaticParams = () => db.agencies.map((a) => ({ id: a.id }))

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params
  const name = agencyName(id)
  return name
    ? {
        title: `${name}所属の芸人・コンビ一覧`,
        description: `${name}に所属するお笑い芸人・コンビ・グループの一覧（${of(db.groups, id).length}組・${of(db.people, id).length}人）`,
        alternates: { canonical: `/agencies/${id}/` },
      }
    : {}
}

const Page = async ({ params }: Props) => {
  const { id } = await params
  const name = agencyName(id)
  if (!name) notFound()
  const groups = of(db.groups, id)
  const people = of(db.people, id)
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
      <p style={{ fontSize: ".85rem" }}>
        <Link href="/agencies/">← 事務所一覧</Link>
      </p>
      <h1 className="page-title">{name}所属の芸人・コンビ</h1>
      <section>
        <h2 className="section-title">グループ（{groups.length}組）</h2>
        <ul style={listStyle}>
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
      <InArticleAd />
      <section>
        <h2 className="section-title">芸人（{people.length}人）</h2>
        <ul style={listStyle}>
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/people/${p.id}/`}>{p.name}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default Page
