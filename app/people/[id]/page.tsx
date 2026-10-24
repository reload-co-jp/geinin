import { notFound } from "next/navigation"
import { NodeDetail } from "@/components/node-detail"
import { JsonLd } from "@/components/json-ld"
import { agencyName, db, groupById, personById, sameName } from "@/lib/db"

type Props = { params: Promise<{ id: string }> }

export const generateStaticParams = () => db.people.map((p) => ({ id: p.id }))

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params
  const p = personById.get(id)
  return p
    ? {
        // 同名の登録があるときは事務所を添えて区別する
        title: `${p.name}（${p.reading}）${sameName(`p:${id}`).length && agencyName(p.agency_id) ? ` - ${agencyName(p.agency_id)}` : ""}`,
        description: [
          `${p.name}（${p.reading}）`,
          agencyName(p.agency_id),
          db.memberships
            .filter((m) => m.person_id === id)
            .map((m) => groupById.get(m.group_id)?.name)
            .join("・") || null,
        ]
          .filter(Boolean)
          .join(" / ")
          .concat("。所属コンビ・師弟・同期・共演などの関係と賞レース成績"),
        alternates: { canonical: `/people/${id}/` },
      }
    : {}
}

const Page = async ({ params }: Props) => {
  const { id } = await params
  const p = personById.get(id)
  if (!p) notFound()
  const agency = agencyName(p.agency_id)
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: p.name,
          alternateName: [p.reading, ...p.aliases],
          url: `https://geinin.reload.co.jp/people/${id}/`,
          image: p.photo_url
            ? new URL(p.photo_url, "https://geinin.reload.co.jp").href
            : undefined,
          description: p.biography ?? undefined,
          worksFor: agency
            ? { "@type": "Organization", name: agency }
            : undefined,
          memberOf: db.memberships
            .filter((m) => m.person_id === id)
            .map((m) => ({
              "@type": "PerformingGroup",
              name: groupById.get(m.group_id)?.name,
              url: `https://geinin.reload.co.jp/groups/${m.group_id}/`,
            })),
        }}
      />
      <NodeDetail nodeId={`p:${id}`} />
    </>
  )
}

export default Page
