import { notFound } from "next/navigation"
import { JsonLd } from "@/components/json-ld"
import { NodeDetail } from "@/components/node-detail"
import { edgeIndex, graph, programIds } from "@/lib/db"
import { nodeHref, programSlug } from "@/lib/graph"

type Props = { params: Promise<{ slug: string }> }

const bySlug = new Map(programIds.map((id) => [programSlug(id.slice(2)), id]))

export const generateStaticParams = () =>
  [...bySlug.keys()].map((slug) => ({ slug }))

export const generateMetadata = async ({ params }: Props) => {
  const id = bySlug.get((await params).slug)
  if (!id) return {}
  const name = graph.nodes.get(id)!.label
  const cast = (edgeIndex.get(id) ?? []).map(
    (e) => graph.nodes.get(e.source)?.label
  )
  return {
    title: `${name}の出演芸人`,
    description: `${name}に出演したお笑い芸人・コンビ${cast.length}組（${cast.slice(0, 5).join("・")}${cast.length > 5 ? "ほか" : ""}）`,
    alternates: { canonical: nodeHref(id) },
  }
}

const Page = async ({ params }: Props) => {
  const id = bySlug.get((await params).slug)
  if (!id) notFound()
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TVSeries",
          name: graph.nodes.get(id)!.label,
          url: `https://geinin.reload.co.jp${nodeHref(id)}`,
          actor: (edgeIndex.get(id) ?? []).map((e) => ({
            "@type": e.source.startsWith("g:") ? "PerformingGroup" : "Person",
            name: graph.nodes.get(e.source)?.label,
            url: `https://geinin.reload.co.jp${nodeHref(e.source)}`,
          })),
        }}
      />
      <NodeDetail nodeId={id} />
    </>
  )
}

export default Page
