import { notFound } from "next/navigation"
import { NodeDetail } from "@/components/node-detail"
import { JsonLd } from "@/components/json-ld"
import { xUrl } from "@/lib/x"
import { personMeta } from "@/lib/meta"
import {
  agencyName,
  db,
  groupById,
  isNoindex,
  nodeInfo,
  ownUrls,
  xOf,
  personById,
} from "@/lib/db"

type Props = { params: Promise<{ id: string }> }

export const generateStaticParams = () => db.people.map((p) => ({ id: p.id }))

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params
  const meta = personMeta(id)
  return meta
    ? {
        ...meta,
        alternates: { canonical: `/people/${id}/` },
        ...(isNoindex(`p:${id}`) && { robots: { index: false, follow: true } }),
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
          jobTitle: "お笑い芸人",
          // 年まで・月までの部分日付は schema.org の Date にならないので出さない
          birthDate:
            p.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(p.birth_date)
              ? p.birth_date
              : undefined,
          alumniOf: p.training_school
            ? { "@type": "EducationalOrganization", name: p.training_school }
            : undefined,
          sameAs: [
            ...ownUrls(p.source_ids),
            ...xOf(p.source_ids, true).map((a) => xUrl(a.handle)),
          ],
          url: `https://geinin.reload.co.jp/people/${id}/`,
          image: p.photo_url
            ? new URL(p.photo_url, "https://geinin.reload.co.jp").href
            : undefined,
          description: nodeInfo(`p:${id}`)?.biography ?? undefined,
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
