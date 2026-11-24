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
  relevantNews,
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
    expect(
      readFileSync(join(dir, `${shard}.json`), "utf8").split("\n")
    ).toHaveLength(4)
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

describe("relevantNews", () => {
  const a = (title: string) => ({
    title,
    link: "https://example.com/",
    pubDate: "Thu, 12 Nov 2026 00:00:00 GMT",
    source: "test",
  })
  it("短い名前は関係者名かお笑いの語も見出しにある記事だけ残す", () => {
    const items = [
      a("自動水質検査キット市場の成長見通し"),
      a("南京町宮殿・水質が新ネタを披露"),
      a("水質（南京町宮殿）の単独公演"),
    ]
    expect(
      relevantNews(items, "水質", ["南京町宮殿"]).map((x) => x.title)
    ).toEqual([
      "南京町宮殿・水質が新ネタを披露",
      "水質（南京町宮殿）の単独公演",
    ])
  })
  it("長い名前は見出しにあれば残し、名前の無い記事は除く", () => {
    const items = [a("ヒラモトアイナがドラマ出演"), a("別の話題")]
    expect(relevantNews(items, "ヒラモトアイナ").map((x) => x.title)).toEqual([
      "ヒラモトアイナがドラマ出演",
    ])
  })
  it("半角カナの名前でも全角の見出しに一致する", () => {
    expect(relevantNews([a("レナチョ、お笑いライブ")], "ﾚﾅﾁｮ")).toHaveLength(1)
  })
})
