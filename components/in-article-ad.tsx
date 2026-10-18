"use client"

import { FC, useEffect } from "react"

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

// AdSense 記事内広告（ローダーは app/layout.tsx で読み込み済み）
export const InArticleAd: FC = () => {
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
      style={{ display: "block", textAlign: "center", marginTop: "1.5rem" }}
      data-ad-layout="in-article"
      data-ad-format="fluid"
      data-ad-client="ca-pub-6542845006087970"
      data-ad-slot="4625326006"
    />
  )
}
