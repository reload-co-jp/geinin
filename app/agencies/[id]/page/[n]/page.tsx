import { notFound } from "next/navigation"
import { validPage } from "@/lib/paging"
import {
  AGENCY_PAGE_SIZE,
  agencyExtraPages,
  agencyMetadata,
  agencyTotal,
  AgencyView,
} from "../../view"

type Props = { params: Promise<{ id: string; n: string }> }

export const generateStaticParams = () =>
  agencyExtraPages().map(({ id, n }) => ({ id, n: String(n) }))

export const generateMetadata = async ({ params }: Props) => {
  const { id, n } = await params
  const page = validPage(n, agencyTotal(id), AGENCY_PAGE_SIZE)
  return page ? agencyMetadata(id, page) : {}
}

const Page = async ({ params }: Props) => {
  const { id, n } = await params
  const page = validPage(n, agencyTotal(id), AGENCY_PAGE_SIZE)
  if (!page) notFound()
  return <AgencyView id={id} page={page} />
}

export default Page
