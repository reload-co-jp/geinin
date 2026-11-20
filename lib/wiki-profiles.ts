import type { Db, Group, Person, Source } from "@/lib/types"
import { parseOrigin } from "@/lib/yoshimoto"

// scripts/collect-wiki-profiles.ts が日本語版 Wikipedia の基礎情報（Infobox）から取り出した事実。
// 本文は転載せず、日付・養成所・師匠の記事名だけを持つ。
export type WikiProfile = {
  // 記事名（出典リンクに使う）
  title: string
  birth_date?: string
  death_date?: string
  school?: string
  term?: number
  // 師匠欄にリンクされた記事名
  masters?: string[]
  formation_date?: string
  dissolution_date?: string
}
export type WikiProfileDump = {
  fetched_at: string
  // キーはノードID（p:<person id> / g:<group id>）。null は該当記事なし
  nodes: Record<string, WikiProfile | null>
}

// 記事冒頭の最初の Infobox を「項目名 → 値」にする。入れ子のテンプレート・リンク内の | は区切りとみなさない
export const parseInfobox = (raw: string) => {
  // コメント（記入例のテンプレート等）と脚注は値に含めない
  const wikitext = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
  const start = wikitext.search(/\{\{\s*Infobox/i)
  const fields = new Map<string, string>()
  if (start < 0) return fields
  let depth = 0
  let field = ""
  const flush = () => {
    const m = field.match(/^\s*([^=]+?)\s*=([\s\S]*)$/)
    if (m) fields.set(m[1], m[2].trim())
    field = ""
  }
  for (let i = start; i < wikitext.length; i++) {
    const two = wikitext.slice(i, i + 2)
    if (two === "{{" || two === "[[") {
      depth++
      if (depth > 1) field += two
      i++
    } else if (two === "}}" || two === "]]") {
      depth--
      if (depth === 0) break
      field += two
      i++
    } else if (wikitext[i] === "|" && depth === 1) flush()
    else if (depth >= 1) field += wikitext[i]
  }
  flush()
  return fields
}

const pad = (n: string) => n.padStart(2, "0")
const isYear = (y: number) => y >= 1850 && y <= 2100

// {{生年月日と年齢|1955|7|1}}・{{死亡年月日と没年齢|1955|7|1|2020|3|4}}・「1955年7月1日」→ 部分日付
export const parseDate = (value: string | undefined, nth = 0) => {
  if (!value) return null
  const tpl = value.match(/\{\{[^|}]+\|([^}]*)\}\}/)
  if (tpl) {
    const nums = tpl[1]
      .split("|")
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s))
    const [y, m, d] = nums.slice(nth * 3, nth * 3 + 3)
    if (y && isYear(Number(y)))
      return [y, m && pad(m), d && pad(d)].filter(Boolean).join("-")
  }
  const plain = [
    ...value
      .replace(/\[\[|\]\]/g, "")
      .matchAll(/((?:18|19|20)\d{2})年(?:\s*(\d{1,2})月(?:\s*(\d{1,2})日)?)?/g),
  ][nth]
  if (!plain) return null
  const [, y, m, d] = plain
  return [y, m && pad(m), d && pad(d)].filter(Boolean).join("-")
}

// 師匠欄のリンク先記事名。リンクのない名前は誤対応を避けるため使わない
export const linkTargets = (value: string | undefined) =>
  [...(value ?? "").matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)]
    .map((m) => m[1].trim())
    .filter((t) => !/^(ファイル|File|Category|画像):/i.test(t))
    // 「[[1993年]][[3月]]」のような日付リンク
    .filter((t) => !/^\d+(年|月|日|月\d+日)$/.test(t))

