import { describe, expect, it } from "vitest"
import { xHandles, xIndex } from "@/lib/x"

describe("xHandles", () => {
  it("アカウントだけを小文字にして重複なく返す", () => {
    const html = `
      <a href="https://twitter.com/Kamaitachi_A">a</a>
      <a href="https://x.com/kamaitachi_a/status/1">b</a>
      <a href="https://twitter.com/share?url=x">c</a>
      <a href="https://x.com/intent/tweet">d</a>
      <a href="https://twitter.com/#!/oldstyle">e</a>`
    expect(xHandles(html)).toEqual(["kamaitachi_a", "oldstyle"])
  })
})

describe("xIndex", () => {
  it("多数のページに載る共有アカウントを除き、取得済みプロフィールを返す", () => {
    const pages = Object.fromEntries(
      [...Array(15)].map((_, i) => [`a:${i}`, ["agency"]])
    )
    const own = { handle: "Own", followers: 10 }
    const find = xIndex({
      fetched_at: "2026-10-30",
      pages: { ...pages, "b:0": ["own", "agency"], "b:1": ["own", "other"] },
      accounts: { own },
    })
    expect(find(["b:0", "b:1"], false)).toEqual([own, { handle: "other" }])
    // 個人には他のページにも載るアカウントを付けない
    expect(find(["b:1"], true)).toEqual([{ handle: "other" }])
  })
})
