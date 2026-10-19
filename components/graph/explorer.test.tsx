import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Explorer } from "./explorer"

// グラフ描画は cytoscape に任せる（このテストはリンクの置き場所だけを見る）
vi.mock("./cy-graph", () => ({ CyGraph: () => <div data-testid="cy" /> }))

vi.mock("next/navigation", () => ({
  useSearchParams: () => params,
  useRouter: () => ({ push: vi.fn() }),
}))

let params = new URLSearchParams("focus=p:sanma&sel=p:sanma")

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
    {
      id: "x:M-1グランプリ 2008",
      kind: "race",
      label: "M-1グランプリ 2008",
      agencyId: null,
      year: 2008,
      status: null,
      photo: null,
      search: "m-1グランプリ\n2008",
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
    {
      id: "cx:M-1グランプリ-2008-g:nonstyle",
      source: "g:nonstyle",
      target: "x:M-1グランプリ 2008",
      kind: "competition",
      label: "M-1グランプリ 2008 決勝",
      derived: true,
      confidence: "high",
      verified: false,
      refId: null,
      rank: 1,
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

// 賞レースの開催ノード。出場者が順位付きで並ぶ
const RACE_INFO = {
  id: "x:M-1グランプリ 2008",
  name: "M-1グランプリ 2008 決勝",
  reading: "賞レースの決勝",
  aliases: [],
  facts: [
    ["大会", "M-1グランプリ"],
    ["年", "2008"],
    ["決勝出場", "1組"],
  ],
  links: [
    {
      edgeId: "cx:M-1グランプリ-2008-g:nonstyle",
      kind: "competition",
      other: "g:nonstyle",
      otherName: "NON STYLE",
      label: "優勝",
      derived: true,
      confidence: "high",
      rel: null,
    },
  ],
  results: [],
  sources: [],
}

beforeEach(() => {
  params = new URLSearchParams("focus=p:sanma&sel=p:sanma")
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
        : { "p:sanma": INFO, "x:M-1グランプリ 2008": RACE_INFO }
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

  it("賞レースの開催を選ぶと出場者が順位で並ぶ", async () => {
    params = new URLSearchParams(
      "focus=x%3AM-1%E3%82%B0%E3%83%A9%E3%83%B3%E3%83%97%E3%83%AA%202008&sel=x%3AM-1%E3%82%B0%E3%83%A9%E3%83%B3%E3%83%97%E3%83%AA%202008"
    )
    render(<Explorer />)
    expect(await screen.findByText("M-1グランプリ 2008 決勝")).toBeVisible()
    expect(screen.getByText("優勝")).toBeVisible()
    expect(screen.getByText("NON STYLE")).toBeVisible()
  })
})
