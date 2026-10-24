import { db, graph } from "@/lib/db"
import { toJSON } from "@/lib/graph"

export const dynamic = "force-static"

// グラフ画面・検索用の骨格データ（ノードと関係線のみ）
export const GET = () =>
  Response.json({ ...toJSON(graph), agencies: db.agencies })
