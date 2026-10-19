import { describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import {
  buildGraph,
  EDGE_KINDS,
  termYear,
  visibleSubgraph,
  type EdgeKind,
} from "./graph"

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

  it("treats non-school debut in the graduation year as 同期", () => {
    const base = db.people.find((p) => p.id === "matsumoto")!
    const people = [
      ...db.people,
      { ...base, id: "x1", training_school: null, training_school_term: null },
      { ...base, id: "x2", training_school: null, debut_date: "1900" },
    ]
    const doki = buildGraph({ ...db, people }).edges.filter(
      (e) => e.kind === "doki"
    )
    expect(
      doki.filter((e) => e.source === "p:x1").map((e) => e.target)
    ).toEqual(["t:1982年デビュー"])
    expect(
      doki.some(
        (e) => e.source === "t:1982年デビュー" && e.target === "t:NSC大阪1期"
      )
    ).toBe(true)
    expect(doki.some((e) => e.source === "p:x2")).toBe(false)
  })

  it("maps school terms to entrance years", () => {
    expect(termYear("NSC大阪", 1)).toBe(1982)
    expect(termYear("NSC大阪", 14)).toBe(1994)
    expect(termYear("NSC大阪", 21)).toBe(1998)
    expect(termYear("NSC東京", 1)).toBe(1995)
    expect(termYear("NSC広島", 3)).toBe(2021)
    expect(termYear("NSC東京", 230)).toBe(null)
    expect(termYear("NSC沖縄", 1)).toBe(null)
  })

  it("derives 競演 as 開催 nodes, not pairwise edges", () => {
    const comp = g.edges.filter((e) => e.kind === "competition")
    // 出場者は開催ノードへつながる（組同士の直接の線は作らない）
    for (const e of comp) {
      expect(g.nodes.get(e.target)?.kind, e.id).toBe("race")
      expect(["person", "group"]).toContain(g.nodes.get(e.source)?.kind)
    }
    // 2008年 M-1 の優勝 NON STYLE と準優勝 オードリーは同じ開催につながる
    const race = g.nodes.get("x:M-1グランプリ 2008")
    expect(race?.kind).toBe("race")
    expect(race?.label).toBe("M-1グランプリ 2008")
    const inRace = comp.filter((e) => e.target === "x:M-1グランプリ 2008")
    expect(inRace.some((e) => e.source === "g:nonstyle")).toBe(true)
    expect(inRace.some((e) => e.source === "g:audrey")).toBe(true)
    expect(inRace.find((e) => e.source === "g:nonstyle")?.rank).toBe(1)
    // 別の年に出場した組とはつながらない
    expect(inRace.some((e) => e.source === "g:nakagawake")).toBe(false)
  })

  it("keeps one 競演 edge per 決勝 result", () => {
    const finals = db.competitionResults.filter((r) => r.stage === "決勝")
    expect(g.edges.filter((e) => e.kind === "competition")).toHaveLength(
      finals.length
    )
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
