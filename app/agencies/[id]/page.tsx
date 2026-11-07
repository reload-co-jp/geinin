import Link from "next/link"
import { notFound } from "next/navigation"
import { agencyName, db, edgeIndex } from "@/lib/db"
import { Breadcrumbs } from "@/components/breadcrumbs"
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

export const generateStaticParams = () => db.agencies.map((a) => ({ id: a.id }))

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params
  const name = agencyName(id)
  return name
    ? {
        title: `${name}所属の芸人・コンビ一覧`,
        description: `${name}に所属するお笑い芸人・コンビ・グループの一覧（${of(db.groups, id).length}組・${of(db.people, id).length}人）。${notable(id, 6).join("・")}など`,
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
      <Breadcrumbs
        items={[
          ["トップ", "/"],
          ["事務所", "/agencies/"],
          [name, `/agencies/${id}/`],
        ]}
      />
      <h1 className="page-title">{name}所属の芸人・コンビ</h1>
      {groups.length + people.length > 0 && (
        <p className="lead">
          {name}
          に所属するお笑い芸人・コンビの一覧です（グループ{groups.length}
          組・芸人
          {people.length}人）。主な所属芸人は{notable(id, 6).join("・")}
          など。名前から相方・同期・賞レース成績などの詳細ページへ移動できます。
        </p>
      )}
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
