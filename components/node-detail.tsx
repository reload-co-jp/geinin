import Link from "next/link"
import { notFound } from "next/navigation"
import { FC } from "react"
import { JsonLd } from "@/components/json-ld"
import { InArticleAd } from "@/components/in-article-ad"
import { Heading, Profile } from "@/components/profile"
import { agencyName, nodeInfo, raceIds, sameName } from "@/lib/db"
import {
  graphHref,
  nodeHref,
  parseRaceId,
  raceId,
  raceSlugs,
} from "@/lib/graph"

const SITE = "https://geinin.reload.co.jp"

// 芸人・グループ詳細ページ本体（サーバー側で生成）
export const NodeDetail: FC<{ nodeId: string }> = ({ nodeId }) => {
  const info = nodeInfo(nodeId)
  if (!info) notFound()
  const noun = { p: "芸人", g: "コンビ", x: "大会", v: "番組" }[nodeId[0]]
  const homonyms = sameName(nodeId)
  const race = parseRaceId(nodeId)
  const raceYears = race
    ? raceIds
        .flatMap((id) => {
          const r = parseRaceId(id)
          return r?.competition === race.competition ? [r.year] : []
        })
        .sort((a, b) => a - b)
    : []
  const prevYear = race && raceYears.findLast((y) => y < race.year)
  const nextYear = race && raceYears.find((y) => y > race.year)
  const crumbs: [string, string][] = [
    ["トップ", "/"],
    ...(race
      ? ([
          ["賞レース", "/races/"],
          [race.competition, `/races/${raceSlugs[race.competition]}/`],
        ] as [string, string][])
      : nodeId.startsWith("v:")
        ? ([["テレビ番組", "/programs/"]] as [string, string][])
        : ([["一覧", "/list/"]] as [string, string][])),
    [info.name, nodeHref(nodeId)],
  ]
  return (
    <article
      style={{
        maxWidth: 760,
        margin: "0 auto",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderTop: "6px solid var(--accent)",
        borderRadius: "var(--radius)",
        padding: "clamp(1rem, 4vw, 2rem)",
      }}
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map(([name, href], i) => ({
            "@type": "ListItem",
            position: i + 1,
            name,
            item: `${SITE}${href}`,
          })),
        }}
      />
      <nav aria-label="パンくずリスト" style={{ fontSize: ".75rem" }}>
        {crumbs.map(([name, href], i) => (
          <span key={href}>
            {i > 0 && " › "}
            {i < crumbs.length - 1 ? <Link href={href}>{name}</Link> : name}
          </span>
        ))}
      </nav>
      <Heading info={info} level={1} />
      {race && (
        <nav
          aria-label="開催年"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: ".5rem",
            fontSize: ".875rem",
          }}
        >
          <span>
            {prevYear && (
              <Link href={nodeHref(raceId(race.competition, prevYear))}>
                ← {prevYear}
              </Link>
            )}
          </span>
          <Link href={`/races/${raceSlugs[race.competition]}/`}>歴代決勝</Link>
          <span>
            {nextYear && (
              <Link href={nodeHref(raceId(race.competition, nextYear))}>
                {nextYear} →
              </Link>
            )}
          </span>
        </nav>
      )}
      {homonyms.length > 0 && (
        <p style={{ fontSize: ".8rem", marginTop: ".5rem" }}>
          同名の登録:{" "}
          {homonyms.map((n, i) => (
            <span key={n.id}>
              {i > 0 && "、"}
              <Link href={nodeHref(n.id)}>{n.label}</Link>
              {agencyName(n.agencyId) && `（${agencyName(n.agencyId)}）`}
            </span>
          ))}
          <span style={{ color: "var(--muted)" }}>
            {" "}
            ※別人か同一人物の重複登録かは未確認
          </span>
        </p>
      )}
      <p style={{ margin: "1rem 0" }}>
        <Link href={graphHref(nodeId)} className="cta">
          この{noun}の相関図を見る →
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
      <p style={{ fontSize: ".8rem", marginTop: "1.5rem" }}>
        <a
          href={`https://github.com/reload-co-jp/geinin/issues/new?title=${encodeURIComponent(`情報の誤り: ${info.name}`)}&body=${encodeURIComponent(`${SITE}${nodeHref(nodeId)}\n\n誤っている箇所:\n正しい内容:\n根拠（URLなど）:`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          掲載情報の誤りを報告する
        </a>
      </p>
      <InArticleAd />
    </article>
  )
}
