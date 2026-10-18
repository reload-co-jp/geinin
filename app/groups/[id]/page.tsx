import { notFound } from "next/navigation"
import { NodeDetail } from "@/components/node-detail"
import { db, groupById } from "@/lib/db"

type Props = { params: Promise<{ id: string }> }

export const generateStaticParams = () => db.groups.map((g) => ({ id: g.id }))

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params
  const g = groupById.get(id)
  return g
    ? {
        title: `${g.name}（${g.reading}）`,
        description: `${g.name}のメンバー・変遷・賞レース戦績と関係性`,
        alternates: { canonical: `/groups/${id}/` },
      }
    : {}
}

const Page = async ({ params }: Props) => {
  const { id } = await params
  if (!groupById.has(id)) notFound()
  return <NodeDetail nodeId={`g:${id}`} />
}

export default Page
