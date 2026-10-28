import type { Db, Group, Person } from "@/lib/types"

// scripts/import-yoshimoto.mjs が出力する data/yoshimoto.json の形
export type YoshimotoTalent = {
  id: number
  name: string
  kana: string | null
  categories: string[]
  formed: string | null
  groups: number[]
  members: {
    id: number | null
    name: string
    kana: string | null
    position: string | null
  }[]
  birth: string | null
  origin: string | null
  photo?: string | null
}
export type YoshimotoDump = {
  source: string
  fetched_at: string
  talents: YoshimotoTalent[]
}

const COMEDY = new Set(["芸人", "新喜劇", "落語家"])
const REGION = "東京|大阪|名古屋|福岡|岡山|広島|札幌|北海道|沖縄|京都|仙台"

// 公式プロフィールの誤記の訂正
const ORIGIN_FIX: Record<string, string> = {
  東京NSC230期: "東京NSC30期", // たかひら（おふくろパラダイス）
}

// 「東京NSC29期」「NSC大阪39期」「2002年 NSC東京校 8期生」→ NSC東京 / 29
export const parseOrigin = (origin: string | null) => {
  const s = (origin && (ORIGIN_FIX[origin] ?? origin))?.normalize("NFKC") ?? ""
  // 「一般 33期扱い」「NSC大阪校 NSC31期扱い」「入社 24期扱い」は期生と同じ扱い。校名がなければ大阪校
  const equiv = s.match(
    /(?:NSC|一般|入社)(\D{0,10}?)(\d+)\s*期\s*(?:扱い|と同期)/
  )
  const m =
    s.match(new RegExp(`(${REGION})\\s*NSC\\s*校?\\s*(\\d+)\\s*期`)) ??
    s.match(new RegExp(`NSC\\s*(${REGION})\\s*校?\\s*(\\d+)\\s*期`)) ??
    (equiv && ["", equiv[1].match(new RegExp(REGION))?.[0] ?? "大阪", equiv[2]])
  // 受賞歴だけが書かれている場合はデビュー年ではない
  const year = /受賞/.test(s) ? null : (s.match(/(19|20)\d{2}/)?.[0] ?? null)
  return {
    school: m ? `NSC${m[1] === "北海道" ? "札幌" : m[1]}` : null,
    term: m ? Number(m[2]) : null,
    year,
  }
}

// 「1970年 入門 西川きよし」「滝あきらに入門(1979年)」「2019年笑福亭鶴笑一門入門」
// 「その他宮川大助花子師匠に弟子入り」「1972年 入門 父・河内家菊水」→ 師匠名
export const parseMaster = (origin: string | null) => {
  const seg = origin
    ?.normalize("NFKC")
    .replace(/\([^)]*\)?/g, "")
    .split(/[/、,]/)
    .find((x) => /入門|弟子入り/.test(x))
  if (!seg) return null
  const name = seg
    .replace(/(19|20)\d{2}\s*年?\s*(\d{1,2}\s*月)?\s*(\d{1,2}\s*日)?/g, "")
    .replace(/\S*(NSC|\d+期|オーディション)\S*/g, "")
    .replace(/入門|弟子入り|入社|一門|師匠:?|その他|父・/g, "")
    .trim()
    .replace(/に$/, "")
    .trim()
  return name ? { name, father: seg.includes("父・") } : null
}

// 公式プロフィール上の旧名・代数表記・誤記を現在の芸名へ寄せる（本人ページの襲名記載などで確認できるもの）
const MASTER_ALIAS: Record<string, string> = {
  桂三枝: "桂文枝", // 2012年 六代桂文枝襲名
  "6代目桂文枝": "桂文枝",
  六代桂文枝: "桂文枝",
  桂きん枝: "桂小文枝", // 2019年 四代桂小文枝襲名
  四代目林家染丸: "林家染丸",
  二代目笑福亭松之助: "笑福亭松之助",
  亭八方: "月亭八方",
}

// NFKC で全角空白・半角中黒も通常の空白・中黒になる
const key = (s: string) => s.normalize("NFKC").replace(/[\s・]/g, "")

const sourceId = (id: number) => `yoshimoto:${id}`

