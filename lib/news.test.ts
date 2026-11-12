import { describe, expect, it } from "vitest"
import { formatFetchedAt, needsRefresh, newsFetchedAt } from "@/lib/news"

describe("newsFetchedAt", () => {
  const dump = {
    fetched_at: "2026-11-11",
    fetched: { "g:a": "2026-11-12T03:00:00.000Z" },
    items: { "g:a": [], "g:b": [] },
  }
  it("ノード別の取得日時を優先し、無ければダンプ全体の日時で代用する", () => {
    expect(newsFetchedAt(dump, "g:a")).toBe("2026-11-12T03:00:00.000Z")
    expect(newsFetchedAt(dump, "g:b")).toBe("2026-11-11")
    expect(newsFetchedAt(dump, "g:c")).toBeNull()
  })
})

describe("formatFetchedAt", () => {
  it("日本時間の日時にし、日付だけの旧データはそのまま返す", () => {
    expect(formatFetchedAt("2026-11-12T03:04:05.000Z")).toBe("2026-11-12 12:04")
    expect(formatFetchedAt("2026-11-11")).toBe("2026-11-11")
  })
})

describe("needsRefresh", () => {
  const now = new Date("2026-11-12T00:00:00Z")
  it("未取得か、指定日数以上経っていれば再取得する", () => {
    expect(needsRefresh(null, now, 7)).toBe(true)
    expect(needsRefresh("2026-11-06T00:00:00Z", now, 7)).toBe(false)
    expect(needsRefresh("2026-11-05T00:00:00Z", now, 7)).toBe(true)
  })
})
