// 一覧ページのページ分け。1ページ目は従来の URL（/agencies/yoshimoto/）のまま、
// 2ページ目以降を /agencies/yoshimoto/page/2/ にする。各ページの canonical は自分自身
// （1ページ目に寄せると2ページ目以降の芸人へのリンクがたどられなくなるため）

export const pageCount = (total: number, size: number) =>
  Math.max(1, Math.ceil(total / size))

export const pageSlice = <T>(xs: T[], size: number, page: number) =>
  xs.slice((page - 1) * size, page * size)

// base は末尾スラッシュ付き（"/list/a/"）
export const pageHref = (base: string, page: number) =>
  page <= 1 ? base : `${base}page/${page}/`

export const pageTitle = (title: string, page: number) =>
  page > 1 ? `${title}（${page}ページ目）` : title

// 2ページ目以降の番号（generateStaticParams 用）
export const extraPages = (total: number, size: number) =>
  Array.from({ length: pageCount(total, size) - 1 }, (_, i) => i + 2)

// URL の n が 2 以上の有効なページ番号か
export const validPage = (n: string, total: number, size: number) => {
  const p = Number(n)
  return Number.isInteger(p) &&
    p >= 2 &&
    p <= pageCount(total, size) &&
    String(p) === n
    ? p
    : null
}
