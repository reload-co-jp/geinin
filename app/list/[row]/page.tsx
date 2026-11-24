import { ListView, listMetadata, listRows } from "./view"

type Props = { params: Promise<{ row: string }> }

export const generateStaticParams = () => listRows.map((r) => ({ row: r.slug }))

export const generateMetadata = async ({ params }: Props) =>
  listMetadata((await params).row, 1)

const Page = async ({ params }: Props) => (
  <ListView row={(await params).row} page={1} />
)

export default Page
