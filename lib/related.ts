// 詳細ページの回遊・読み物用の情報（サーバー側の静的生成専用）。
// おすすめの芸人・年表・よくある質問を登録データから組み立てる
import {
  agencyName,
  db,
  edgeIndex,
  graph,
  groupById,
  personById,
} from "@/lib/db"
import { rankLabel, termYear, type EdgeKind, type GNode } from "@/lib/graph"
import type { NodeInfo } from "@/lib/node-info"

export type Recommendation = {
  id: string
  name: string
  photo: string | null
  // カードに添える「なぜおすすめか」
  reason: string
}

const isEntity = (n: GNode | undefined): n is GNode =>
  n?.kind === "person" || n?.kind === "group"

// 人気の目安。関係の数（同期・番組は数が多く偏るので除く）と賞レース出場数
const popularity = new Map<string, number>()
for (const e of graph.edges) {
  if (e.kind === "doki" || e.kind === "tv") continue
  for (const id of [e.source, e.target])
    popularity.set(id, (popularity.get(id) ?? 0) + 1)
}
for (const r of db.competitionResults)
  popularity.set(r.entrant_id, (popularity.get(r.entrant_id) ?? 0) + 2)
const pop = (id: string) =>
  (popularity.get(id) ?? 0) + (graph.nodes.get(id)?.photo ? 1 : 0)

const groupsOfPerson = Map.groupBy(db.memberships, (m) => m.person_id)
const membersOfGroup = Map.groupBy(db.memberships, (m) => m.group_id)

// 芸人の活動開始年。デビュー年が未登録なら所属グループの最初の結成年で補う
const startYear = (nodeId: string): number | null => {
  const n = graph.nodes.get(nodeId)
  if (n?.year) return n.year
  if (!nodeId.startsWith("p:")) return null
  const ys = (groupsOfPerson.get(nodeId.slice(2)) ?? []).flatMap((m) => {
    const y = graph.nodes.get(`g:${m.group_id}`)?.year
    return y ? [y] : []
  })
  return ys.length ? Math.min(...ys) : null
}

// 中継の種類ごとの重みと、おすすめ理由の言い方
const VIA: Partial<
  Record<EdgeKind, { weight: number; reason: (via: GNode) => string }>
> = {
  member: { weight: 5, reason: (v) => `${v.label}のメンバー` },
  former_member: { weight: 4, reason: (v) => `${v.label}の元メンバー` },
  master: { weight: 4, reason: (v) => `${v.label}と師弟関係` },
  senpai_kohai: { weight: 3, reason: (v) => `${v.label}の先輩・後輩` },
  family: { weight: 4, reason: (v) => `${v.label}の親族` },
  rival: { weight: 3, reason: (v) => `${v.label}のライバル` },
  costar: { weight: 2, reason: (v) => `${v.label}と共演` },
  competition: { weight: 2, reason: (v) => `${v.label} 決勝で競演` },
  tv: { weight: 1, reason: (v) => `番組「${v.label}」で共演` },
}
// 出演者が多すぎる番組・大会は関係が薄いので中継にしない
const RELAY_LIMIT = 40

