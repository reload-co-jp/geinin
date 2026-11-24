import { expect, test } from "vitest"
import { rankingBySlug, rankings } from "@/app/ranking/shared"
import { db } from "@/lib/db"

test("同じ値は同順位にし、次の順位は繰り下げる", () => {
  for (const r of rankings) {
    r.rows.forEach((x, i) => {
      if (i === 0) expect(x.rank).toBe(1)
      else {
        const prev = r.rows[i - 1]
        expect(x.value).toBeLessThanOrEqual(prev.value)
        expect(x.rank).toBe(x.value === prev.value ? prev.rank : i + 1)
      }
    })
  }
})

test("決勝進出回数は登録済みの決勝結果と一致する", () => {
  const finals = rankingBySlug.get("finals")!
  const total = finals.rows.reduce((n, r) => n + r.value, 0)
  const registered = db.competitionResults.filter((r) => r.stage === "決勝")
  expect(total).toBeLessThanOrEqual(registered.length)
  const top = finals.rows[0]
  expect(registered.filter((r) => r.entrant_id === top.id).length).toBe(
    top.value
  )
})

test("優勝回数ランキングは優勝した出場者だけ", () => {
  const wins = rankingBySlug.get("wins")!
  expect(wins.rows.every((r) => r.value >= 1)).toBe(true)
  const m1Winners = new Set(
    db.competitionResults
      .filter(
        (r) =>
          r.competition_name === "M-1グランプリ" &&
          r.stage === "決勝" &&
          r.rank === 1
      )
      .map((r) => r.entrant_id)
  )
  for (const id of m1Winners)
    expect(wins.rows.some((r) => r.id === id)).toBe(true)
})
