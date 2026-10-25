import Link from "next/link"
import { Suspense } from "react"
import { Explorer } from "@/components/graph/explorer"

export const metadata = {
  title: "関係性グラフ",
  description:
    "お笑い芸人の師弟・同期・コンビ・共演・賞レースの関係をネットワークグラフで探索",
  alternates: { canonical: "/graph/" },
}

const Page = () => (
  <>
    <noscript>
      <p
        style={{
          padding: "1rem",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
        }}
      >
        関係性グラフの表示にはJavaScriptが必要です。同じ関係は
        <Link href="/list/">一覧</Link>
        と各芸人・コンビの詳細ページで確認できます。
      </p>
    </noscript>
    <Suspense>
      <Explorer />
    </Suspense>
  </>
)

export default Page