export const extractProfile = (
  wikitext: string,
  title: string,
  isGroup: boolean
): WikiProfile => {
  const f = parseInfobox(wikitext)
  const origin = parseOrigin(
    (f.get("出身") ?? "").replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
  )
  const profile: WikiProfile = { title }
  const set = <K extends keyof WikiProfile>(k: K, v: WikiProfile[K] | null) => {
    if (v !== null && v !== undefined && !(Array.isArray(v) && !v.length))
      profile[k] = v
  }
  if (isGroup) {
    set("formation_date", parseDate(f.get("結成年") ?? f.get("結成")))
    set("dissolution_date", parseDate(f.get("解散年") ?? f.get("解散")))
  } else {
    set("birth_date", parseDate(f.get("生年月日")))
    // 死亡年月日テンプレートは生年月日・没年月日の順に6つ並ぶ
    const death = f.get("没年月日")
    set("death_date", parseDate(death, /\{\{/.test(death ?? "") ? 1 : 0))
    set("masters", linkTargets(f.get("師匠")))
  }
  if (!isGroup) {
    set("school", origin.school)
    set("term", origin.term)
  }
  return profile
}

const sourceId = (title: string) => `wikipedia:${title}`
// 「明石家さんま」「千鳥 (お笑いコンビ)」→ 括弧の付記と空白を除いた名前
const bare = (title: string) =>
  title
    .replace(/\s*[(（][^)）]*[)）]\s*$/, "")
    .replace(/[\s\u3000]/g, "")
    .normalize("NFKC")

// 公式プロフィール等で埋まっていない項目だけを補い、師匠欄から師弟関係を足す
export const mergeWikiProfiles = (base: Db, dump: WikiProfileDump): Db => {
  const titles = new Set<string>()
  const used = (p: WikiProfile) => {
    titles.add(p.title)
    return sourceId(p.title)
  }
  const fill = <T extends Person | Group>(
    e: T,
    patch: Partial<T>,
    p: WikiProfile
  ): T => {
    const add = Object.fromEntries(
      Object.entries(patch).filter(
        ([k, v]) => v != null && e[k as keyof T] == null
      )
    ) as Partial<T>
    if (!Object.keys(add).length) return e
    const src = used(p)
    return {
      ...e,
      ...add,
      source_ids: e.source_ids.includes(src)
        ? e.source_ids
        : [...e.source_ids, src],
    }
  }

  const people = base.people.map((e) => {
    const p = dump.nodes[`p:${e.id}`]
    if (!p) return e
    return fill(
      e,
      {
        birth_date: p.birth_date,
        // 養成所と期は組で補う
        ...(e.training_school == null && e.training_school_term == null
          ? { training_school: p.school, training_school_term: p.term }
          : {}),
        ...(p.death_date ? { activity_status: "deceased" as const } : {}),
      },
      p
    )
  })
  const groups = base.groups.map((e) => {
    const p = dump.nodes[`g:${e.id}`]
    if (!p) return e
    return fill(
      e,
      {
        formation_date: p.formation_date,
        dissolution_date: p.dissolution_date,
        ...(p.dissolution_date
          ? { activity_status: "disbanded" as const }
          : {}),
      },
      p
    )
  })

  // 師匠の記事名 → 人物。その記事を出典にした人を優先し、なければ同名が1人だけのときに限る
  const byTitle = new Map<string, string>()
  for (const [id, p] of Object.entries(dump.nodes))
    if (p && id.startsWith("p:")) byTitle.set(p.title, id.slice(2))
  const byName = Map.groupBy(people, (e) => bare(e.name))
  const resolve = (title: string) => {
    if (byTitle.has(title)) return byTitle.get(title)!
    const xs = byName.get(bare(title)) ?? []
    return xs.length === 1 ? xs[0].id : null
  }
  const relationships = [...base.relationships]
  const pairs = new Set(
    relationships.map((r) => `${r.source_person_id}:${r.target_person_id}`)
  )
  for (const e of people) {
    const p = dump.nodes[`p:${e.id}`]
    for (const t of p?.masters ?? []) {
      const master = resolve(t)
      if (!master || master === e.id || pairs.has(`${master}:${e.id}`)) continue
      pairs.add(`${master}:${e.id}`)
      relationships.push({
        id: `w-master-${master}-${e.id}`,
        source_person_id: master,
        target_person_id: e.id,
        relationship_type: "master",
        start_date: null,
        end_date: null,
        description: `Wikipedia「${p!.title}」の基礎情報で師匠に挙げられている。`,
        evidence_type: "encyclopedia",
        confidence: "medium",
        source_ids: [used(p!)],
        last_verified_at: null,
      })
    }
  }

  const known = new Set(base.sources.map((s) => s.id))
  const sources: Source[] = [...titles]
    .filter((t) => !known.has(sourceId(t)))
    .map((t) => ({
      id: sourceId(t),
      source_name: `Wikipedia「${t}」`,
      source_url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(t)}`,
      source_type: "encyclopedia",
      published_at: null,
      checked_at: dump.fetched_at,
    }))
  return {
    ...base,
    people,
    groups,
    relationships,
    sources: [...base.sources, ...sources],
  }
}
