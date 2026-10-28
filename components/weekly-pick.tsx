"use client"

import Link from "next/link"
import { FC, useSyncExternalStore } from "react"

export type Pick = {
  title: string
  kind: string
  description: string
  unverified: boolean
  href: string
  detail: string
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
    <article className="weekly">
      <span className="pf-row">
        <span className="sticker" data-tone="blue">
          {p.kind}
        </span>
        {p.unverified && (
          <span className="pf-badge" data-tone="warn">
            出典未照合
          </span>
        )}
      </span>
      <strong className="weekly-title">{p.title}</strong>
      <span className="weekly-desc">{p.description}</span>
      <span className="pf-row">
        <Link className="cta" href={p.detail}>
          人物の詳細を見る →
        </Link>
        <Link className="chip" href={p.href}>
          相関図でたどる
        </Link>
      </span>
    </article>
  )
}
