import type { Db } from "@/lib/types"

// scripts/collect-debuts.ts が Wikipedia から集めたデビュー年。null は記事が見つからなかった人
export type DebutDump = {
  fetched_at: string
  debuts: Record<string, { year: number; title: string } | null>
}

const sourceId = (title: string) => `wikipedia:${title}`

// 公式プロフィール等にデビュー年がない人だけを補う
export const mergeDebuts = (base: Db, dump: DebutDump): Db => {
  const titles = new Set<string>()
  const people = base.people.map((p) => {
    const d = dump.debuts[p.id]
    if (p.debut_date || !d) return p
    titles.add(d.title)
    return {
      ...p,
      debut_date: String(d.year),
      source_ids: [...p.source_ids, sourceId(d.title)],
    }
  })
  return {
    ...base,
    people,
    sources: [
      ...base.sources,
      ...[...titles].map((t) => ({
        id: sourceId(t),
        source_name: `Wikipedia「${t}」`,
        source_url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(t)}`,
        source_type: "encyclopedia" as const,
        published_at: null,
        checked_at: dump.fetched_at,
      })),
    ],
  }
}
