// 芸人・コンビ詳細ページの title / description。
// title は「名前（コンビ名・メンバー）のプロフィール｜そのページで分かること」。
// 「分かること」には実際に登録されている項目だけを並べるので、ページごとに変わる。
// description は登録データだけから組み立てた紹介文で、検索の答えになる事実
// （所属・相方・生年月日・養成所・賞レース成績）を先に置く
import {
  agencyName,
  db,
  groupById,
  nodeInfo,
  personById,
  sameName,
} from "@/lib/db"
import { rankLabel } from "@/lib/graph"
import { stageRank } from "@/lib/m1"
import type { NodeInfo } from "@/lib/node-info"

// 半角カナ・全角英数を揃える（「ﾚﾅﾁｮ」→「レナチョ」）。検索語は全角カナで入るため
export const display = (s: string) => s.normalize("NFKC")

// カタカナをひらがなにし、空白を除く（読みと名前の比較用）
const kana = (s: string) =>
  display(s)
    .replace(/[\s・]/g, "")
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))

// 読みが未登録・名前から読めるとき（ひらがな・カタカナ名）は括弧を付けない
export const withReading = (e: { name: string; reading: string }) =>
  e.reading && kana(e.reading) !== kana(e.name)
    ? `${display(e.name)}（${e.reading}）`
    : display(e.name)

// "1982-04-01" → "1982年4月1日"。部分日付（"1982" / "1982-04"）はある分だけ
const jaDate = (d: string) =>
  /^\d{4}(-\d{2}){0,2}$/.test(d)
    ? d
        .split("-")
        .map((n, i) => `${Number(n)}${"年月日"[i]}`)
        .join("")
    : d

const list = (xs: string[], n = 3) =>
  xs.slice(0, n).join("・") + (xs.length > n ? "ほか" : "")

