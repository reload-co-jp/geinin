import Link from "next/link"
import { FC } from "react"
import { nodeHref } from "@/lib/graph"
import type { Entrant } from "./shared"

export const weekday = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
  timeZone: "UTC",
})

export const dayLabel = (date: string | null) =>
  date ? weekday.format(new Date(date)) : "日程・会場の掲載なし"

export const Name: FC<{ e: Entrant }> = ({ e }) =>
  e.nodeId ? <Link href={nodeHref(e.nodeId)}>{e.name}</Link> : <>{e.name}</>

// 見出しと出場組の並び
export const Heat: FC<{ title: string; entrants: Entrant[] }> = ({
  title,
  entrants,
}) => (
  <section>
    <h2 className="pf-section">
      {title}
      <small className="pf-muted"> {entrants.length}組</small>
    </h2>
    <p style={{ fontSize: ".85rem", lineHeight: 1.9 }}>
      {entrants.map((e, i) => (
        <span key={e.url}>
          {i > 0 && " ／ "}
          <Name e={e} />
        </span>
      ))}
    </p>
  </section>
)
