import { notFound } from "next/navigation"
import { NodeDetail } from "@/components/node-detail"
import { JsonLd } from "@/components/json-ld"
import { xUrl } from "@/lib/x"
import {
  agencyName,
  db,
  groupById,
  isThin,
  ownUrls,
  xOf,
  personById,
  sameName,
} from "@/lib/db"

// 読みが未登録のときに「名前（）」とならないようにする
const withReading = (e: { name: string; reading: string }) =>
  e.reading ? `${e.name}（${e.reading}）` : e.name

type Props = { params: Promise<{ id: string }> }

export const generateStaticParams = () => db.groups.map((g) => ({ id: g.id }))

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params
  const g = groupById.get(id)
  return g
    ? {
        // 同名の登録があるときは事務所を添えて区別する
        title: `${withReading(g)}のメンバー・賞レース戦績${sameName(`g:${id}`).length && agencyName(g.agency_id) ? ` - ${agencyName(g.agency_id)}` : ""}`,
        description: [
          withReading(g),
          agencyName(g.agency_id),
          g.formation_date && `${g.formation_date.slice(0, 4)}年結成`,
          db.memberships
            .filter((m) => m.group_id === id)
            .map((m) => personById.get(m.person_id)?.name)
            .join("・") || null,
        ]
          .filter(Boolean)
          .join(" / ")
          .concat("。メンバー変遷・賞レース戦績と関係性"),
        alternates: { canonical: `/groups/${id}/` },
        ...(isThin(`g:${id}`) && { robots: { index: false, follow: true } }),
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
