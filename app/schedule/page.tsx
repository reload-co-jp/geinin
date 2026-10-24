import { permanentRedirect } from "next/navigation"

// 旧URL。賞レースページへ統合済み
const Page = () => permanentRedirect("/races/")

export default Page
