import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Explorer } from "./explorer"

// グラフ描画は cytoscape に任せる（このテストはリンクの置き場所だけを見る）
vi.mock("./cy-graph", () => ({ CyGraph: () => <div data-testid="cy" /> }))

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("focus=p:sanma&sel=p:sanma"),
  useRouter: () => ({ push: vi.fn() }),
}))

const GRAPH = {
  nodes: [
    {
      id: "p:sanma",
      kind: "person",
      label: "さんま",
      agencyId: null,
      year: null,
      status: null,
      photo: null,
      search: "さんま",
    },
    {
      id: "p:tanaka",
      kind: "person",
      label: "たなか",
      agencyId: null,
      year: null,
      status: null,
      photo: null,
      search: "たなか",
    },
  ],
  edges: [
    {
      id: "r:1",
      source: "p:sanma",
      target: "p:tanaka",
      kind: "master",
      label: "師弟（師匠→弟子）",
      derived: false,
      confidence: "high",
      verified: true,
      refId: "1",
    },
  ],
  agencies: [],
}

const INFO = {
  id: "p:sanma",
  name: "さんま",
  reading: "サンマ",
  aliases: [],
  facts: [],
  links: [
    {
      edgeId: "r:1",
      kind: "master",
      other: "p:tanaka",
      otherName: "たなか",
      label: "弟子",
      derived: false,
      confidence: "high",
      rel: null,
    },
  ],
  results: [],
  sources: [],
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    (q: string) =>
      ({
        matches: false,
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList
  )
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body = String(url).includes("graph.json")
        ? GRAPH
        : { "p:sanma": INFO }
      return { json: async () => body } as unknown as Response
    })
  )
})

describe("Explorer", () => {
  // 末尾のスラッシュは設定（trailingSlash）によって変わるのでパス本体だけ見る
  it("選択中の芸人から詳細ページへのリンクを出す", async () => {
    render(<Explorer />)
    const link = await screen.findByRole("link", { name: /詳細ページ/ })
    expect(link.getAttribute("href")).toMatch(/^\/people\/sanma\/?$/)
  })

  it("起点の芸人名から詳細ページへ飛べる", async () => {
    render(<Explorer />)
    const link = await screen.findByRole("link", { name: "さんま" })
    expect(link.getAttribute("href")).toMatch(/^\/people\/sanma\/?$/)
  })

  it("関係した芸人からも詳細ページへ飛べる", async () => {
    render(<Explorer />)
    const link = await screen.findByRole("link", { name: "詳細" })
    expect(link.getAttribute("href")).toMatch(/^\/people\/tanaka\/?$/)
  })
})
