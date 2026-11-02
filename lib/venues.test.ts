import { expect, test } from "vitest"
import type { Live } from "@/lib/lives"
import {
  buildVenues,
  liveRelations,
  prefectureOf,
  venueLabel,
} from "@/lib/venues"

const live = (
  venue: string | null,
  cast: string[],
  title = "ライブ"
): Live => ({
  date: "2026-11-10",
  start: null,
  title,
  venue,
  url: "https://example.com/",
  source: "FANYチケット",
  cast,
})

test("会場名から都道府県と表示名を分ける", () => {
  expect(prefectureOf("渋谷よしもと漫才劇場（東京都）")).toBe("東京都")
  expect(venueLabel("渋谷よしもと漫才劇場（東京都）")).toBe(
    "渋谷よしもと漫才劇場"
  )
  expect(prefectureOf("HEP HALL")).toBeNull()
})

test("公演の少ない会場はページにせず、常連は出演回数順", () => {
  const vs = buildVenues({
    fetched_at: "2026-11-01",
    lives: [
      live("A（東京都）", ["g:x", "g:y"]),
      live("A（東京都）", ["g:x"]),
      live("A（東京都）", ["g:x", "g:y", "p:z"]),
      live("B（大阪府）", ["g:x"]),
    ],
  })
  expect(vs.map((v) => v.label)).toEqual(["A"])
  expect(vs[0].regulars).toEqual([
    { id: "g:x", count: 3 },
    { id: "g:y", count: 2 },
    { id: "p:z", count: 1 },
  ])
})

test("共演者は同じ公演の出演者を回数順に、大人数の公演は数えない", () => {
  const big = Array.from({ length: 20 }, (_, i) => `p:big${i}`)
  const { costarsOf, venuesOf } = liveRelations({
    fetched_at: "2026-11-01",
    lives: [
      live("A", ["g:x", "g:y"], "1"),
      live("A", ["g:x", "g:y", "g:z"], "2"),
      live("B", ["g:x", ...big], "3"),
    ],
  })
  expect(costarsOf("g:x").map((c) => [c.id, c.count])).toEqual([
    ["g:y", 2],
    ["g:z", 1],
  ])
  expect(venuesOf("g:x")).toEqual([
    { venue: "A", count: 2 },
    { venue: "B", count: 1 },
  ])
})
