import Link from "next/link"
import { notFound } from "next/navigation"
import { FC } from "react"
import { InArticleAd } from "@/components/in-article-ad"
import { Heading, Profile } from "@/components/profile"
import { nodeInfo } from "@/lib/db"
import { graphHref, nodeHref } from "@/lib/graph"

// 芸人・グループ詳細ページ本体（サーバー側で生成）
export const NodeDetail: FC<{ nodeId: string }> = ({ nodeId }) => {
  const info = nodeInfo(nodeId)
  if (!info) notFound()
  return (
    <article
      style={{
        maxWidth: 760,
        margin: "0 auto",
        background: "var(--surface)",
        border: "3px solid var(--line)",
        boxShadow: "6px 6px 0 var(--accent)",
        padding: "clamp(1rem, 4vw, 2rem)",
      }}
    >
      <Heading info={info} level={1} />
      <p style={{ margin: ".75rem 0 1rem" }}>
        <Link href={graphHref(nodeId)}>
          この{nodeId.startsWith("p:") ? "芸人" : "グループ"}
          を起点に関係性グラフを表示 →
        </Link>
      </p>
      <Profile
        info={info}
        renderOther={(l) => (
          <Link href={nodeHref(l.other)} style={{ fontWeight: "bold" }}>
            {l.otherName}
          </Link>
        )}
      />
      <InArticleAd />
    </article>
  )
}
