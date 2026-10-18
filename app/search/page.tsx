import { Suspense } from "react"
import { SearchResults } from "@/components/search-results"

export const metadata = { title: "検索" }

const Page = () => (
  <Suspense>
    <SearchResults />
  </Suspense>
)

export default Page
