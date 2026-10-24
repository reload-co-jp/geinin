import Link from "next/link"
import { FC } from "react"
import { db, graph } from "@/lib/db"
import { nodeHref, raceId, raceSlugs } from "@/lib/graph"

// 大会ごとに、開催年を新しい順に並べ、優勝者と決勝進出組数を添える
export const races = Object.entries(raceSlugs).map(([name, slug]) => {
  const finals = db.competitionResults.filter(
    (r) => r.stage === "決勝" && r.competition_name === name
  )
  const years = [...new Set(finals.map((r) => r.year))]
    .sort((a, b) => b - a)
    .map((year) => {
      const rs = finals.filter((r) => r.year === year)
      const winner = rs.find((r) => r.rank === 1)
      return {
        year,
        href: nodeHref(raceId(name, year)),
        count: rs.length,
        winner: winner && {
          name: graph.nodes.get(winner.entrant_id)?.label ?? winner.entrant_id,
          href: nodeHref(winner.entrant_id),
        },
      }
    })
  return { name, slug, years }
})

export const Years: FC<{ years: (typeof races)[number]["years"] }> = ({
  years,
}) => (
  <ul
    style={{
      listStyle: "none",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
      gap: ".25rem 1rem",
      fontSize: ".875rem",
    }}
  >
    {years.map((y) => (
      <li key={y.year}>
        <Link href={y.href}>{y.year}</Link>
        <span style={{ color: "var(--muted)" }}> {y.count}組</span>
        {y.winner && (
          <>
            {" "}
            優勝 <Link href={y.winner.href}>{y.winner.name}</Link>
          </>
        )}
      </li>
    ))}
  </ul>
)
