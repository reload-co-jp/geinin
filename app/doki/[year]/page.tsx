import { years } from "@/app/doki/shared"
import { DokiView, dokiMetadata } from "./view"

type Props = { params: Promise<{ year: string }> }

export const generateStaticParams = () =>
  years.map(([y]) => ({ year: String(y) }))

export const generateMetadata = async ({ params }: Props) =>
  dokiMetadata((await params).year, 1)

const Page = async ({ params }: Props) => (
  <DokiView year={(await params).year} page={1} />
)

export default Page
