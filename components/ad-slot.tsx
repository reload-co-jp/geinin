"use client"

import { ComponentProps, FC, useEffect } from "react"

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

// AdSense 広告ユニット（ローダーは app/layout.tsx で読み込み済み）
export const AdSlot: FC<ComponentProps<"ins"> & { "data-ad-slot": string }> = (
  props,
) => {
  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // 開発時の二重 push などは無視
    }
  }, [])
  return (
    <ins
      className="adsbygoogle"
      data-ad-client="ca-pub-6542845006087970"
      {...props}
      // 中の広告 iframe はインライン要素なので text-align で中央に寄せる
      style={{ display: "block", textAlign: "center", ...props.style }}
    />
  )
}
