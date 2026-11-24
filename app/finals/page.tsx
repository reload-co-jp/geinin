import { Moved, movedMetadata } from "@/components/moved"

// 旧URL。賞レースページへ統合済み
export const metadata = movedMetadata("/races/", "賞レース")

const Page = () => <Moved to="/races/" title="賞レース" />

export default Page
