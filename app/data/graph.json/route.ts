import { db, graph } from "@/lib/db"
import type { GraphJSON } from "@/lib/graph"

export const dynamic = "force-static"

// グラフ画面・検索用の骨格データ（ノードと関係線のみ）
export const GET = () =>
  Response.json({
    nodes: [...graph.nodes.values()],
    edges: graph.edges,
    agencies: db.agencies,
  } satisfies GraphJSON & { agencies: typeof db.agencies })
