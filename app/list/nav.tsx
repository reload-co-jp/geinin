import Link from "next/link"
import { FC } from "react"
import { db } from "@/lib/db"
import { OTHER, ROWS, rowOf } from "./shared"

const counts = new Map(
  [...Map.groupBy([...db.people, ...db.groups], (x) => rowOf(x.reading))].map(
    ([k, v]) => [k, v.length]
  )
)

// 五十音の行ナビ。件数つきで、表示中の行は aria-current で示す
export const KanaNav: FC<{ current?: string }> = ({ current }) => (
  <nav className="kana" aria-label="五十音">
    {[...ROWS, OTHER].map((r) => (
      <Link
        key={r.slug}
        href={`/list/${r.slug}/`}
        aria-current={r.slug === current ? "page" : undefined}
      >
        {r.label}
        <small>{(counts.get(r.slug) ?? 0).toLocaleString()}</small>
      </Link>
    ))}
  </nav>
)
