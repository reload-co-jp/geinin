import { expect, test } from "vitest"
import { indexedTerms, neighbors, termOf, terms } from "@/app/nsc/shared"
import { db } from "@/lib/db"
import { nodeHref, parseTermId } from "@/lib/graph"

test("期ノードの id から期ページの URL を作る", () => {
  expect(parseTermId("t:NSC大阪33期")).toEqual({ school: "NSC大阪", term: 33 })
  expect(nodeHref("t:NSC東京28期")).toBe("/nsc/tokyo/28/")
  expect(parseTermId("t:2011年デビュー")).toBeNull()
  expect(nodeHref("t:2011年デビュー")).toBe("/doki/2011/")
})

test("期のページには、その期の記載がある芸人だけを載せる", () => {
  const t = termOf("osaka", 33)!
  expect(t.label).toBe("NSC大阪33期")
  const ids = new Set(t.members.map((m) => m.id))
  const expected = db.people.filter(
    (p) => p.training_school === "NSC大阪" && p.training_school_term === 33
  )
  expect(ids.size).toBe(expected.length)
  expect(expected.every((p) => ids.has(p.id))).toBe(true)
  // 粗品・せいやは同期どうしのコンビ（霜降り明星）
  expect(t.inTerm.some((g) => g.name === "霜降り明星")).toBe(true)
})

test("期の一覧と前後の期", () => {
  expect(new Set(terms.map((t) => t.href)).size).toBe(terms.length)
  expect(indexedTerms.every((t) => t.members.length >= 3)).toBe(true)
  const { prev, next } = neighbors(termOf("tokyo", 2)!)
  expect(prev?.label).toBe("NSC東京1期")
  expect(next?.label).toBe("NSC東京3期")
})