// 起点のつながり（芸人ならその所属コンビも起点に含める）の先にいる芸人・コンビを、
// 経由の強さと人気で並べる。直接つながっている相手は詳細ページに出ているので除く
const nearBy = (nodeId: string): Recommendation[] => {
  const origins = [
    nodeId,
    ...(nodeId.startsWith("p:")
      ? (groupsOfPerson.get(nodeId.slice(2)) ?? []).map(
          (m) => `g:${m.group_id}`
        )
      : []),
  ]
  const direct = new Set(
    (edgeIndex.get(nodeId) ?? []).map((e) =>
      e.source === nodeId ? e.target : e.source
    )
  )
  const score = new Map<string, { s: number; reason: string; w: number }>()
  const add = (id: string, w: number, reason: string) => {
    if (id === nodeId || origins.includes(id) || !isEntity(graph.nodes.get(id)))
      return
    const cur = score.get(id)
    score.set(id, {
      s: (cur?.s ?? 0) + w,
      // 理由は一番強いつながりを見せる
      ...(cur && cur.w >= w ? { reason: cur.reason, w: cur.w } : { reason, w }),
    })
  }
  for (const o of origins)
    for (const e of edgeIndex.get(o) ?? []) {
      const via = VIA[e.kind]
      if (!via) continue
      const viaId = e.source === o ? e.target : e.source
      const viaNode = graph.nodes.get(viaId)
      if (!viaNode) continue
      const nexts = (edgeIndex.get(viaId) ?? []).filter(
        (x) => x.kind === e.kind
      )
      if (nexts.length > RELAY_LIMIT) continue
      for (const x of nexts) {
        const id = x.source === viaId ? x.target : x.source
        // 相方は「◯◯のメンバー」より「相方」と言う方が分かりやすい
        const reason =
          nodeId.startsWith("p:") &&
          viaId.startsWith("g:") &&
          id.startsWith("p:") &&
          (e.kind === "member" || e.kind === "former_member")
            ? `${e.kind === "member" ? "" : "元"}相方（${viaNode.label}）`
            : via.reason(viaNode)
        add(id, via.weight, reason)
      }
    }
  return [...score]
    .filter(([id]) => !direct.has(id))
    .toSorted(([a, x], [b, y]) => y.s - x.s || pop(b) - pop(a))
    .map(([id, { reason }]) => {
      const n = graph.nodes.get(id)!
      return { id, name: n.label, photo: n.photo, reason }
    })
}

const entityNodes = [...graph.nodes.values()].filter(isEntity)
const byAgency = Map.groupBy(
  entityNodes.filter((n) => n.agencyId),
  (n) => n.agencyId!
)

// 同じ事務所で活動開始が近い順。年が分からなければ人気順
const sameAgency = (nodeId: string): Recommendation[] => {
  const n = graph.nodes.get(nodeId)
  if (!n?.agencyId) return []
  const y = startYear(nodeId)
  const agency = agencyName(n.agencyId)
  return (byAgency.get(n.agencyId) ?? [])
    .filter((m) => m.id !== nodeId)
    .map((m) => ({ m, y: startYear(m.id) }))
    .toSorted(
      (a, b) =>
        (y === null
          ? 0
          : Math.abs((a.y ?? 9999) - y) - Math.abs((b.y ?? 9999) - y)) ||
        pop(b.m.id) - pop(a.m.id)
    )
    .map(({ m, y: my }) => ({
      id: m.id,
      name: m.label,
      photo: m.photo,
      reason:
        y !== null && my === y
          ? `同じ${agency}・同年${m.kind === "group" ? "結成" : "デビュー"}`
          : `同じ${agency}${my ? `・${my}年${m.kind === "group" ? "結成" : "デビュー"}` : ""}`,
    }))
}

// 同じ年に活動を始めた芸人・コンビ（事務所を問わず人気順）
const byYear = Map.groupBy(
  entityNodes.filter((n) => startYear(n.id)),
  (n) => `${n.kind}:${startYear(n.id)}`
)
const sameYear = (nodeId: string, y: number, peers?: string[]) =>
  (
    peers?.flatMap((id) => graph.nodes.get(id) ?? []) ??
    (byYear.get(`${graph.nodes.get(nodeId)?.kind}:${y}`) ?? []).toSorted(
      (a, b) => pop(b.id) - pop(a.id)
    )
  )
    .filter((m) => m.id !== nodeId)
    .map((m) => ({
      id: m.id,
      name: m.label,
      photo: m.photo,
      reason: `${y}年${m.kind === "group" ? "結成" : "デビュー"}${m.agencyId ? `・${agencyName(m.agencyId)}` : ""}`,
    }))

export const RECOMMEND_SHOWN = 8

