import { expect, test } from "vitest"
import { db, personById } from "@/lib/db"

// 系譜は「師匠のいない師匠」を起点に描くので、師弟関係に循環があると載らない人が出る
test("師弟関係は循環せず、すべて系譜の起点からたどれる", () => {
  const rels = db.relationships.filter(
    (r) =>
      r.relationship_type === "master" &&
      personById.has(r.source_person_id) &&
      personById.has(r.target_person_id)
  )
  const pupilsOf = Map.groupBy(rels, (r) => r.source_person_id)
  const hasMaster = new Set(rels.map((r) => r.target_person_id))
  const seen = new Set<string>()
  const walk = (id: string) => {
    for (const r of pupilsOf.get(id) ?? []) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      walk(r.target_person_id)
    }
  }
  for (const id of pupilsOf.keys()) if (!hasMaster.has(id)) walk(id)
  expect(rels.filter((r) => !seen.has(r.id))).toEqual([])
})
