import { db, nodeInfo, raceIds } from "@/lib/db"
import { NODE_SHARDS, nodeShard } from "@/lib/node-info"

export const dynamic = "force-static"
export const dynamicParams = false

const ids = [
  ...db.people.map((p) => `p:${p.id}`),
  ...db.groups.map((g) => `g:${g.id}`),
  ...raceIds,
]

// 詳細パネル用。ノード選択時に所属シャードをまとめて取得する
export const generateStaticParams = () =>
  Array.from({ length: NODE_SHARDS }, (_, i) => ({ file: `${i}.json` }))

export const GET = async (
  _: Request,
  { params }: { params: Promise<{ file: string }> }
) => {
  const shard = Number((await params).file.replace(/\.json$/, ""))
  return Response.json(
    Object.fromEntries(
      ids
        .filter((id) => nodeShard(id) === shard)
        .map((id) => [id, nodeInfo(id)])
    )
  )
}
