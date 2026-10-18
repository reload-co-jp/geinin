import { notFound } from "next/navigation"
import { NodeDetail } from "@/components/node-detail"
import { db, personById } from "@/lib/db"

type Props = { params: Promise<{ id: string }> }

export const generateStaticParams = () => db.people.map((p) => ({ id: p.id }))

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params
  const p = personById.get(id)
  return p
    ? {
        title: `${p.name}（${p.reading}）`,
        description: `${p.name}の師弟・同期・コンビ・共演などの関係性`,
      }
    : {}
}

const Page = async ({ params }: Props) => {
  const { id } = await params
  if (!personById.has(id)) notFound()
  return <NodeDetail nodeId={`p:${id}`} />
}

export default Page
