import { Suspense } from "react"
import { Explorer } from "@/components/graph/explorer"

export const metadata = { title: "関係性グラフ" }

const Page = () => (
  <Suspense>
    <Explorer />
  </Suspense>
)

export default Page
