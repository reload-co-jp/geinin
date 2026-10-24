import Link from "next/link"
import { FC } from "react"
import { db, graph } from "@/lib/db"
import { nodeHref, raceId, raceSlugs } from "@/lib/graph"

// 大会ごとに、開催年を新しい順に並べ、優勝者と決勝進出組数を添える。
// rows は決勝へ進んだコンビを初進出順に並べ、年ごとの順位を持つ
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
  const rows = Object.entries(Object.groupBy(finals, (r) => r.entrant_id))
    .map(([id, rs = []]) => ({
      id,
      name: graph.nodes.get(id)?.label ?? id,
      href: nodeHref(id),
      byYear: new Map(rs.map((r) => [r.year, r.rank])),
      first: Math.min(...rs.map((r) => r.year)),
    }))
    .sort((a, b) => a.first - b.first)
  return { name, slug, years, rows }
})

export type Race = (typeof races)[number]

export const Years: FC<{ years: Race["years"] }> = ({ years }) => (
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

const cell = {
  padding: ".35rem .5rem",
  borderBottom: "1px solid var(--line)",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const

// 縦横スクロール時も年と出場者名が見えるよう固定する
const sticky = { position: "sticky", background: "var(--surface)" } as const
const head = { ...cell, ...sticky, top: 0, zIndex: 1 }
const nameCell = { ...cell, ...sticky, left: 0, textAlign: "left" } as const

// 出場者×開催年の順位表
export const FinalsTable: FC<{ race: Race }> = ({ race }) => {
  const years = race.years.toReversed()
  return (
    <div style={{ overflow: "auto", maxHeight: "70vh" }}>
      <table
        style={{
          borderCollapse: "collapse",
          background: "var(--surface)",
          fontSize: ".8rem",
        }}
      >
        <thead>
          <tr>
            <th style={{ ...head, ...nameCell, zIndex: 2 }}>出場者</th>
            {years.map((y) => (
              <th key={y.year} scope="col" style={head}>
                <Link href={y.href}>{y.year}</Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {race.rows.map((g) => (
            <tr key={g.id}>
              <th scope="row" style={nameCell}>
                <Link href={g.href}>{g.name}</Link>
              </th>
              {years.map(({ year }) => {
                const rank = g.byYear.get(year)
                return (
                  <td
                    key={year}
                    style={{
                      ...cell,
                      fontWeight: rank === 1 ? "bold" : undefined,
                      background:
                        rank === 1
                          ? "var(--pop)"
                          : rank !== undefined
                            ? "color-mix(in srgb, var(--accent) 20%, transparent)"
                            : undefined,
                    }}
                  >
                    {rank === undefined
                      ? ""
                      : rank === null
                        ? "●"
                        : rank === 1
                          ? "優勝"
                          : `${rank}位`}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 例年の目安（月単位）。年により前後する。from/to は 1〜12 の月
const SCHEDULE = [
  {
    name: "R-1グランプリ",
    spans: [
      { label: "予選", from: 1, to: 2 },
      { label: "決勝", from: 3, to: 3 },
      { label: "予選", from: 12, to: 12 },
    ],
  },
  {
    name: "THE SECOND",
    spans: [
      { label: "予選", from: 2, to: 4 },
      { label: "決勝", from: 5, to: 5 },
    ],
  },
  {
    name: "ABCお笑いグランプリ",
    spans: [
      { label: "予選", from: 5, to: 6 },
      { label: "決勝", from: 7, to: 7 },
    ],
  },
  {
    name: "ダブルインパクト",
    spans: [
      { label: "予選", from: 4, to: 6 },
      { label: "決勝", from: 7, to: 7 },
    ],
  },
  {
    name: "キングオブコント",
    spans: [
      { label: "予選", from: 6, to: 9 },
      { label: "決勝", from: 10, to: 10 },
    ],
  },
  {
    name: "M-1グランプリ",
    spans: [
      { label: "予選", from: 8, to: 11 },
      { label: "決勝", from: 12, to: 12 },
    ],
  },
  {
    name: "THE W",
    spans: [
      { label: "予選", from: 8, to: 11 },
      { label: "決勝", from: 12, to: 12 },
    ],
  },
]

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

// 開催時期の月別チャート。大会名は大会ページへリンクする
export const Schedule: FC = () => (
  <div style={{ overflowX: "auto" }}>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "10rem repeat(12, minmax(2.5rem, 1fr))",
        minWidth: 640,
        background: "var(--surface)",
        fontSize: ".8rem",
      }}
    >
      <div />
      {MONTHS.map((m) => (
        <div
          key={m}
          style={{
            textAlign: "center",
            padding: ".35rem 0",
            borderBottom: "2px solid var(--line)",
          }}
        >
          {m}月
        </div>
      ))}
      {SCHEDULE.map((c, row) => (
        <div key={c.name} style={{ display: "contents" }}>
          <div
            style={{
              gridRow: row + 2,
              gridColumn: 1,
              padding: ".5rem",
              borderBottom: "1px solid var(--line)",
              fontWeight: "bold",
            }}
          >
            {raceSlugs[c.name] ? (
              <Link href={`/races/${raceSlugs[c.name]}/`}>{c.name}</Link>
            ) : (
              c.name
            )}
          </div>
          {MONTHS.map((m) => (
            <div
              key={m}
              style={{
                gridRow: row + 2,
                gridColumn: m + 1,
                borderBottom: "1px solid var(--line)",
                borderLeft: "1px solid var(--line)",
              }}
            />
          ))}
          {c.spans.map((s) => (
            <div
              key={`${s.label}-${s.from}`}
              title={`${c.name} ${s.label} ${s.from}〜${s.to}月`}
              style={{
                gridRow: row + 2,
                gridColumn: `${s.from + 1} / ${s.to + 2}`,
                alignSelf: "center",
                margin: "0 2px",
                padding: ".15rem .35rem",
                borderRadius: 4,
                color: s.label === "決勝" ? "#fff" : "var(--text)",
                background:
                  s.label === "決勝"
                    ? "var(--accent)"
                    : "color-mix(in srgb, var(--accent) 25%, transparent)",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {s.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
)
