import Link from "next/link"
import { notFound } from "next/navigation"
import { FC } from "react"
import { JsonLd } from "@/components/json-ld"
import { InArticleAd } from "@/components/in-article-ad"
import { Heading, Profile } from "@/components/profile"
import { FaqList, NextReads, Timeline } from "@/components/related"
import { years } from "@/app/doki/shared"
import { OTHER, ROWS, rowOf } from "@/app/list/shared"
import { agencyName, nodeInfo, raceIds, sameName } from "@/lib/db"
import {
  graphHref,
  nodeHref,
  parseRaceId,
  raceId,
  raceSlugs,
} from "@/lib/graph"
import { faqOf, recommendations, timelineOf } from "@/lib/related"

const SITE = "https://geinin.reload.co.jp"

// 芸人・グループ詳細ページ本体（サーバー側で生成）
export const NodeDetail: FC<{ nodeId: string }> = ({ nodeId }) => {
  const info = nodeInfo(nodeId)
  if (!info) notFound()
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
  // 一覧・同期ページへの導線は芸人・グループのみ
  const listed = /^[pg]:/.test(nodeId)
  const row = listed
    ? [...ROWS, OTHER].find((r) => r.slug === rowOf(info.reading))
    : undefined
  const doki = nodeId.startsWith("p:")
    ? years.find(([, ps]) => ps.some((p) => p.id === nodeId))
    : undefined
  const dokiYear = doki?.[0]
  const crumbs: [string, string][] = [
    ["トップ", "/"],
    ...(race
      ? ([
          ["賞レース", "/races/"],
          [race.competition, `/races/${raceSlugs[race.competition]}/`],
        ] as [string, string][])
      : nodeId.startsWith("v:")
        ? ([["テレビ番組", "/programs/"]] as [string, string][])
        : ([
            ["一覧", "/list/"],
            ...(row ? [[row.label, `/list/${row.slug}/`]] : []),
          ] as [string, string][])),
    [info.name, nodeHref(nodeId)],
  ]
  // 芸人・グループだけ、年表・よくある質問と次に見る芸人を出す
  const timeline = listed ? timelineOf(nodeId, info) : []
  const faqs = listed ? faqOf(nodeId, info) : []
  const recs = listed
    ? recommendations(
        nodeId,
        doki && { year: doki[0], ids: doki[1].map((p) => p.id) }
      )
    : null
  return (
    // 見た目は app/reset.css の .nd（詳細パネルとは分ける）
    <article className="nd">
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
      {faqs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }}
        />
      )}
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
        <Link href={graphHref(nodeId)} style={{ fontSize: ".875rem" }}>
          相関図で見る →
        </Link>
        {dokiYear && (
          <Link
            href={`/doki/${dokiYear}/`}
            style={{ marginLeft: "1rem", fontSize: ".875rem" }}
          >
            {dokiYear}年デビューの同期芸人 →
          </Link>
        )}
      </p>
      <Profile
        info={info}
        toc
        extra={[
          ...(timeline.length >= 2
            ? [
                {
                  title: "年表",
                  body: <Timeline entries={timeline} />,
                  position: "top" as const,
                },
              ]
            : []),
          ...(faqs.length > 0
            ? [
                {
                  title: "よくある質問",
                  body: <FaqList faqs={faqs} />,
                  position: "bottom" as const,
                },
              ]
            : []),
        ]}
        renderOther={(l) => (
          <Link href={nodeHref(l.other)} style={{ fontWeight: "bold" }}>
            {l.otherName}
          </Link>
        )}
      />
      {recs && (
        <NextReads
          name={info.name}
          {...recs}
          agencyName={agencyName(recs.agencyId)}
          group={nodeId.startsWith("g:")}
          dokiHref={dokiYear ? `/doki/${dokiYear}/` : null}
        />
      )}
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