// 詳細ページ下部の「次に見る」。重複しないよう上の枠から順に取る
// doki: 同期ページと同じ顔ぶれにするため、芸人は同期ページの年と並び（人気順）を渡す
export const recommendations = (
  nodeId: string,
  doki?: { year: number; ids: string[] }
) => {
  // 自分・直接つながっている相手（詳細ページに出ている）・所属コンビは出さない
  const seen = new Set([
    nodeId,
    ...(edgeIndex.get(nodeId) ?? []).map((e) =>
      e.source === nodeId ? e.target : e.source
    ),
  ])
  const take = (xs: Recommendation[]) => {
    const out: Recommendation[] = []
    for (const x of xs) {
      if (out.length >= RECOMMEND_SHOWN) break
      if (seen.has(x.id)) continue
      seen.add(x.id)
      out.push(x)
    }
    return out
  }
  const n = graph.nodes.get(nodeId)
  const y = doki?.year ?? startYear(nodeId)
  return {
    near: take(nearBy(nodeId)),
    agency: take(sameAgency(nodeId)),
    agencyId: n?.agencyId ?? null,
    year: y ? take(sameYear(nodeId, y, doki?.ids)) : [],
    startYear: y,
  }
}

export type TimelineEntry = { year: number; date: string; text: string }

const y4 = (d: string | null | undefined) =>
  d && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : null

// 年表。生年・養成所入学・デビュー・結成・加入脱退・賞レース決勝・解散を年順に並べる
export const timelineOf = (nodeId: string, info: NodeInfo): TimelineEntry[] => {
  const [kind, id] = nodeId.split(":")
  const out: TimelineEntry[] = []
  const push = (d: string | null | undefined, text: string) => {
    const year = y4(d)
    if (year) out.push({ year, date: d!, text })
  }
  if (kind === "p") {
    const p = personById.get(id)
    if (!p) return []
    push(p.birth_date, "誕生")
    if (p.training_school && p.training_school_term) {
      const y = termYear(p.training_school, p.training_school_term)
      if (y)
        push(String(y), `${p.training_school}${p.training_school_term}期に入学`)
    }
    push(p.debut_date, "デビュー")
    for (const m of groupsOfPerson.get(id) ?? []) {
      const g = groupById.get(m.group_id)
      if (!g) continue
      const type = { combi: "コンビ", trio: "トリオ", unit: "ユニット" }[
        g.group_type
      ]
      // 加入日が結成日と同じ（または未登録）なら結成メンバー
      if (!m.start_date || m.start_date === g.formation_date)
        push(g.formation_date, `${type}「${g.name}」を結成`)
      else push(m.start_date, `${type}「${g.name}」に加入`)
      if (m.end_date && m.end_date !== g.dissolution_date)
        push(m.end_date, `「${g.name}」を脱退`)
      push(g.dissolution_date, `「${g.name}」解散`)
    }
  } else if (kind === "g") {
    const g = groupById.get(id)
    if (!g) return []
    push(g.formation_date, "結成")
    for (const m of membersOfGroup.get(id) ?? []) {
      const p = personById.get(m.person_id)
      if (!p) continue
      if (m.start_date && m.start_date !== g.formation_date)
        push(m.start_date, `${p.name}が加入`)
      if (m.end_date && m.end_date !== g.dissolution_date)
        push(m.end_date, `${p.name}が脱退`)
    }
    push(g.dissolution_date, "解散")
  } else return []
  for (const r of info.results)
    if (r.stage === "決勝")
      out.push({
        year: r.year,
        date: String(r.year),
        text: `${r.competition} 決勝${r.rank ? ` ${rankLabel(r.rank)}` : "進出"}${r.via ? `（${r.via}）` : ""}`,
      })
  // 同じ年の中では日付の分かるものを先に。日付が同じなら登録順
  return out.toSorted((a, b) => a.year - b.year || a.date.localeCompare(b.date))
}

const byTerm = Map.groupBy(
  db.people.filter((p) => p.training_school && p.training_school_term),
  (p) => `${p.training_school}${p.training_school_term}`
)

export type Faq = { q: string; a: string }

const NAMES = 5
const names = (xs: string[]) =>
  xs.slice(0, NAMES).join("・") + (xs.length > NAMES ? "ほか" : "")

