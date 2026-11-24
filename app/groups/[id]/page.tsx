import { notFound } from "next/navigation"
import { NodeDetail } from "@/components/node-detail"
import { JsonLd } from "@/components/json-ld"
import { xUrl } from "@/lib/x"
import { groupMeta } from "@/lib/meta"
import {
  agencyName,
  db,
  groupById,
  isNoindex,
  ownUrls,
  xOf,
  personById,
} from "@/lib/db"

type Props = { params: Promise<{ id: string }> }

export const generateStaticParams = () => db.groups.map((g) => ({ id: g.id }))

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params
  const meta = groupMeta(id)
  return meta
    ? {
        ...meta,
        alternates: { canonical: `/groups/${id}/` },
        ...(isNoindex(`g:${id}`) && { robots: { index: false, follow: true } }),
      }
    : {}
}

const Page = async ({ params }: Props) => {
  const { id } = await params
  const g = groupById.get(id)
  if (!g) notFound()
  const agency = agencyName(g.agency_id)
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "PerformingGroup",
          name: g.name,
          alternateName: [g.reading, ...g.aliases],
          sameAs: [
            ...ownUrls(g.source_ids),
            ...xOf(g.source_ids, false).map((a) => xUrl(a.handle)),
          ],
          url: `https://geinin.reload.co.jp/groups/${id}/`,
          image: g.photo_url
            ? new URL(g.photo_url, "https://geinin.reload.co.jp").href
            : undefined,
          foundingDate: g.formation_date ?? undefined,
          dissolutionDate: g.dissolution_date ?? undefined,
          member: db.memberships
            .filter((m) => m.group_id === id)
            .map((m) => ({
              "@type": "Person",
              name: personById.get(m.person_id)?.name,
              url: `https://geinin.reload.co.jp/people/${m.person_id}/`,
            })),
          parentOrganization: agency
            ? { "@type": "Organization", name: agency }
            : undefined,
        }}
      />
      <NodeDetail nodeId={`g:${id}`} />
    </>
  )
}

export default Page
