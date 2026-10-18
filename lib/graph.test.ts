import { describe, expect, it } from "vitest"
import { db } from "@/data/db"
import { buildGraph, EDGE_KINDS, visibleSubgraph, type EdgeKind } from "./graph"

const g = buildGraph(db)
const all = new Set(Object.keys(EDGE_KINDS) as EdgeKind[])
const view = {
  focus: "p:sanma",
  depth: 1,
  kinds: all,
  expanded: [],
  agencyId: null,
  decade: null,
  limit: 80,
}

describe("data integrity", () => {
  it("every edge points to an existing node", () => {
    for (const e of g.edges) {
      expect(g.nodes.has(e.source), e.id).toBe(true)
      expect(g.nodes.has(e.target), e.id).toBe(true)
    }
  })

  it("every source id exists", () => {
    const ids = new Set(db.sources.map((s) => s.id))
    const records = [
      ...db.people,
      ...db.groups,
      ...db.relationships,
      ...db.competitionResults,
    ]
    for (const r of records)
      for (const s of r.source_ids)
        expect(ids.has(s), `${r.id}:${s}`).toBe(true)
  })
})

describe("buildGraph", () => {
  it("derives 同期 from school + term", () => {
    const doki = g.edges.filter((e) => e.kind === "doki" && e.derived)
    const term = "t:NSC大阪1期"
    expect(g.nodes.get(term)?.kind).toBe("term")
    for (const p of ["p:matsumoto", "p:hamada"])
      expect(doki.some((e) => e.source === p && e.target === term)).toBe(true)
  })

  it("derives 競演 only among finalists of the same year", () => {
    const comp = g.edges.filter((e) => e.kind === "competition")
    expect(
      comp.some((e) => e.source === "g:nonstyle" && e.target === "g:audrey")
    ).toBe(true)
    expect(
      comp.some((e) => [e.source, e.target].includes("g:nakagawake"))
    ).toBe(false)
  })

  it("separates current and former members", () => {
    expect(g.edges.find((e) => e.id === "m:ariyoshi:saruganseki")?.kind).toBe(
      "former_member"
    )
    expect(g.edges.find((e) => e.id === "m:iizuka:tokyo03")?.kind).toBe(
      "member"
    )
  })
})

describe("visibleSubgraph", () => {
  it("respects depth", () => {
    const d1 = visibleSubgraph(g, view)
    expect([...d1.nodes.keys()].sort()).toEqual([
      "p:matsunosuke",
      "p:sanma",
      "p:takeshi",
    ])
    expect(
      visibleSubgraph(g, { ...view, depth: 2 }).nodes.has("p:fukami")
    ).toBe(true)
  })

  it("filters by kind and keeps only edges between visible nodes", () => {
    const sub = visibleSubgraph(g, {
      ...view,
      depth: 3,
      kinds: new Set(["master"]),
    })
    expect(sub.nodes.has("p:takeshi")).toBe(false)
    expect(sub.edges.every((e) => e.kind === "master")).toBe(true)
  })

  it("adds neighbours of expanded nodes", () => {
    const sub = visibleSubgraph(g, { ...view, expanded: ["p:takeshi"] })
    expect(sub.nodes.has("p:hakase")).toBe(true)
  })

  it("does not traverse through filtered-out nodes but keeps the root", () => {
    const sub = visibleSubgraph(g, { ...view, depth: 2, agencyId: "yoshimoto" })
    expect(sub.nodes.has("p:sanma")).toBe(true)
    expect(sub.nodes.has("p:takeshi")).toBe(false)
    expect(sub.nodes.has("p:fukami")).toBe(false)
  })

  it("caps node count", () => {
    expect(visibleSubgraph(g, { ...view, depth: 9, limit: 3 }).nodes.size).toBe(
      3
    )
  })
})