// 吉本公式プロフィールの取得結果を手入力データへ統合する。既存レコードは手入力側の id を保ち、空欄だけ補う
export const mergeYoshimoto = (base: Db, dump: YoshimotoDump): Db => {
  const byId = new Map(dump.talents.map((t) => [t.id, t]))
  const isGroup = (t: YoshimotoTalent) =>
    t.members.length > 0 || t.formed !== null
  const comedy = (t: YoshimotoTalent) =>
    t.categories.some((c) => COMEDY.has(c)) ||
    t.groups.some((g) => byId.get(g)?.categories.some((c) => COMEDY.has(c)))
  const talents = dump.talents.filter(comedy)

  const people = base.people.map((p) => ({ ...p }))
  const groups = base.groups.map((g) => ({ ...g }))
  const memberships = [...base.memberships]
  const peopleByName = new Map(
    people.flatMap((p) => [p.name, ...p.aliases].map((n) => [key(n), p]))
  )
  const groupsByName = new Map(
    groups.flatMap((g) => [g.name, ...g.aliases].map((n) => [key(n), g]))
  )
  const localId = new Map<number, string>()

  // グループを先に処理し、既存グループのメンバーは「雅」→「トミーズ雅」のような短縮表記でも照合する
  for (const t of talents.filter(isGroup)) {
    const src = sourceId(t.id)
    const existing = groupsByName.get(key(t.name))
    if (existing) {
      existing.formation_date ??= t.formed
      existing.photo_url ??= t.photo
      existing.agency_id ??= "yoshimoto"
      existing.source_ids = [...existing.source_ids, src]
      localId.set(t.id, existing.id)
      continue
    }
    const size = t.members.length
    const g: Group = {
      id: `y${t.id}`,
      name: t.name,
      reading: t.kana ?? "",
      aliases: [],
      group_type: size === 2 ? "combi" : size === 3 ? "trio" : "unit",
      formation_date: t.formed,
      dissolution_date: null,
      agency_id: "yoshimoto",
      activity_status: null,
      photo_url: t.photo,
      source_ids: [src],
    }
    groups.push(g)
    groupsByName.set(key(g.name), g)
    localId.set(t.id, g.id)
  }
  const manualMemberOf = (t: YoshimotoTalent) =>
    t.groups
      .flatMap((g) =>
        base.memberships.filter((m) => m.group_id === localId.get(g))
      )
      .map((m) => people.find((p) => p.id === m.person_id)!)
      .find((p) => key(p.name).endsWith(key(t.name)))

  for (const t of talents.filter((t) => !isGroup(t))) {
    const src = sourceId(t.id)
    const o = parseOrigin(t.origin)
    const existing = peopleByName.get(key(t.name)) ?? manualMemberOf(t)
    if (existing) {
      existing.birth_date ??= t.birth
      existing.career_note ??= t.origin
      existing.photo_url ??= t.photo
      existing.training_school ??= o.school
      existing.training_school_term ??= o.term
      existing.debut_date ??= o.year
      existing.agency_id ??= "yoshimoto"
      existing.source_ids = [...existing.source_ids, src]
      localId.set(t.id, existing.id)
      continue
    }
    const p: Person = {
      id: `y${t.id}`,
      name: t.name,
      reading: t.kana ?? "",
      aliases: [],
      agency_id: "yoshimoto",
      debut_date: o.year,
      birth_date: t.birth,
      training_school: o.school,
      training_school_term: o.term,
      biography: null,
      career_note: t.origin,
      activity_status: null,
      photo_url: t.photo,
      source_ids: [src],
    }
    people.push(p)
    localId.set(t.id, p.id)
    if (!peopleByName.has(key(p.name))) peopleByName.set(key(p.name), p)
  }

  // 所属: グループページのメンバー欄と個人ページのグループリンクの両方から張る
  const seen = new Set(memberships.map((m) => `${m.person_id}:${m.group_id}`))
  const link = (personYid: number | null, groupYid: number) => {
    const pid = personYid === null ? undefined : localId.get(personYid)
    const gid = localId.get(groupYid)
    if (!pid || !gid || seen.has(`${pid}:${gid}`)) return
    seen.add(`${pid}:${gid}`)
    memberships.push({
      person_id: pid,
      group_id: gid,
      role: null,
      start_date: null,
      end_date: null,
      status: "current",
    })
  }
  for (const t of talents) {
    if (isGroup(t)) for (const m of t.members) link(m.id, t.id)
    else for (const g of t.groups) link(t.id, g)
  }

  // 師弟: 本人ページの「入門 ◯◯」。師匠がコンビならその現メンバー、データに居なければ名前だけの人物を作る
  const relationships = [...base.relationships]
  const pairs = new Set(
    relationships.map((r) => `${r.source_person_id}:${r.target_person_id}`)
  )
  const placeholder = (name: string, t: YoshimotoTalent): Person => {
    const p: Person = {
      id: `m${people.length}`,
      name,
      reading: "",
      aliases: [],
      agency_id: null,
      debut_date: null,
      birth_date: null,
      training_school: null,
      training_school_term: null,
      biography: "弟子の吉本興業公式プロフィールに入門先として記載。",
      activity_status: null,
      source_ids: [sourceId(t.id)],
    }
    people.push(p)
    peopleByName.set(key(name), p)
    return p
  }
  for (const t of talents) {
    const master = isGroup(t) ? null : parseMaster(t.origin)
    const disciple = localId.get(t.id)
    if (!master || !disciple) continue
    const k = MASTER_ALIAS[key(master.name)] ?? key(master.name)
    const person = peopleByName.get(key(k))
    const group = person ? undefined : groupsByName.get(key(k))
    const groupMembers = memberships
      .filter((m) => m.group_id === group?.id && m.status === "current")
      .map((m) => people.find((p) => p.id === m.person_id)!)
    const masters = person
      ? [person]
      : groupMembers.length
        ? groupMembers
        : [placeholder(master.name, t)]
    const year = parseOrigin(t.origin).year
    for (const m of masters) {
      if (m.id === disciple || pairs.has(`${m.id}:${disciple}`)) continue
      pairs.add(`${m.id}:${disciple}`)
      relationships.push({
        id: `y-master-${t.id}-${m.id}`,
        source_person_id: m.id,
        target_person_id: disciple,
        relationship_type: "master",
        start_date: year,
        end_date: null,
        description: `${year ? `${year}年 ` : ""}${group?.name ?? m.name}に入門${master.father ? "（実父）" : ""}。吉本興業公式プロフィールの記載による。`,
        evidence_type: "official_profile",
        confidence: "high",
        source_ids: [sourceId(t.id)],
        last_verified_at: dump.fetched_at,
      })
    }
  }

  return {
    ...base,
    people,
    groups,
    memberships,
    relationships,
    sources: [
      ...base.sources,
      ...talents.map((t) => ({
        id: sourceId(t.id),
        source_name: `吉本興業 公式プロフィール「${t.name}」`,
        source_url: `https://profile.yoshimoto.co.jp/talent/detail?id=${t.id}`,
        source_type: "official" as const,
        published_at: null,
        checked_at: dump.fetched_at,
      })),
    ],
  }
}
