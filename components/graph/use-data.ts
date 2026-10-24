"use client"

import { useEffect, useState } from "react"
import {
  fromJSON,
  indexEdges,
  type EdgeIndex,
  type Graph,
  type GraphJSON,
} from "@/lib/graph"
import { nodeShard, termInfo, type NodeInfo } from "@/lib/node-info"
import type { Agency } from "@/lib/types"

export type GraphData = { graph: Graph; index: EdgeIndex; agencies: Agency[] }

// ページ遷移をまたいで1回だけ取得する
let graphPromise: Promise<GraphData> | null = null
const loadGraph = () =>
  (graphPromise ??= fetch("/data/graph.json")
    .then((r) => r.json() as Promise<GraphJSON & { agencies: Agency[] }>)
    .then((j) => {
      const graph = fromJSON(j)
      return { graph, index: indexEdges(graph), agencies: j.agencies }
    }))

export const useGraphData = () => {
  const [data, setData] = useState<GraphData | null>(null)
  useEffect(() => {
    loadGraph().then(setData)
  }, [])
  return data
}

const infoCache = new Map<string, Promise<NodeInfo>>()
const shardCache = new Map<number, Promise<Record<string, NodeInfo>>>()
const loadShard = (shard: number) => {
  if (!shardCache.has(shard))
    shardCache.set(
      shard,
      fetch(`/data/node/${shard}.json`).then((r) => r.json())
    )
  return shardCache.get(shard)!
}

export const useNodeInfo = (data: GraphData | null, nodeId: string | null) => {
  const [info, setInfo] = useState<NodeInfo | null>(null)
  useEffect(() => {
    if (!data || !nodeId || !data.graph.nodes.has(nodeId)) return
    let alive = true
    if (!infoCache.has(nodeId))
      infoCache.set(
        nodeId,
        nodeId.startsWith("t:")
          ? Promise.resolve(termInfo(data.graph, data.index, nodeId))
          : loadShard(nodeShard(nodeId)).then((m) => m[nodeId])
      )
    infoCache.get(nodeId)!.then((i) => alive && setInfo(i))
    return () => {
      alive = false
    }
  }, [data, nodeId])
  return info?.id === nodeId ? info : null
}
