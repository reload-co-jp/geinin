import { expect, test } from "vitest"
import { db, nodeInfo } from "@/lib/db"
import { faqOf, recommendations, timelineOf } from "@/lib/related"

const personId = (name: string) =>
  `p:${db.people.find((p) => p.name === name)!.id}`
const groupId = (name: string) =>
  `g:${db.groups.find((g) => g.name === name)!.id}`

test("芸人のおすすめは相方を先頭にし、自分と重複を含めない", () => {
  const id = personId("松本人志")
  const r = recommendations(id)
  expect(r.near[0]).toMatchObject({ name: "浜田雅功" })
  expect(r.near[0].reason).toContain("相方")
  const all = [...r.near, ...r.agency, ...r.year].map((x) => x.id)
  expect(all).not.toContain(id)
  expect(new Set(all).size).toBe(all.length)
})

test("年表は年順で、コンビ結成を含む", () => {
  const id = personId("松本人志")
  const t = timelineOf(id, nodeInfo(id)!)
  expect(t.map((e) => e.year)).toEqual(t.map((e) => e.year).toSorted())
  expect(t.some((e) => e.text.includes("ダウンタウン"))).toBe(true)
})

test("よくある質問で相方・事務所・メンバーに答える", () => {
  const p = personId("松本人志")
  const pf = faqOf(p, nodeInfo(p)!)
  expect(pf.find((f) => f.q.includes("相方"))?.a).toContain("浜田雅功")
  expect(pf.find((f) => f.q.includes("所属事務所"))?.a).toBe("吉本興業です。")
  const g = groupId("ココリコ")
  const gf = faqOf(g, nodeInfo(g)!)
  expect(gf.find((f) => f.q.includes("メンバー"))?.a).toContain("遠藤章造")
})

test("ライブ出演のある芸人は共演者と出演劇場をおすすめに出す", () => {
  const id = personId("齋藤のようなもの")
  const r = recommendations(id)
  expect(r.live.length).toBeGreaterThan(0)
  expect(r.live[0].reason).toMatch(/共演/)
  expect(r.venues.length).toBeGreaterThan(0)
  const f = faqOf(id, nodeInfo(id)!)
  expect(f.some((x) => x.q.includes("劇場"))).toBe(true)
})
