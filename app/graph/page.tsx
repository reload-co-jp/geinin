import { Suspense } from "react"
import { Explorer } from "@/components/graph/explorer"

export const metadata = {
  title: "関係性グラフ",
  description: "お笑い芸人の師弟・同期・コンビ・共演・賞レースの関係をネットワークグラフで探索",
  alternates: { canonical: "/graph/" },
}

const Page = () => (
  <Suspense>
    <Explorer />
  </Suspense>
)

export default Page
