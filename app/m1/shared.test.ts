import { expect, test } from "vitest"
import { entrantsOf, passersOf, stagesOf } from "@/app/m1/shared"

test("通過者は次の回戦の出場組で、この回戦の出場組に含まれる", () => {
  const pass = passersOf(2024, "3回戦")
  expect(pass?.next).toBe("準々決勝")
  const urls = new Set(entrantsOf(2024, "3回戦").map((e) => e.url))
  expect(pass!.urls.size).toBeGreaterThan(0)
  expect([...pass!.urls].every((u) => urls.has(u))).toBe(true)
})

test("次の回戦の記録がない回戦や準決勝は判定しない", () => {
  expect(passersOf(2024, "準決勝")).toBeNull()
  // 2020年は3回戦の記録がないので、2回戦の通過は判定できない
  if (!stagesOf(2020).includes("3回戦"))
    expect(passersOf(2020, "2回戦")).toBeNull()
})
