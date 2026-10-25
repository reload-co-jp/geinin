import { Suspense } from "react"
import { SearchResults } from "@/components/search-results"

export const metadata = {
  title: "検索",
  description: "芸人名・グループ名から芸人データベースを検索",
  alternates: { canonical: "/search/" },
}

const Page = () => (
  <Suspense>
    <SearchResults />
  </Suspense>
)

export default Page
