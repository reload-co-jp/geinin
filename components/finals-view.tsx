"use client"
import Link from "next/link"
import { FC, ReactNode, useState } from "react"
import { Photo } from "@/components/photo"

type Entry = {
  id: string
  name: string
  href: string
  photo: string | null
  rank: number | null
}
export type YearData = {
  year: number
  races: { name: string; href: string; entries: Entry[] }[]
}

const rankLabel = (rank: number | null) =>
  rank === null ? "順位不明" : rank === 1 ? "優勝" : `${rank}位`

// 大会別の表と、年ごとの全大会決勝一覧を切り替える
export const FinalsView: FC<{
  byCompetition: ReactNode
  years: YearData[]
}> = ({ byCompetition, years }) => {
  const [year, setYear] = useState<number>()
  const current = years.find((y) => y.year === year)
  return (
    <>
      <label style={{ fontSize: ".875rem" }}>
        表示{" "}
        <select
          value={year ?? ""}
          onChange={(e) =>
            setYear(e.target.value ? +e.target.value : undefined)
          }
        >
          <option value="">大会別（全年）</option>
          {years.map((y) => (
            <option key={y.year} value={y.year}>
              {y.year}年
            </option>
          ))}
        </select>
      </label>
      {current
        ? current.races.map((r) => (
            <section key={r.name} className="rc-panel rc-race">
              <h3 style={{ fontSize: "1rem" }}>
                <Link href={r.href}>
                  {r.name} {current.year}
                </Link>
              </h3>
              <ol
                style={{ listStyle: "none", padding: 0, fontSize: ".875rem" }}
              >
                {r.entries.map((e) => (
                  <li
                    key={e.id}
                    style={{
                      display: "flex",
                      gap: ".5rem",
                      alignItems: "center",
                      padding: ".35rem .5rem",
                      borderBottom:
                        "1px solid color-mix(in srgb, var(--line) 20%, transparent)",
                      fontWeight: e.rank === 1 ? "bold" : undefined,
                      background: e.rank === 1 ? "var(--pop)" : undefined,
                    }}
                  >
                    <span style={{ minWidth: "5em" }}>{rankLabel(e.rank)}</span>
                    <Photo src={e.photo} size={e.rank === 1 ? 56 : 32} />
                    <Link href={e.href}>{e.name}</Link>
                  </li>
                ))}
              </ol>
            </section>
          ))
        : byCompetition}
    </>
  )
}
