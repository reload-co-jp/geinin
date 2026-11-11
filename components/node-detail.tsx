import Link from "next/link"
import { notFound } from "next/navigation"
import { FC } from "react"
import { JsonLd } from "@/components/json-ld"
import { InArticleAd } from "@/components/in-article-ad"
import { Heading, Profile } from "@/components/profile"
import { FaqList, NextReads, Timeline } from "@/components/related"
import { Photo } from "@/components/photo"
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
import { groupById, groupsOfPerson, membersOfGroup, personById, graph } from "@/lib/db"
import { nodeHref as nodeHrefLib } from "@/lib/graph"

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
  // 所属コンビ・グループ（芸人）
  const personGroups = nodeId.startsWith("p:")
    ? (groupsOfPerson.get(nodeId.slice(2)) ?? [])
        .map((m) => groupById.get(m.group_id))
        .filter((g): g is typeof g & { id: string; name: string; group_type: string } => !!g)
        .map((g) => ({
          id: g.id,
          name: g.name,
          type: { combi: "コンビ", trio: "トリオ", unit: "ユニット" }[g.group_type],
          formation_date: g.formation_date,
          dissolution_date: g.dissolution_date,
        }))
    : []
  // メンバー（コンビ・グループ）
  const groupMembers = nodeId.startsWith("g:")
    ? (membersOfGroup.get(nodeId.slice(2)) ?? [])
        .map((m) => personById.get(m.person_id))
        .filter((p): p is typeof p & { id: string; name: string } => !!p)
        .map((p) => ({
          id: p.id,
          name: p.name,
        }))
    : []
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
          ...(personGroups.length > 0
            ? [
                {
                  title: "所属コンビ・グループ",
                  body: (
                    <ul className="pf-list">
                      {personGroups.map((g) => (
                        <li key={g.id}>
                          <Link href={nodeHrefLib(`g:${g.id}`)} style={{ fontWeight: "bold" }}>
                            {g.name}
                          </Link>
                          <span className="pf-muted pf-small">
                            {" "}
                            ({g.type})
                            {g.formation_date && ` ${g.formation_date.slice(0, 4)}年結成`}
                            {g.dissolution_date && `～${g.dissolution_date.slice(0, 4)}年解散`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ),
                  position: "top" as const,
                },
              ]
            : []),
          ...(groupMembers.length > 0
            ? [
                {
                  title: "メンバー",
                  body: (
                    <ul className="pf-cast">
                      {groupMembers.map((m) => (
                        <li key={m.id}>
                          <Photo src={graph.nodes.get(`p:${m.id}`)?.photo ?? null} size={48} />
                          <span className="pf-cast-body">
                            <Link href={nodeHrefLib(`p:${m.id}`)} style={{ fontWeight: "bold" }}>
                              {m.name}
                            </Link>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ),
                  position: "top" as const,
                },
              ]
            : []),
          ...(recs?.agency.length
            ? [
                {
                  title: `同じ${agencyName(recs.agencyId) || "事務所"}の芸人`,
                  body: (
                    <ul className="pf-cast">
                      {recs.agency.slice(0, 8).map((r) => (
                        <li key={r.id}>
                          <Photo src={r.photo} size={48} />
                          <span className="pf-cast-body">
                            <span className="pf-muted pf-small">
                              {r.id.startsWith("g:") ? "コンビ・グループ" : "芸人"}
                            </span>
                            <Link href={nodeHrefLib(r.id)} style={{ fontWeight: "bold" }}>
                              {r.name}
                            </Link>
                            <span className="pf-muted pf-small">{r.reason}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ),
                  position: "top" as const,
                },
              ]
            : []),
          ...(dokiYear && recs?.year.length
            ? [
                {
                  title: `${dokiYear}年デビューの同期芸人`,
                  body: (
                    <ul className="pf-cast">
                      {recs.year.slice(0, 8).map((r) => (
                        <li key={r.id}>
                          <Photo src={r.photo} size={48} />
                          <span className="pf-cast-body">
                            <span className="pf-muted pf-small">
                              {r.id.startsWith("g:") ? "コンビ・グループ" : "芸人"}
                            </span>
                            <Link href={nodeHrefLib(r.id)} style={{ fontWeight: "bold" }}>
                              {r.name}
                            </Link>
                            <span className="pf-muted pf-small">{r.reason}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ),
                  position: "top" as const,
                },
              ]
            : []),
          ...(recs?.venues.length
            ? [
                {
                  title: "よく出演する劇場",
                  body: (
                    <ul className="nd-chips">
                      {recs.venues.slice(0, 5).map((v) => (
                        <li key={v.slug}>
                          <Link className="chip" href={`/venues/${v.slug}/`}>
                            {v.name}
                            <small>{v.count}公演</small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ),
                  position: "top" as const,
                },
              ]
            : []),
          ...(recs?.prelim.length
            ? [
                {
                  title: "M-1予選で同じ組だった芸人",
                  body: (
                    <ul className="pf-cast">
                      {recs.prelim.slice(0, 8).map((r) => (
                        <li key={r.id}>
                          <Photo src={r.photo} size={48} />
                          <span className="pf-cast-body">
                            <span className="pf-muted pf-small">
                              {r.id.startsWith("g:") ? "コンビ・グループ" : "芸人"}
                            </span>
                            <Link href={nodeHrefLib(r.id)} style={{ fontWeight: "bold" }}>
                              {r.name}
                            </Link>
                            <span className="pf-muted pf-small">{r.reason}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ),
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
