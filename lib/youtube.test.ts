import { describe, expect, it } from "vitest"
import { channelUrls, parseSubscribers, youtubeIndex } from "@/lib/youtube"

describe("channelUrls", () => {
  it("チャンネルだけを正規化して重複なく返す", () => {
    const html = `
      <a href="https://www.youtube.com/channel/UCyHitknXMENfN5LxV87flHQ/">a</a>
      <a href="https://youtube.com/channel/UCyHitknXMENfN5LxV87flHQ">b</a>
      <a href="https://www.youtube.com/@kamaitachi?si=x">c</a>
      <a href="https://www.youtube.com/watch?v=abc">d</a>`
    expect(channelUrls(html)).toEqual([
      "https://www.youtube.com/channel/UCyHitknXMENfN5LxV87flHQ",
      "https://www.youtube.com/@kamaitachi",
    ])
  })
})

describe("parseSubscribers", () => {
  it.each([
    ["チャンネル登録者数 5.09万人", 50900],
    ["チャンネル登録者数 1.2億人", 120000000],
    ["チャンネル登録者数 1,234人", 1234],
    ["非公開", null],
  ])("%s → %s", (text, n) => expect(parseSubscribers(text)).toBe(n))
})

describe("youtubeIndex", () => {
  it("多数のページに載る共有チャンネルを除く", () => {
    const own = { url: "own", title: "本人", subscribers: 1 }
    const shared = { url: "shared", title: "事務所", subscribers: 2 }
    const pages = Object.fromEntries(
      [...Array(5)].map((_, i) => [`a:${i}`, ["shared"]])
    )
    const find = youtubeIndex({
      fetched_at: "2026-10-24",
      pages: { ...pages, "a:0": ["own", "shared"], "a:9": ["own"] },
      channels: { own, shared },
    })
    expect(find(["a:0", "a:9", "wiki"])).toEqual([own])
  })
})
