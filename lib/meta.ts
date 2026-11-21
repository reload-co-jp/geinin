// 芸人・コンビ詳細ページの title / description。
// 検索結果で選ばれやすいよう、検索されやすい語（年齢・相方・メンバー・結成年）を title に、
// 答えになる事実（生年月日・相方・結成年・最高成績）を description の先頭に置く
import {
  agencyName,
  db,
  groupById,
  nodeInfo,
  personById,
  sameName,
} from "@/lib/db"
import { rankLabel } from "@/lib/graph"

// カタカナをひらがなにし、空白を除く（読みと名前の比較用）
const kana = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[\s・]/g, "")
    .replace(/[\u30a1-\u30f6]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0x60)
    )

// 読みが未登録・名前から読めるとき（ひらがな・カタカナ名）は括弧を付けない
export const withReading = (e: { name: string; reading: string }) =>
  e.reading && kana(e.reading) !== kana(e.name)
    ? `${e.name}（${e.reading}）`
    : e.name

const jaDate = (d: string) =>
  d.replace(
    /^(\d+)-(\d+)-(\d+)$/,
    (_, y, m, dd) => `${y}年${Number(m)}月${Number(dd)}日`
  )

// 決勝の最高成績（同順位なら新しい年）。決勝進出が無ければ null
const bestFinal = (nodeId: string) => {
  const finals = (nodeInfo(nodeId)?.results ?? []).filter(
    (r) => r.stage === "決勝"
  )
  if (!finals.length) return null
  const b = finals.toSorted(
    (a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.year - a.year
  )[0]
  return `${b.competition}${b.year}${rankLabel(b.rank) || "決勝進出"}${finals.length > 1 ? `ほか決勝${finals.length}回` : ""}`
}

const sentence = (parts: (string | null | false | undefined)[]) => {
  const xs = parts.filter(Boolean)
  return xs.length ? `${xs.join("・")}。` : ""
}

export const personMeta = (id: string) => {
  const p = personById.get(id)
  if (!p) return null
  const agency = agencyName(p.agency_id)
  const ms = db.memberships.filter((m) => m.person_id === id)
  const current = ms.filter((m) => m.status === "current")
  const groups = current.flatMap((m) => groupById.get(m.group_id) ?? [])
  // 相方（現在のコンビの他メンバー）
  const partners = current.flatMap((m) =>
    db.memberships
      .filter(
        (x) =>
          x.group_id === m.group_id &&
          x.person_id !== id &&
          x.status === "current"
      )
      .flatMap((x) => personById.get(x.person_id)?.name ?? [])
  )
  // 「コンビ名 芸人名」で検索されるので、所属が1つならコンビ名を名前に添える
  const label =
    groups.length === 1 ? `${p.name}（${groups[0].name}）` : withReading(p)
  const topic = p.birth_date
    ? `の年齢・プロフィール・${groups.length ? "相方" : "経歴"}`
    : `のプロフィール・${groups.length ? "相方" : "経歴"}・同期`
  const homonym = sameName(`p:${id}`).length && agency ? ` - ${agency}` : ""
  const best = bestFinal(`p:${id}`)
  const school = p.training_school
    ? `${p.training_school}${p.training_school_term ? `${p.training_school_term}期` : ""}出身`
    : null
  const description = [
    `${withReading(p)}は${
      groups.length
        ? `${groups.map((g) => g.name).join("・")}のメンバー${partners.length ? `（相方: ${partners.slice(0, 3).join("・")}）` : ""}`
        : "お笑い芸人"
    }。`,
    sentence([
      p.birth_date && `${jaDate(p.birth_date)}生まれ`,
      school,
      p.debut_date && `${p.debut_date.slice(0, 4)}年デビュー`,
      agency && `${agency}所属`,
    ]),
    best && `${best}。`,
    "師弟・同期・共演の関係と賞レース成績を掲載。",
  ].join("")
  return { title: `${label}${topic}${homonym}`, description }
}

export const groupMeta = (id: string) => {
  const g = groupById.get(id)
  if (!g) return null
  const agency = agencyName(g.agency_id)
  const ms = db.memberships.filter((m) => m.group_id === id)
  const names = (status: "current" | "former") =>
    ms
      .filter((m) => m.status === status)
      .flatMap((m) => personById.get(m.person_id)?.name ?? [])
  const current = names("current")
  const former = names("former")
  const type = { combi: "コンビ", trio: "トリオ", unit: "グループ" }[
    g.group_type
  ]
  const topic = g.formation_date
    ? "のメンバー・結成年・賞レース戦績"
    : "のメンバー・賞レース戦績"
  const homonym = sameName(`g:${id}`).length && agency ? ` - ${agency}` : ""
  const best = bestFinal(`g:${id}`)
  const description = [
    `${withReading(g)}は${current.length ? `${current.join("・")}の` : ""}${g.dissolution_date ? `元${type}` : type}。`,
    former.length ? `元メンバーに${former.slice(0, 3).join("・")}。` : "",
    sentence([
      g.formation_date && `${g.formation_date.slice(0, 4)}年結成`,
      g.dissolution_date && `${g.dissolution_date.slice(0, 4)}年解散`,
      agency && `${agency}所属`,
    ]),
    best && `${best}。`,
    "メンバー変遷・賞レース戦績と関係性を掲載。",
  ].join("")
  return { title: `${g.name}${topic}${homonym}`, description }
}
