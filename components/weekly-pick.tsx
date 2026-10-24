"use client"

import Link from "next/link"
import { FC, useSyncExternalStore } from "react"

export type Pick = {
  title: string
  kind: string
  description: string
  unverified: boolean
  href: string
}

const WEEK = 7 * 24 * 60 * 60 * 1000

// 静的書き出しのため、どれを見せるかは閲覧時の週で決める（初回描画は先頭）
export const WeeklyPick: FC<{ picks: Pick[] }> = ({ picks }) => {
  const i = useSyncExternalStore(
    () => () => {},
    () => Math.floor(Date.now() / WEEK) % picks.length,
    () => 0
  )
  const p = picks[i]
  return (
    <Link href={p.href} className="weekly">
      <span className="sticker" data-tone="blue">
        {p.kind}
      </span>
      <strong className="weekly-title">{p.title}</strong>
      <span className="weekly-desc">{p.description}</span>
      {p.unverified && (
        <span style={{ fontSize: ".75rem", color: "var(--muted)" }}>
          ※出典未照合の情報です
        </span>
      )}
      <span className="weekly-go">グラフでたどる →</span>
    </Link>
  )
}
