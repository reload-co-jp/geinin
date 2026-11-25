import Link from "next/link"
import { FC } from "react"
import { pageCount, pageHref } from "@/lib/paging"

// ページ番号のナビ。全ページへ直接リンクする（ページ数は多くても十数ページ）
export const Pager: FC<{
  base: string
  page: number
  total: number
  size: number
}> = ({ base, page, total, size }) => {
  const pages = pageCount(total, size)
  if (pages <= 1) return null
  return (
    <nav aria-label="ページ" className="pager">
      <style>{css}</style>
      {page > 1 && (
        <Link href={pageHref(base, page - 1)} rel="prev">
          ← 前
        </Link>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) =>
        p === page ? (
          <span key={p} aria-current="page">
            {p}
          </span>
        ) : (
          <Link key={p} href={pageHref(base, p)}>
            {p}
          </Link>
        )
      )}
      {page < pages && (
        <Link href={pageHref(base, page + 1)} rel="next">
          次 →
        </Link>
      )}
      <small>
        {((page - 1) * size + 1).toLocaleString()}〜
        {Math.min(page * size, total).toLocaleString()}件目 / 全
        {total.toLocaleString()}件
      </small>
    </nav>
  )
}

const css = `
.pager { display: flex; flex-wrap: wrap; gap: .25rem; align-items: center; font-size: .875rem; margin: 1rem 0; }
.pager a, .pager span[aria-current] { min-width: 2.25rem; padding: .35rem .5rem; text-align: center; border: 1px solid var(--line); border-radius: 2px; }
.pager span[aria-current] { background: var(--text); color: var(--bg, #fff); font-weight: bold; }
.pager small { color: var(--muted); margin-left: .5rem; }
`
