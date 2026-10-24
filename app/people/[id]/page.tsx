import { notFound } from "next/navigation"
import { NodeDetail } from "@/components/node-detail"
import { JsonLd } from "@/components/json-ld"
import { agencyName, db, groupById, personById } from "@/lib/db"

type Props = { params: Promise<{ id: string }> }

export const generateStaticParams = () => db.people.map((p) => ({ id: p.id }))

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params
  const p = personById.get(id)
  return p
    ? {
        title: `${p.name}（${p.reading}）`,
        description: `${p.name}の師弟・同期・コンビ・共演などの関係性`,
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
