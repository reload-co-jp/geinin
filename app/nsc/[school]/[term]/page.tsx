import { terms } from "@/app/nsc/shared"
import { TermView, termMetadata } from "./view"

type Props = { params: Promise<{ school: string; term: string }> }

export const generateStaticParams = () =>
  terms.map((t) => ({ school: t.slug, term: String(t.term) }))

export const generateMetadata = async ({ params }: Props) => {
  const { school, term } = await params
  return termMetadata(school, term, 1)
}

const Page = async ({ params }: Props) => {
  const { school, term } = await params
  return <TermView school={school} term={term} page={1} />
}

export default Page
