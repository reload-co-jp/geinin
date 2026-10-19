import type { Db, Group, Person } from "@/lib/types"

// scripts/import-agencies.mjs が出力する data/agencies.json の形
export type AgencyTalent = {
  agency: string
  url: string
  name: string
  kana: string | null
  // null は詳細ページ未取得
  members: { name: string; kana: string | null }[] | null
}
export type AgencyDump = { fetched_at: string; talents: AgencyTalent[] }

const key = (s: string) => s.normalize("NFKC").replace(/[\s・]/g, "")
const hiragana = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
// 読みが無いときは、名前が仮名だけならそれを読みとする
const reading = (name: string, kana: string | null) =>
  kana ?? (/^[ぁ-んァ-ヶー・\s]+$/.test(name) ? hiragana(name) : "")
const slug = (url: string) => url.match(/([^/?=]+?)(?:\.html)?\/?$/)![1]
const sourceId = (t: AgencyTalent) => `${t.agency}:${slug(t.url)}`

// 吉本以外の事務所公式サイトの取得結果を統合する。既存レコードは id を保ち、空欄だけ補う
export const mergeAgencies = (base: Db, dump: AgencyDump): Db => {
  const people = base.people.map((p) => ({ ...p }))
  const groups = base.groups.map((g) => ({ ...g }))
  const memberships = [...base.memberships]
  const peopleByName = new Map(
    people.flatMap((p) => [p.name, ...p.aliases].map((n) => [key(n), p]))
  )
  const groupsByName = new Map(
    groups.flatMap((g) => [g.name, ...g.aliases].map((n) => [key(n), g]))
  )
  const membersOf = (gid: string) =>
    memberships
      .filter((m) => m.group_id === gid)
      .map((m) => people.find((p) => p.id === m.person_id)!)
  const join = (person_id: string, group_id: string) =>
    memberships.push({
      person_id,
      group_id,
      role: null,
      start_date: null,
      end_date: null,
      status: "current",
    })
  const newPerson = (
    id: string,
    name: string,
    kana: string | null,
    t: AgencyTalent
  ): Person => {
    const p: Person = {
      id,
      name,
      reading: reading(name, kana),
      aliases: [],
      agency_id: t.agency,
      debut_date: null,
      birth_date: null,
      training_school: null,
      training_school_term: null,
      biography: null,
      activity_status: null,
      source_ids: [sourceId(t)],
    }
    people.push(p)
    return p
  }
  const tag = (e: Person | Group, t: AgencyTalent) => {
    e.agency_id ??= t.agency
    e.source_ids = [...e.source_ids, sourceId(t)]
  }

  for (const t of dump.talents) {
    const id = `${t.agency}-${slug(t.url)}`
    // 本人の名前だけが載る個人ページはメンバー扱いしない
    const members = (t.members ?? []).filter((m) => key(m.name) !== key(t.name))
    const existing =
      groupsByName.get(key(t.name)) ?? peopleByName.get(key(t.name))
    if (existing) {
      tag(existing, t)
      if ("group_type" in existing) {
        // 既存メンバーは「松尾」→「松尾駿」のような短縮表記でも照合し、メンバー未登録のグループにだけ追加する
        const current = membersOf(existing.id)
        for (const m of members) {
          const p = current.find((p) => key(p.name).endsWith(key(m.name)))
          if (p) tag(p, t)
        }
        if (!current.length)
          members.forEach((m, i) =>
            join(newPerson(`${id}-${i + 1}`, m.name, m.kana, t).id, existing.id)
          )
      }
      continue
    }
    // 詳細未取得のものは種別が判らないため新規には作らない
    if (!t.members) continue
    if (!members.length) {
      peopleByName.set(key(t.name), newPerson(id, t.name, t.kana, t))
      continue
    }
    const g: Group = {
      id,
      name: t.name,
      reading: reading(t.name, t.kana),
      aliases: [],
      group_type:
        members.length === 2 ? "combi" : members.length === 3 ? "trio" : "unit",
      formation_date: null,
      dissolution_date: null,
      agency_id: t.agency,
      activity_status: null,
      source_ids: [sourceId(t)],
    }
    groups.push(g)
    groupsByName.set(key(g.name), g)
    members.forEach((m, i) =>
      join(newPerson(`${id}-${i + 1}`, m.name, m.kana, t).id, g.id)
    )
  }

  const agencyName = new Map(base.agencies.map((a) => [a.id, a.name]))
  return {
    ...base,
    people,
    groups,
    memberships,
    sources: [
      ...base.sources,
      ...dump.talents.map((t) => ({
        id: sourceId(t),
        source_name: `${agencyName.get(t.agency) ?? t.agency} 公式プロフィール「${t.name}」`,
        source_url: t.url,
        source_type: "official" as const,
        published_at: null,
        checked_at: dump.fetched_at,
      })),
    ],
  }
}
