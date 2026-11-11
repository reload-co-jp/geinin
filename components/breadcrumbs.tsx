import Link from "next/link"
import { FC } from "react"
import { JsonLd } from "@/components/json-ld"

const SITE = "https://geinin.reload.co.jp"

// パンくずリスト。表示用のナビと検索エンジン向けの BreadcrumbList を同時に出す。
// 最後の要素は現在のページ（リンクにしない）
export const Breadcrumbs: FC<{ items: [string, string][] }> = ({ items }) => (
  <>
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map(([name, href], i) => ({
          "@type": "ListItem",
          position: i + 1,
          name,
          item: `${SITE}${href}`,
        })),
      }}
    />
    <nav aria-label="パンくずリスト" style={{ fontSize: ".75rem" }}>
      {items.map(([name, href], i) =>
        i < items.length - 1 ? (
          <span key={href}>
            <Link href={href}>{name}</Link> ›{" "}
          </span>
        ) : (
          <span key={href}>{name}</span>
        )
      )}
    </nav>
  </>
)
