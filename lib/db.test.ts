import { expect, test } from "vitest"
import { db, nodeInfo } from "@/lib/db"

test("biography 未登録なら登録データから紹介文を組み立てる", () => {
  const g = db.groups.find((g) => g.name === "ココリコ")!
  expect(nodeInfo(`g:${g.id}`)?.biography).toBe(
    "ココリコは、吉本興業所属のお笑いコンビ。1992年5月結成。メンバーは遠藤章造・田中直樹。"
  )
  const p = db.people.find((p) => p.name === "松本人志")!
  expect(nodeInfo(`p:${p.id}`)?.biography).toContain(
    "1963年9月8日生まれ。NSC大阪1期出身。"
  )
  expect(nodeInfo(`p:${p.id}`)?.facts).toContainEqual([
    "経歴",
    "1982年 NSC大阪校 1期生",
  ])
})
