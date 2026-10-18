export const th = {
  textAlign: "left",
  padding: ".35rem .5rem",
  borderBottom: "2px solid var(--line)",
  whiteSpace: "nowrap",
} as const

export const td = {
  padding: ".35rem .5rem",
  borderBottom: "1px solid var(--line)",
  verticalAlign: "top",
} as const

// 読みの頭文字で五十音の行に振り分ける。各行の先頭文字の直前までがその行
export const ROWS = [
  { slug: "a", label: "あ行", from: "ぁ" },
  { slug: "ka", label: "か行", from: "か" },
  { slug: "sa", label: "さ行", from: "さ" },
  { slug: "ta", label: "た行", from: "た" },
  { slug: "na", label: "な行", from: "な" },
  { slug: "ha", label: "は行", from: "は" },
  { slug: "ma", label: "ま行", from: "ま" },
  { slug: "ya", label: "や行", from: "ゃ" },
  { slug: "ra", label: "ら行", from: "ら" },
  { slug: "wa", label: "わ行", from: "ゎ" },
] as const

export const OTHER = { slug: "other", label: "その他" } as const

export const rowOf = (reading: string) => {
  // カタカナ→ひらがな
  const c = String.fromCharCode(
    ...[...reading.normalize("NFKC").slice(0, 1)].map((ch) => {
      const code = ch.charCodeAt(0)
      return code >= 0x30a1 && code <= 0x30f6 ? code - 0x60 : code
    })
  )
  if (!c || c < "ぁ" || c > "ゖ") return OTHER.slug
  return ROWS.findLast((r) => c >= r.from)!.slug
}
