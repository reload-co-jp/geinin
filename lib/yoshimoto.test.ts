import { describe, expect, it } from "vitest"
import { db } from "@/data/db"
import {
  mergeYoshimoto,
  parseMaster,
  parseOrigin,
  type YoshimotoTalent,
} from "./yoshimoto"

const talent = (
  t: Partial<YoshimotoTalent> & { id: number; name: string }
): YoshimotoTalent => ({
  kana: null,
  categories: ["芸人"],
  formed: null,
  groups: [],
  members: [],
  birth: null,
  origin: null,
  ...t,
})

describe("parseOrigin", () => {
  it.each([
    ["東京NSC29期", "NSC東京", 29],
    ["NSC大阪39期", "NSC大阪", 39],
    ["2002年 NSC東京校 8期生", "NSC東京", 8],
    ["NSC岡山1期", "NSC岡山", 1],
    ["東京ＮＳＣ２２期", "NSC東京", 22],
    ["2011年 一般 33期扱い", "NSC大阪", 33],
    ["NSC大阪校 NSC31期扱い", "NSC大阪", 31],
    ["2003年 入社 24期扱い", "NSC大阪", 24],
    ["YOEC1期（NSC34期扱い）", "NSC大阪", 34],
    ["NSC大阪校21期と同期", "NSC大阪", 21],
    ["2009年5期扱い", null, null],
  ])("%s", (s, school, term) => {
    expect(parseOrigin(s)).toMatchObject({ school, term })
  })

  it("ignores award years", () => {
    expect(
      parseOrigin("2019年 第73回「文化庁芸術祭」にて演芸部門大賞受賞").year
    ).toBe(null)
  })

  it("keeps only the year when no term is given", () => {
    expect(parseOrigin("1996年 入社")).toEqual({
      school: null,
      term: null,
      year: "1996",
    })
    expect(parseOrigin("ｵｰﾃﾞｨｼｮﾝ")).toEqual({
      school: null,
      term: null,
      year: null,
    })
  })
})

describe("mergeYoshimoto", () => {
  const merged = mergeYoshimoto(db, {
    source: "",
    fetched_at: "2026-10-18",
    talents: [
      talent({
        id: 1,
        name: "ダウンタウン",
        formed: "1982-05",
        members: [{ id: 2, name: "浜田雅功", kana: null, position: null }],
      }),
      talent({
        id: 2,
        name: "浜田 雅功",
        categories: [],
        groups: [1],
        origin: "NSC大阪1期",
        birth: "1963-05-11",
      }),
      talent({
        id: 10,
        name: "新コンビ",
        formed: "2020",
        members: [{ id: 11, name: "新人", kana: null, position: null }],
      }),
      talent({
        id: 11,
        name: "新人",
        kana: "しんじん",
        categories: [],
        groups: [10],
        origin: "東京NSC25期",
      }),
      talent({ id: 20, name: "歌手", categories: ["歌手"] }),
    ],
  })

  it("merges into existing records by name and fills blanks only", () => {
    const hamada = merged.people.find((p) => p.id === "hamada")!
    expect(hamada.birth_date).toBe("1963-05-11")
    expect(hamada.source_ids).toContain("yoshimoto:2")
    expect(
      merged.people.filter((p) => p.name.replace(" ", "") === "浜田雅功")
    ).toHaveLength(1)
    expect(db.people.find((p) => p.id === "hamada")!.birth_date).toBeNull()
  })

  it("adds new comedians with memberships, school term and source", () => {
    expect(merged.people.find((p) => p.id === "y11")).toMatchObject({
      training_school: "NSC東京",
      training_school_term: 25,
    })
    expect(merged.groups.find((g) => g.id === "y10")?.formation_date).toBe(
      "2020"
    )
    expect(merged.memberships).toContainEqual(
      expect.objectContaining({
        person_id: "y11",
        group_id: "y10",
        status: "current",
      })
    )
    expect(
      merged.sources.find((s) => s.id === "yoshimoto:11")?.checked_at
    ).toBe("2026-10-18")
  })

  it("skips non-comedy talents", () => {
    expect(merged.people.some((p) => p.id === "y20")).toBe(false)
  })
})

describe("parseMaster", () => {
  it.each([
    ["1970年 入門 西川きよし", "西川きよし"],
    ["滝あきらに入門(1979年)", "滝あきら"],
    ["1972年 入門 父・河内家菊水", "河内家菊水"],
    ["2001年 NSC大阪校 24期生 2019年笑福亭鶴笑一門入門", "笑福亭鶴笑"],
    ["201210月 その他宮川大助花子師匠に弟子入り", "宮川大助花子"],
    ["1986年 入門 桂三枝(1979/04吉本新喜劇入団)", "桂三枝"],
    ["NSC大阪41期／2021年4月 月亭方正に入門", "月亭方正"],
    ["1975年 入門 レッツゴー三匹 1980年 入社", "レッツゴー三匹"],
  ])("%s", (s, name) => {
    expect(parseMaster(s)?.name).toBe(name)
  })

  it("ignores entries without a master", () => {
    expect(parseMaster("1964年 入門/1967年 入社")).toBeNull()
    expect(parseMaster("NSC大阪39期")).toBeNull()
  })
})
