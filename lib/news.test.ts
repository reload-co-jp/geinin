import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  formatFetchedAt,
  needsRefresh,
  newsShardOf,
  newsStore,
  writeNewsShard,
} from "@/lib/news"

const article = (pubDate: string) => ({
  title: pubDate,
  link: "https://example.com",
  pubDate,
  source: "例",
})

describe("newsShardOf", () => {
  it("同じノードIDは常に同じ 00〜ff のシャードになる", () => {
    expect(newsShardOf("g:downtown")).toMatch(/^[0-9a-f]{2}$/)
    expect(newsShardOf("g:downtown")).toBe(newsShardOf("g:downtown"))
  })
})

describe("newsStore", () => {
  let dir = ""
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it("シャードからノードの記事を新しい順に引き、未取得なら null を返す", () => {
    dir = mkdtempSync(join(tmpdir(), "news-"))
    const shard = newsShardOf("g:a")
    writeNewsShard(dir, shard, {
      "g:a": {
        fetched_at: "2026-11-12T03:00:00.000Z",
        items: [
          article("Mon, 09 Nov 2026 00:00:00 GMT"),
          article("Tue, 10 Nov 2026 00:00:00 GMT"),
        ],
      },
    })
    // 1ノード1行で書き出す
    expect(readFileSync(join(dir, `${shard}.json`), "utf8").split("\n")).toHaveLength(4)
    const find = newsStore(dir)
    expect(find("g:a", 1)).toEqual({
      fetched_at: "2026-11-12T03:00:00.000Z",
      items: [article("Tue, 10 Nov 2026 00:00:00 GMT")],
    })
    expect(find("g:missing")).toBeNull()
  })
})

describe("formatFetchedAt", () => {
  it("日本時間の日時にし、日付だけのものはそのまま返す", () => {
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
