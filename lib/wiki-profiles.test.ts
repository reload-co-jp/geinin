import { expect, test } from "vitest"
import type { Db, Group, Person } from "@/lib/types"
import {
  extractProfile,
  linkTargets,
  mergeWikiProfiles,
  parseDate,
  parseInfobox,
} from "@/lib/wiki-profiles"

const sanma = `{{Infobox お笑い芸人
| 名前 = {{ruby|明石家|あかしや}} さんま
| 本名 = 杉本 高文<ref name="a">{{Cite news |title=x |date=2021-10-10}}</ref>
| 生年月日 = {{生年月日と年齢|1955|7|1}}
| 出身地 = {{JPN1947}} [[奈良県]][[奈良市]]
| 師匠 = [[笑福亭松之助|2代目笑福亭松之助]]
| 相方 = {{plainlist|
* [[島田紳助]]（無名時代）
}}
| 活動時期 = [[1974年]] -
}}
'''明石家 さんま'''は…`

test("Infobox を項目ごとに分け、入れ子のテンプレート内の | では区切らない", () => {
  const f = parseInfobox(sanma)
  expect(f.get("生年月日")).toBe("{{生年月日と年齢|1955|7|1}}")
  expect(f.get("相方")).toContain("[[島田紳助]]")
  expect(f.get("活動時期")).toBe("[[1974年]] -")
  expect(f.get("本名")).toBe("杉本 高文")
})

test("日付テンプレートと「年月日」表記を部分日付にする", () => {
  expect(parseDate("{{生年月日と年齢|1955|7|1}}")).toBe("1955-07-01")
  expect(parseDate("{{死亡年月日と没年齢|1925|3|15|2019|2|19}}", 1)).toBe(
    "2019-02-19"
  )
  expect(parseDate("[[1999年]]4月")).toBe("1999-04")
  expect(parseDate("2003年")).toBe("2003")
  expect(parseDate("不明")).toBeNull()
  expect(parseDate(undefined)).toBeNull()
})

test("師匠欄はリンク先の記事名だけを取る", () => {
  expect(linkTargets("[[笑福亭松之助|2代目笑福亭松之助]]、なし")).toEqual([
    "笑福亭松之助",
  ])
  expect(linkTargets("[[オール巨人]]（[[1993年]][[3月]]）")).toEqual([
    "オール巨人",
  ])
  expect(linkTargets("なし")).toEqual([])
})

test("個人記事から生年月日・師匠・養成所を取り出す", () => {
  expect(extractProfile(sanma, "明石家さんま", false)).toEqual({
    title: "明石家さんま",
    birth_date: "1955-07-01",
    masters: ["笑福亭松之助"],
  })
  const nsc = `{{Infobox お笑い芸人
| 生年月日 = {{生年月日と年齢|1979|12|28}}
| 出身 = [[吉本総合芸能学院|NSC大阪校]]22期
}}`
  expect(extractProfile(nsc, "ノブ (お笑い芸人)", false)).toEqual({
    title: "ノブ (お笑い芸人)",
    birth_date: "1979-12-28",
    school: "NSC大阪",
    term: 22,
  })
})

test("コメントアウトされた記入例は読まない", () => {
  const box = `{{Infobox お笑い芸人
| 生年月日 = {{生年月日と年齢|1983|11|6}}
| 没年月日 = <!--{{死亡年月日と没年齢|1900|1|1|2000|1|1}}-->
}}`
  expect(extractProfile(box, "X", false)).toEqual({
    title: "X",
    birth_date: "1983-11-06",
  })
})

test("コンビ記事から結成年・解散年を取り出す", () => {
  const combi = `{{Infobox お笑いコンビ
| 結成年 = [[2000年]]
| 解散年 = 2010年3月
}}`
  expect(extractProfile(combi, "X (お笑いコンビ)", true)).toEqual({
    title: "X (お笑いコンビ)",
    formation_date: "2000",
    dissolution_date: "2010-03",
  })
})

const person = (id: string, name: string, rest: Partial<Person> = {}) =>
  ({
    id,
    name,
    reading: "",
    aliases: [],
    agency_id: null,
    debut_date: null,
    birth_date: null,
    training_school: null,
    training_school_term: null,
    biography: null,
    activity_status: null,
    source_ids: [],
    ...rest,
  }) satisfies Person
const group = (id: string, name: string): Group => ({
  id,
  name,
  reading: "",
  aliases: [],
  group_type: "combi",
  formation_date: null,
  dissolution_date: null,
  agency_id: null,
  activity_status: null,
  source_ids: [],
})
const base: Db = {
  sources: [],
  agencies: [],
  people: [
    person("sanma", "明石家さんま", { birth_date: "1955" }),
    person("matsunosuke", "笑福亭松之助"),
    person("a", "同名"),
    person("b", "同名"),
  ],
  groups: [group("g1", "コンビ")],
  memberships: [],
  relationships: [],
  competitionResults: [],
}

test("空いている項目だけを補い、出典を足す", () => {
  const db = mergeWikiProfiles(base, {
    fetched_at: "2026-11-20",
    nodes: {
      "p:sanma": {
        title: "明石家さんま",
        birth_date: "1955-07-01",
        school: "NSC大阪",
        term: 1,
      },
      "p:matsunosuke": {
        title: "笑福亭松之助",
        death_date: "2019-02-22",
      },
      "g:g1": {
        title: "コンビ",
        formation_date: "2000",
        dissolution_date: "2010",
      },
      "p:a": null,
    },
  })
  const sanma = db.people.find((p) => p.id === "sanma")!
  expect(sanma.birth_date).toBe("1955")
  expect(sanma.training_school).toBe("NSC大阪")
  expect(sanma.training_school_term).toBe(1)
  expect(sanma.source_ids).toEqual(["wikipedia:明石家さんま"])
  expect(db.people.find((p) => p.id === "matsunosuke")!.activity_status).toBe(
    "deceased"
  )
  expect(db.groups[0]).toMatchObject({
    formation_date: "2000",
    dissolution_date: "2010",
    activity_status: "disbanded",
  })
  expect(db.sources.map((s) => s.id).sort()).toEqual([
    "wikipedia:コンビ",
    "wikipedia:明石家さんま",
    "wikipedia:笑福亭松之助",
  ])
})

test("師匠欄の記事名から師弟関係を張る。同名が複数いれば張らない", () => {
  const db = mergeWikiProfiles(base, {
    fetched_at: "2026-11-20",
    nodes: {
      "p:sanma": { title: "明石家さんま", masters: ["笑福亭松之助", "同名"] },
    },
  })
  expect(db.relationships).toHaveLength(1)
  expect(db.relationships[0]).toMatchObject({
    source_person_id: "matsunosuke",
    target_person_id: "sanma",
    relationship_type: "master",
    evidence_type: "encyclopedia",
    confidence: "medium",
    source_ids: ["wikipedia:明石家さんま"],
  })
})

test("既にある師弟関係は重複させない", () => {
  const db = mergeWikiProfiles(
    {
      ...base,
      relationships: [
        {
          id: "r",
          source_person_id: "matsunosuke",
          target_person_id: "sanma",
          relationship_type: "master",
          start_date: null,
          end_date: null,
          description: "",
          evidence_type: "encyclopedia",
          confidence: "high",
          source_ids: [],
          last_verified_at: null,
        },
      ],
    },
    {
      fetched_at: "",
      nodes: {
        "p:sanma": { title: "明石家さんま", masters: ["笑福亭松之助"] },
      },
    }
  )
  expect(db.relationships).toHaveLength(1)
})
