"use client"
import Link from "next/link"
import { FC, useState, useSyncExternalStore } from "react"
import type { Race } from "@/app/races/shared"
import { Photo } from "@/components/photo"

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

type Row = Race["rows"][number]
const best = (g: Row) =>
  Math.min(...[...g.byYear.values()].map((r) => r ?? Infinity))
const SORTS: Record<string, (a: Row, b: Row) => number> = {
  初進出順: (a, b) => a.first - b.first,
  進出回数順: (a, b) => b.byYear.size - a.byYear.size || a.first - b.first,
  最高順位順: (a, b) => best(a) - best(b) || b.byYear.size - a.byYear.size,
}

// 出場者×開催年の順位表
export const FinalsTable: FC<{ race: Race }> = ({ race }) => {
  const [sort, setSort] = useState("初進出順")
  const years = race.years.toReversed()
  const rows = race.rows.toSorted(SORTS[sort])
  return (
    <>
      <label style={{ fontSize: ".875rem" }}>
        並び順{" "}
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.keys(SORTS).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
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
            {rows.map((g) => (
              <tr key={g.id}>
                <th scope="row" style={nameCell}>
                  <span
                    style={{
                      display: "flex",
                      gap: ".4rem",
                      alignItems: "center",
                    }}
                  >
                    <Photo src={g.photo} size={24} />
                    <Link href={g.href}>{g.name}</Link>
                  </span>
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
    </>
  )
}

const noop = () => () => {}

// 閲覧時の月から次に決勝がある大会を出す（静的生成のためクライアントで判定）
export const NextFinal: FC<{
  finals: { name: string; href?: string; month: number }[]
}> = ({ finals }) => {
  const month = useSyncExternalStore(
    noop,
    () => new Date().getMonth() + 1,
    () => 0
  )
  if (!month) return null
  const wait = (m: number) => (m - month + 12) % 12
  const min = Math.min(...finals.map((f) => wait(f.month)))
  const next = finals.filter((f) => wait(f.month) === min)
  return (
    <p className="rc-next">
      <span className="sticker" data-tone="red">
        NEXT
      </span>
      {min === 0 ? "今月" : `${next[0].month}月`}の決勝{" "}
      {next.map((f, i) => (
        <span key={f.name}>
          {i > 0 && "、"}
          {f.href ? <Link href={f.href}>{f.name}</Link> : f.name}
        </span>
      ))}
    </p>
  )
}
