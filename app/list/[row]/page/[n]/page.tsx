import { notFound } from "next/navigation"
import { validPage } from "@/lib/paging"
import {
  LIST_PAGE_SIZE,
  listExtraPages,
  listMetadata,
  listTotal,
  ListView,
} from "../../view"

type Props = { params: Promise<{ row: string; n: string }> }

export const generateStaticParams = () =>
  listExtraPages().map(({ row, n }) => ({ row, n: String(n) }))

export const generateMetadata = async ({ params }: Props) => {
  const { row, n } = await params
  const page = validPage(n, listTotal(row), LIST_PAGE_SIZE)
  return page ? listMetadata(row, page) : {}
}

const Page = async ({ params }: Props) => {
  const { row, n } = await params
  const page = validPage(n, listTotal(row), LIST_PAGE_SIZE)
  if (!page) notFound()
  return <ListView row={row} page={page} />
}

export default Page
