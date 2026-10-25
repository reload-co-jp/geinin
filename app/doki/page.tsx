import Link from "next/link"
import { FC } from "react"
import {
  css,
  ESTIMATED_NOTE,
  Names,
  SHOWN,
  unknown,
  years,
} from "@/app/doki/shared"
import { InArticleAd } from "@/components/in-article-ad"

export const metadata = {
  title: "同期芸人一覧",
  description: "お笑い芸人をデビュー年ごとにまとめた同期一覧",
  alternates: { canonical: "/doki/" },
}

const Page: FC = () => (
  <div className="page">
    <style>{css}</style>
    <h2 className="page-title">同期芸人一覧</h2>
    <p className="lead">
      デビュー年が同じ芸人を、賞レース成績や共演の多い順に並べています。名前の下は出身養成所と期です。
      {ESTIMATED_NOTE}
      {unknown > 0 &&
        `デビュー年を推定できない${unknown.toLocaleString()}人は載せていません。`}
    </p>
    <InArticleAd />
    {years.map(([year, ps]) => (
      <section
        key={year}
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          padding: ".5rem",
          fontSize: ".875rem",
          display: "grid",
          gap: ".25rem",
        }}
      >
        <h3 style={{ fontSize: "inherit" }}>
          <Link href={`/doki/${year}/`}>{year}年デビュー</Link>
          <span style={{ color: "var(--muted)", fontWeight: "normal" }}>
            {" "}
            {ps.length.toLocaleString()}人
          </span>
        </h3>
        <Names ps={ps.slice(0, SHOWN)} />
        {ps.length > SHOWN && (
          <Link href={`/doki/${year}/`} style={{ fontSize: ".8rem" }}>
            ほか{(ps.length - SHOWN).toLocaleString()}人を見る →
          </Link>
        )}
      </section>
    ))}
  </div>
)

export default Page
