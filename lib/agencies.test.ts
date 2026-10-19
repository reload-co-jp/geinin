import { describe, expect, it } from "vitest"
import { db } from "@/data/db"
import { mergeAgencies, type AgencyTalent } from "./agencies"

const talent = (t: Partial<AgencyTalent> & { name: string }): AgencyTalent => ({
  agency: "ohtapro",
  url: `https://example.com/${t.name}.html`,
  kana: null,
  members: [],
  ...t,
})
const merge = (...talents: AgencyTalent[]) =>
  mergeAgencies(db, { fetched_at: "2026-10-19", talents })

describe("mergeAgencies", () => {
  it("メンバーありはグループ、なしは個人として追加する", () => {
    const r = merge(
      talent({
        name: "テストコンビ",
        url: "https://example.com/combi.html",
        members: [
          { name: "甲", kana: "こう" },
          { name: "乙", kana: null },
        ],
      }),
      talent({ name: "テストピン", url: "https://example.com/pin/" })
    )
    const g = r.groups.find((g) => g.id === "ohtapro-combi")!
    expect(g).toMatchObject({ group_type: "combi", reading: "てすとこんび" })
    expect(
      r.memberships.filter((m) => m.group_id === g.id).map((m) => m.person_id)
    ).toEqual(["ohtapro-combi-1", "ohtapro-combi-2"])
    expect(r.people.find((p) => p.id === "ohtapro-pin")?.name).toBe(
      "テストピン"
    )
  })

  it("既存レコードは id を保って事務所と出典だけ補う", () => {
    const before = db.people.find((p) => p.agency_id === null)!
    const r = merge(talent({ name: before.name, members: null }))
    const after = r.people.find((p) => p.id === before.id)!
    expect(after.agency_id).toBe("ohtapro")
    expect(after.source_ids.at(-1)).toBe(`ohtapro:${before.name}`)
    expect(r.people.length).toBe(db.people.length)
  })

  it("詳細未取得の新規は追加しない", () => {
    const r = merge(talent({ name: "未知の芸人", members: null }))
    expect(r.people.length).toBe(db.people.length)
  })
})
