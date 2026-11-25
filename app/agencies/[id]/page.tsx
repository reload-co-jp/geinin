import { db } from "@/lib/db"
import { AgencyView, agencyMetadata } from "./view"

type Props = { params: Promise<{ id: string }> }

export const generateStaticParams = () => db.agencies.map((a) => ({ id: a.id }))

export const generateMetadata = async ({ params }: Props) =>
  agencyMetadata((await params).id, 1)

const Page = async ({ params }: Props) => (
  <AgencyView id={(await params).id} page={1} />
)

export default Page
