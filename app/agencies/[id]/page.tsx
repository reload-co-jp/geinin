import Link from "next/link"
import { notFound } from "next/navigation"
import { agencyName, db } from "@/lib/db"
import { InArticleAd } from "@/components/in-article-ad"
import { Photo } from "@/components/photo"

type Props = { params: Promise<{ id: string }> }

const of = <T extends { agency_id: string | null; reading: string }>(
  xs: T[],
  id: string
) =>
  xs
    .filter((x) => x.agency_id === id)
    .toSorted((a, b) => a.reading.localeCompare(b.reading, "ja"))

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
      <InArticleAd />
      <section>
        <h2 className="section-title">芸人（{people.length}人）</h2>
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
    </div>
  )
}

export default Page
