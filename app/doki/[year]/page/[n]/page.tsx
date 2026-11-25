import { notFound } from "next/navigation"
import { validPage } from "@/lib/paging"
import {
  DOKI_PAGE_SIZE,
  dokiExtraPages,
  dokiMetadata,
  dokiTotal,
  DokiView,
} from "../../view"

type Props = { params: Promise<{ year: string; n: string }> }

export const generateStaticParams = () =>
  dokiExtraPages().map(({ year, n }) => ({ year, n: String(n) }))

export const generateMetadata = async ({ params }: Props) => {
  const { year, n } = await params
  const page = validPage(n, dokiTotal(year), DOKI_PAGE_SIZE)
  return page ? dokiMetadata(year, page) : {}
}

const Page = async ({ params }: Props) => {
  const { year, n } = await params
  const page = validPage(n, dokiTotal(year), DOKI_PAGE_SIZE)
  if (!page) notFound()
  return <DokiView year={year} page={page} />
}

export default Page
