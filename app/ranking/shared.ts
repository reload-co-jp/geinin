// 賞レースの決勝結果から集計するランキング（サーバー側の静的生成専用）。
// 登録済みの決勝結果（db.competitionResults の stage === "決勝"）だけを数える。
// 決勝結果を足せばビルドのたびに自動で更新される
import { agencyName, db, graph } from "@/lib/db"
import { raceSlugs } from "@/lib/graph"

const finals = db.competitionResults.filter(
  (r) => r.stage === "決勝" && raceSlugs[r.competition_name]
)
const allYears = finals.map((r) => r.year)
export const PERIOD = {
  from: Math.min(...allYears),
  to: Math.max(...allYears),
}
// 大会ごとの集計期間（登録されている決勝の最初と最後の年）
export const COMPETITIONS = Object.keys(raceSlugs).flatMap((name) => {
  const ys = finals
    .filter((r) => r.competition_name === name)
    .map((r) => r.year)
  return ys.length
    ? [
        {
          name,
          slug: raceSlugs[name],
          from: Math.min(...ys),
          to: Math.max(...ys),
        },
      ]
    : []
})

export type RankRow = {
  rank: number
  id: string
  name: string
  photo: string | null
  value: number
  // 数字の内訳（「M-1 3回・KOC 2回」など）
  detail: string
}

// 同じ値は同じ順位にし、次の順位は人数分とばす（1, 2, 2, 4…）
const ranked = (rows: Omit<RankRow, "rank">[]): RankRow[] => {
  const sorted = rows.toSorted(
    (a, b) => b.value - a.value || a.name.localeCompare(b.name, "ja")
  )
  return sorted.map((r, i) => ({
    ...r,
    rank:
      i > 0 && sorted[i - 1].value === r.value
        ? sorted.findIndex((x) => x.value === r.value) + 1
        : i + 1,
  }))
}

const breakdown = (rs: typeof finals, unit = "回") =>
  [...Map.groupBy(rs, (r) => r.competition_name)]
    .toSorted(([, a], [, b]) => b.length - a.length)
    .map(([c, xs]) => `${c} ${xs.length}${unit}`)
    .join("・")

const node = (id: string) => ({
  id,
  name: graph.nodes.get(id)?.label ?? id,
  photo: graph.nodes.get(id)?.photo ?? null,
})

// 出場名義（コンビ・トリオ・ピン）ごとの決勝進出回数
const byEntrant = Map.groupBy(finals, (r) => r.entrant_id)
const entrantFinals = ranked(
  [...byEntrant].map(([id, rs]) => ({
    ...node(id),
    value: rs.length,
    detail: breakdown(rs),
  }))
)

// 出場名義ごとの優勝回数
const entrantWins = ranked(
  [...byEntrant].flatMap(([id, rs]) => {
    const wins = rs.filter((r) => r.rank === 1)
    return wins.length
      ? [
          {
            ...node(id),
            value: wins.length,
            detail: wins
              .toSorted((a, b) => a.year - b.year)
              .map((r) => `${r.competition_name}${r.year}`)
              .join("・"),
          },
        ]
      : []
  })
)

// 芸人個人の決勝進出回数。ピンでの出場と、所属した（元を含む）コンビ・グループでの出場を合算する
const personFinals = ranked(
  db.people.flatMap((p) => {
    const rs = [
      `p:${p.id}`,
      ...db.memberships
        .filter((m) => m.person_id === p.id)
        .map((m) => `g:${m.group_id}`),
    ].flatMap((id) => byEntrant.get(id) ?? [])
    if (!rs.length) return []
    const names = [...new Set(rs.map((r) => r.entrant_id))]
    return [
      {
        ...node(`p:${p.id}`),
        value: rs.length,
        detail:
          breakdown(rs) +
          (names.length > 1
            ? `（${names.map((id) => graph.nodes.get(id)?.label ?? id).join("・")}）`
            : ""),
      },
    ]
  })
)

// 事務所ごとの決勝進出のべ組数。所属は現在の登録で数える（出場当時の所属ではない）
const agencyFinals = ranked(
  [
    ...Map.groupBy(
      finals.filter((r) => graph.nodes.get(r.entrant_id)?.agencyId),
      (r) => graph.nodes.get(r.entrant_id)!.agencyId!
    ),
  ].map(([agencyId, rs]) => ({
    id: agencyId,
    name: agencyName(agencyId) ?? agencyId,
    photo: null,
    value: rs.length,
    detail: `${new Set(rs.map((r) => r.entrant_id)).size}組・優勝${rs.filter((r) => r.rank === 1).length}回`,
  }))
)

export type Ranking = {
  slug: string
  title: string
  // 何を数えたか（ページの冒頭と title・description に使う）
  lead: string
  unit: string
  rows: RankRow[]
  href: (row: RankRow) => string
}

const entityHref = (r: RankRow) =>
  r.id.startsWith("g:")
    ? `/groups/${r.id.slice(2)}/`
    : `/people/${r.id.slice(2)}/`

// 全件並べると数百行になるので、ページには上位だけを出す
export const RANKING_LIMIT = 100

export const rankings: Ranking[] = [
  {
    slug: "finals",
    title: "賞レース決勝進出回数ランキング",
    lead: "コンビ・トリオ・ピンの出場名義ごとに、賞レースの決勝に進んだ回数を数えています。",
    unit: "回",
    rows: entrantFinals,
    href: entityHref,
  },
  {
    slug: "wins",
    title: "賞レース優勝回数ランキング",
    lead: "出場名義ごとに、賞レースの決勝で優勝した回数を数えています。",
    unit: "回",
    rows: entrantWins,
    href: entityHref,
  },
  {
    slug: "people",
    title: "芸人別 賞レース決勝進出回数ランキング",
    lead: "芸人個人ごとに、ピンでの出場と所属した（解散・脱退したものを含む）コンビ・グループでの出場を合算して数えています。複数の名義で決勝に進んだ芸人は、括弧内に名義を並べています。",
    unit: "回",
    rows: personFinals,
    href: entityHref,
  },
  {
    slug: "agencies",
    title: "事務所別 賞レース決勝進出ランキング",
    lead: "決勝に進んだのべ組数を、出場者の現在の所属事務所で数えています。出場当時の所属ではありません。",
    unit: "組",
    rows: agencyFinals,
    href: (r) => `/agencies/${r.id}/`,
  },
]

export const rankingBySlug = new Map(rankings.map((r) => [r.slug, r]))
