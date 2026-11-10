import { expect, test } from "vitest"
import { db, edgeIndex, isThin, nodeInfo, programIds } from "@/lib/db"
import { relationSummary } from "@/lib/node-info"

test("biography 未登録なら登録データから紹介文を組み立てる", () => {
  const g = db.groups.find((g) => g.name === "ココリコ")!
  const info = nodeInfo(`g:${g.id}`)!
  expect(info.biography).toBe(
    "ココリコは、吉本興業所属のお笑いコンビ。1992年5月結成。"
  )
  expect(relationSummary(info)).toBe("メンバーは遠藤章造・田中直樹。")
  const p = db.people.find((p) => p.name === "松本人志")!
  expect(nodeInfo(`p:${p.id}`)?.biography).toContain(
    "1963年9月8日生まれ。NSC大阪1期出身。"
  )
  expect(nodeInfo(`p:${p.id}`)?.facts).toContainEqual([
    "経歴",
    "1982年 NSC大阪校 1期生",
  ])
})

test("情報の少ないページだけを isThin とする", () => {
  const p = db.people.find((p) => p.name === "松本人志")!
  expect(isThin(`p:${p.id}`)).toBe(false)
  const g = db.groups.find((g) => g.name === "ココリコ")!
  expect(isThin(`g:${g.id}`)).toBe(false)
  // 所属コンビへのリンクしか無い芸人
  const thin = db.people.find((p) => p.id === "raffine-m1-130-1")!
  expect(isThin(`p:${thin.id}`)).toBe(true)
  const casts = programIds.map((id) => (edgeIndex.get(id) ?? []).length)
  const thinPrograms = programIds.filter(isThin)
  expect(thinPrograms.length).toBe(casts.filter((n) => n < 3).length)
  expect(isThin("x:m1-2001")).toBe(false)
})

test("事務所サイトの URL 由来の id にURL に使えない文字を含めない", () => {
  const bad = (id: string) => !/^[\w.-]+$/.test(id)
  expect(db.people.filter((p) => bad(p.id))).toEqual([])
  expect(db.groups.filter((g) => bad(g.id))).toEqual([])
})
