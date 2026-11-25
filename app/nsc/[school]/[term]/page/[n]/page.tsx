import { notFound } from "next/navigation"
import { validPage } from "@/lib/paging"
import {
  TERM_PAGE_SIZE,
  termExtraPages,
  termMetadata,
  termTotal,
  TermView,
} from "../../view"

type Props = {
  params: Promise<{ school: string; term: string; n: string }>
}

export const generateStaticParams = () =>
  termExtraPages().map(({ school, term, n }) => ({
    school,
    term,
    n: String(n),
  }))

export const generateMetadata = async ({ params }: Props) => {
  const { school, term, n } = await params
  const page = validPage(n, termTotal(school, term), TERM_PAGE_SIZE)
  return page ? termMetadata(school, term, page) : {}
}

const Page = async ({ params }: Props) => {
  const { school, term, n } = await params
  const page = validPage(n, termTotal(school, term), TERM_PAGE_SIZE)
  if (!page) notFound()
  return <TermView school={school} term={term} page={page} />
}

export default Page
