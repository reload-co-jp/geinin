import Link from "next/link"
import { FC } from "react"

// 静的書き出し（GitHub Pages）では permanentRedirect が HTTP の 301 にならず、
// JavaScript を実行する前の HTML はタイトルも canonical も無い空ページになる。
// 検索エンジンが恒久的な移転として扱う「0秒の meta refresh」と canonical で移転先を示す
export const movedMetadata = (to: string, title: string) => ({
  title,
  alternates: { canonical: to },
})

export const Moved: FC<{ to: string; title: string }> = ({ to, title }) => (
  <div className="page">
    <meta httpEquiv="refresh" content={`0;url=${to}`} />
    <h1 className="page-title">{title}</h1>
    <p className="lead">
      このページは移転しました。<Link href={to}>{title}のページ</Link>
      をご覧ください。
    </p>
  </div>
)