// 賞レース成績の一文。決勝があれば最高成績と回数、無ければ一番先まで進んだ予選、
// それも無ければ M-1 予選への出場回数
export const resultSentence = (results: NodeInfo["results"]) => {
  if (!results.length) return null
  const finals = results.filter((r) => r.stage === "決勝")
  if (finals.length) {
    const b = finals.toSorted(
      (a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.year - a.year
    )[0]
    const best = `${b.competition}${b.year}${rankLabel(b.rank) ? `で${rankLabel(b.rank)}` : "で決勝進出"}`
    return finals.length > 1
      ? `${best}、賞レース決勝に計${finals.length}回進出。`
      : `${best}。`
  }
  const b = results.toSorted(
    (a, b) => stageRank(b.stage) - stageRank(a.stage) || b.year - a.year
  )[0]
  if (["準決勝", "準々決勝"].includes(b.stage))
    return `${b.competition}${b.year}${b.stage}進出。`
  const years = [...new Set(results.map((r) => r.year))].sort()
  return years.length > 1
    ? `${b.competition}予選に${years[0]}年から${years.length}回出場（最高${b.stage}）。`
    : `${b.competition}${b.year}に出場（${b.stage}）。`
}

// title に並べる項目は多すぎると切れるので4つまで
const TOPICS = 4
const titleOf = (label: string, topics: (string | false | null)[]) => {
  const ts = topics.filter((t): t is string => !!t).slice(0, TOPICS)
  return ts.length
    ? `${label}のプロフィール｜${ts.join("・")}`
    : `${label}のプロフィール`
}

const TYPE = { combi: "コンビ", trio: "トリオ", unit: "グループ" } as const

// 師弟関係。title には確度を問わず載っている項目として、description には
// 出典の確度が高いものだけを名前で書く（ページ本文では確度付きで全件出す）
const masters = (id: string) => {
  const rs = db.relationships.filter((r) => r.relationship_type === "master")
  const name = (pid: string) => personById.get(pid)?.name ?? []
  const high = rs.filter((r) => r.confidence === "high")
  return {
    masters: high
      .filter((r) => r.target_person_id === id)
      .flatMap((r) => name(r.source_person_id)),
    pupils: high
      .filter((r) => r.source_person_id === id)
      .flatMap((r) => name(r.target_person_id)),
    hasMaster: rs.some((r) => r.target_person_id === id),
    hasPupil: rs.some((r) => r.source_person_id === id),
  }
}

export const personMeta = (id: string) => {
  const p = personById.get(id)
  if (!p) return null
  const info = nodeInfo(`p:${id}`)
  const agency = agencyName(p.agency_id)
  const ms = db.memberships.filter((m) => m.person_id === id)
  const groupsBy = (status: "current" | "former") =>
    ms
      .filter((m) => m.status === status)
      .flatMap((m) => groupById.get(m.group_id) ?? [])
  const current = groupsBy("current")
  const former = groupsBy("former")
  // 相方（現在のコンビ・グループの他メンバー）
  const partners = current.flatMap((g) =>
    db.memberships
      .filter(
        (x) =>
          x.group_id === g.id && x.person_id !== id && x.status === "current"
      )
      .flatMap((x) => personById.get(x.person_id)?.name ?? [])
      .map(display)
  )
  const combi = current.some((g) => g.group_type === "combi")
  // 「コンビ名 芸人名」で検索されるので、所属が1つならコンビ名を名前に添える
  // 読みが長いと title が切れるので、その場合は読みを付けない
  const label =
    current.length === 1
      ? `${display(p.name)}（${display(current[0].name)}）`
      : p.reading.length > 10
        ? display(p.name)
        : withReading(p)
  const alive = p.activity_status !== "deceased"
  const fullBirth = !!p.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(p.birth_date)
  const school = p.training_school
    ? `${p.training_school}${p.training_school_term ? `${p.training_school_term}期` : ""}`
    : null
  const rel = masters(id)
  const results = info?.results ?? []
  const hasFinal = results.some((r) => r.stage === "決勝")
  const homonym = sameName(`p:${id}`).length && agency ? ` - ${agency}` : ""
  const title =
    titleOf(label, [
      fullBirth && alive && "年齢",
      partners.length > 0 && (combi ? "相方" : "メンバー"),
      !current.length && former.length > 0 && "元コンビ",
      p.training_school_term && "同期",
      rel.hasMaster && "師匠",
      rel.hasPupil && "弟子",
      hasFinal ? "賞レース成績" : results.length > 0 && "M-1戦績",
      agency && "所属事務所",
      p.debut_date && "芸歴",
    ]) + homonym

  const description = [
    `${withReading(p)}は、${agency ? `${agency}所属の` : ""}お笑い芸人。`,
    current.length > 0 &&
      `${list(current.map((g) => display(g.name)))}のメンバー${partners.length ? `で、${combi ? "相方" : "メンバー"}は${list(partners)}` : ""}。`,
    former.length > 0 &&
      `${current.length ? "過去に" : "元"}${list(former.map((g) => display(g.name)))}${current.length ? "にも所属" : "のメンバー"}。`,
    (fullBirth || school || p.debut_date) &&
      [
        p.birth_date && `${jaDate(p.birth_date)}生まれ`,
        school && `${school}出身`,
        p.debut_date && `${p.debut_date.slice(0, 4)}年デビュー`,
      ]
        .filter(Boolean)
        .join("、") + "。",
    rel.masters.length > 0 && `師匠は${list(rel.masters)}。`,
    rel.pupils.length > 0 && `弟子に${list(rel.pupils)}。`,
    resultSentence(results),
  ]
    .filter(Boolean)
    .join("")
  return { title, description }
}

export const groupMeta = (id: string) => {
  const g = groupById.get(id)
  if (!g) return null
  const info = nodeInfo(`g:${id}`)
  const agency = agencyName(g.agency_id)
  const ms = db.memberships.filter((m) => m.group_id === id)
  const names = (status: "current" | "former") =>
    ms
      .filter((m) => m.status === status)
      .flatMap((m) => personById.get(m.person_id)?.name ?? [])
      .map(display)
  const current = names("current")
  const former = names("former")
  const type = TYPE[g.group_type]
  // 「コンビ名 メンバー」で検索されるので、短ければメンバー名を名前に添える
  const label =
    current.length > 0 && current.length <= 3 && current.join("").length <= 14
      ? `${display(g.name)}（${current.join("・")}）`
      : display(g.name)
  const results = info?.results ?? []
  const hasFinal = results.some((r) => r.stage === "決勝")
  const homonym = sameName(`g:${id}`).length && agency ? ` - ${agency}` : ""
  const title =
    titleOf(label, [
      current.length > 0 && "メンバー",
      g.formation_date && "結成年",
      g.dissolution_date && "解散",
      hasFinal ? "賞レース成績" : results.length > 0 && "M-1戦績",
      former.length > 0 && "元メンバー",
      agency && "所属事務所",
    ]) + homonym

  const description = [
    `${withReading(g)}は、${agency ? `${agency}所属の` : ""}${current.length ? `${list(current, 5)}による` : ""}お笑い${type}${g.dissolution_date ? `（${g.dissolution_date.slice(0, 4)}年解散）` : ""}。`,
    g.formation_date && `${jaDate(g.formation_date)}結成。`,
    former.length > 0 && `元メンバーに${list(former)}。`,
    resultSentence(results),
  ]
    .filter(Boolean)
    .join("")
  return { title, description }
}