// よくある質問。検索されやすい問い（相方・事務所・芸歴・年齢・成績）に登録データで答える
export const faqOf = (nodeId: string, info: NodeInfo): Faq[] => {
  const [kind, id] = nodeId.split(":")
  const out: Faq[] = []
  const name = info.name
  out.push({ q: `${name}の読み方は？`, a: `「${info.reading}」と読みます。` })
  const agency = info.agencyId && agencyName(info.agencyId)
  if (agency) out.push({ q: `${name}の所属事務所は？`, a: `${agency}です。` })
  const now = new Date().getFullYear()
  const finals = info.results.filter((r) => r.stage === "決勝")
  const best = finals
    .filter((r) => r.rank)
    .toSorted((a, b) => a.rank! - b.rank!)[0]
  if (kind === "p") {
    const p = personById.get(id)
    if (!p) return []
    const ms = groupsOfPerson.get(id) ?? []
    const current = ms.filter((m) => m.status === "current")
    if (current.length) {
      const parts = current.flatMap((m) => {
        const g = groupById.get(m.group_id)
        if (!g) return []
        const partners = (membersOfGroup.get(g.id) ?? [])
          .filter((x) => x.person_id !== id && x.status === "current")
          .flatMap((x) => personById.get(x.person_id)?.name ?? [])
        return [
          partners.length
            ? `${g.name}の${names(partners)}`
            : `${g.name}（相方は未登録）`,
        ]
      })
      out.push({ q: `${name}の相方は誰？`, a: `${parts.join("、")}です。` })
    }
    const former = ms
      .filter((m) => m.status === "former")
      .flatMap((m) => groupById.get(m.group_id)?.name ?? [])
    if (former.length)
      out.push({
        q: `${name}の過去のコンビ・グループは？`,
        a: `${names(former)}に在籍していました。`,
      })
    if (p.debut_date) {
      const y = y4(p.debut_date)!
      out.push({
        q: `${name}の芸歴は何年？`,
        a: `${y}年デビューで、${now}年時点で芸歴${now - y}年です。`,
      })
    }
    if (info.birth_date)
      out.push({
        q: `${name}は何歳？生年月日は？`,
        a: `${info.birth_date.replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日`)}生まれです。`,
      })
    if (p.training_school) {
      const doki = p.training_school_term
        ? (byTerm.get(`${p.training_school}${p.training_school_term}`) ?? [])
            .filter((x) => x.id !== id)
            .toSorted((a, b) => pop(`p:${b.id}`) - pop(`p:${a.id}`))
            .map((x) => x.name)
        : []
      out.push({
        q: `${name}の出身養成所${doki.length ? "と同期" : ""}は？`,
        a: `${p.training_school}${p.training_school_term ? `${p.training_school_term}期` : ""}出身です。${doki.length ? `同期には${names(doki)}がいます。` : ""}`,
      })
    }
    const masters = info.links
      .filter((l) => l.label === "師匠")
      .map((l) => l.otherName)
    if (masters.length)
      out.push({ q: `${name}の師匠は？`, a: `${names(masters)}です。` })
  } else if (kind === "g") {
    const g = groupById.get(id)
    if (!g) return []
    const ms = membersOfGroup.get(id) ?? []
    const current = ms
      .filter((m) => m.status === "current")
      .flatMap((m) => personById.get(m.person_id)?.name ?? [])
    const former = ms
      .filter((m) => m.status === "former")
      .flatMap((m) => personById.get(m.person_id)?.name ?? [])
    if (current.length || former.length)
      out.push({
        q: `${name}のメンバーは？`,
        a: [
          current.length && `${current.join("・")}の${current.length}人です。`,
          former.length && `過去には${former.join("・")}が在籍していました。`,
        ]
          .filter(Boolean)
          .join(""),
      })
    if (g.formation_date) {
      const y = y4(g.formation_date)!
      out.push({
        q: `${name}はいつ結成？`,
        a: g.dissolution_date
          ? `${y}年結成、${y4(g.dissolution_date)}年に解散しています。`
          : `${y}年結成で、${now}年時点で結成${now - y}年目です。`,
      })
    }
  } else return []
  // 成績の登録が無いのは「出場していない」とは限らないので問い自体を出さない
  if (info.results.length)
    out.push({
      q: `${name}の賞レースの成績は？`,
      a: finals.length
        ? `決勝に${finals.length}回進出しています${best ? `（最高成績は${best.year}年${best.competition}${rankLabel(best.rank)}）` : ""}。`
        : `${info.results
            .toReversed()
            .slice(0, 3)
            .map((r) => `${r.year}年${r.competition}${r.stage}`)
            .join("、")}などに進出しています。`,
    })
  return out
}
