import { db, nodeInfo } from "@/lib/db"
import { nodeFile } from "@/lib/node-info"

export const dynamic = "force-static"
export const dynamicParams = false

// 詳細パネル用。ノード選択時に1件ずつ取得する
export const generateStaticParams = () =>
  [
    ...db.people.map((p) => `p:${p.id}`),
    ...db.groups.map((g) => `g:${g.id}`),
  ].map((id) => ({ file: nodeFile(id) }))

export const GET = async (
  _: Request,
  { params }: { params: Promise<{ file: string }> }
) => {
  const { file } = await params
  return Response.json(nodeInfo(file.replace(/\.json$/, "").replace("_", ":")))
}
