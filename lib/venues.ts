import type { Live, LivesDump } from "@/lib/lives"
import { programSlug } from "@/lib/graph"

// 劇場（公演の会場）ごとのまとめ。data/lives.json の公演から作る

// 会場名末尾の「（東京都）」を都道府県として取り出す
export const prefectureOf = (venue: string) =>
  venue.match(/（([^（）]+[都道府県])）$/)?.[1] ?? null
export const venueLabel = (venue: string) =>
  venue.replace(/（[^（）]+[都道府県]）$/, "").trim()
// 会場名は記号や空白を含むのでハッシュをスラッグにする（番組ページと同じ方式）
export const venueSlug = (venue: string) => programSlug(venue)

// 公演数がこれ未満の会場はページを作らない（中身が薄くなるため）
export const VENUE_MIN_LIVES = 3
// 出演者が多い公演（劇場の本公演など）は顔ぶれが固定的で、共演の目安にならない
export const COSTAR_MAX_CAST = 15

export type Venue = {
  slug: string
  name: string
  label: string
  prefecture: string | null
  // 取得分すべて（過去分を含む）。常連の集計に使う
  lives: Live[]
  // 出演回数の多い順
  regulars: { id: string; count: number }[]
}

const countBy = (ids: string[]) => {
  const m = new Map<string, number>()
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1)
  return m
}

export const buildVenues = (dump: LivesDump): Venue[] =>
  [
    ...Map.groupBy(
      dump.lives.filter((l) => l.venue),
      (l) => l.venue!
    ),
  ]
    .filter(([, ls]) => ls.length >= VENUE_MIN_LIVES)
    .map(([name, ls]) => ({
      slug: venueSlug(name),
      name,
      label: venueLabel(name),
      prefecture: prefectureOf(name),
      lives: ls.toSorted(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.start ?? "").localeCompare(b.start ?? "")
      ),
      regulars: [...countBy(ls.flatMap((l) => l.cast))]
        .map(([id, count]) => ({ id, count }))
        .toSorted((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
    }))
    .toSorted((a, b) => b.lives.length - a.lives.length)

// 芸人ごとの出演会場（出演回数の多い順）と、同じ公演に出る共演者（回数の多い順）
export const liveRelations = (dump: LivesDump) => {
  const venues = new Map<string, Map<string, number>>()
  const costars = new Map<string, Map<string, { count: number; live: Live }>>()
  for (const l of dump.lives) {
    for (const id of l.cast) {
      if (l.venue) {
        const v = venues.get(id) ?? new Map<string, number>()
        v.set(l.venue, (v.get(l.venue) ?? 0) + 1)
        venues.set(id, v)
      }
      if (l.cast.length > COSTAR_MAX_CAST) continue
      const c = costars.get(id) ?? new Map()
      for (const other of l.cast) {
        if (other === id) continue
        const cur = c.get(other)
        c.set(other, { count: (cur?.count ?? 0) + 1, live: cur?.live ?? l })
      }
      costars.set(id, c)
    }
  }
  return {
    venuesOf: (id: string) =>
      [...(venues.get(id) ?? [])]
        .map(([venue, count]) => ({ venue, count }))
        .toSorted((a, b) => b.count - a.count),
    costarsOf: (id: string) =>
      [...(costars.get(id) ?? [])]
        .map(([other, { count, live }]) => ({ id: other, count, live }))
        .toSorted((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
  }
}
