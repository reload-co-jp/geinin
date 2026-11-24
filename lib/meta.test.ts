import { expect, test } from "vitest"
import { db } from "@/lib/db"
import { groupMeta, personMeta, resultSentence, withReading } from "@/lib/meta"

const person = (name: string) => db.people.find((p) => p.name === name)!.id
const group = (name: string) => db.groups.find((g) => g.name === name)!.id

test("読みが名前と同じなら括弧を付けない", () => {
  expect(withReading({ name: "かまいたち", reading: "かまいたち" })).toBe(
    "かまいたち"
  )
  expect(withReading({ name: "粗品", reading: "そしな" })).toBe(
    "粗品（そしな）"
  )
  expect(withReading({ name: "粗品", reading: "" })).toBe("粗品")
  expect(withReading({ name: "ダウンタウン", reading: "だうんたうん" })).toBe(
    "ダウンタウン"
  )
})

test("芸人の title はコンビ名と、登録されている項目だけを並べる", () => {
  const m = personMeta(person("粗品"))!
  expect(m.title).toBe(
    "粗品（霜降り明星）のプロフィール｜年齢・相方・同期・賞レース成績"
  )
  expect(m.description).toMatch(
    /^粗品（そしな）は、吉本興業所属のお笑い芸人。霜降り明星のメンバーで、相方はせいや。/
  )
  expect(m.description).toContain("1993年1月7日生まれ")
  expect(m.description).toMatch(
    /グランプリ20\d\dで優勝、賞レース決勝に計\d+回進出/
  )
  // 生年月日・養成所の無い芸人は「年齢」「同期」を title に入れない
  const thin = personMeta("maseki-m1-30074-1")!
  expect(thin.title).toBe("水質（南京町宮殿）のプロフィール｜相方・所属事務所")
  expect(thin.description).not.toContain("師弟")
})

test("師弟関係のある芸人は title に師匠・弟子を入れる", () => {
  const m = personMeta(person("明石家さんま"))!
  expect(m.title).toContain("師匠")
  expect(m.description).toContain("師匠は笑福亭松之助")
})

test("コンビの title はメンバー名を添え、description は結成年と成績を書く", () => {
  const m = groupMeta(group("霜降り明星"))!
  expect(m.title).toMatch(
    /^霜降り明星（(せいや・粗品|粗品・せいや)）のプロフィール｜メンバー・結成年・賞レース成績/
  )
  expect(m.description).toMatch(
    /^霜降り明星（しもふりみょうじょう）は、吉本興業所属の(せいや・粗品|粗品・せいや)によるお笑いコンビ。/
  )
  expect(m.description).toContain("2013年結成")
})

test("半角カナの名前は全角にそろえる", () => {
  const m = groupMeta("kdash-m1-42763")!
  expect(m.title).toMatch(/^レナチョ（/)
  expect(m.title).toContain("サツマカワRPG")
})

test("賞レース成績の一文", () => {
  expect(resultSentence([])).toBeNull()
  const r = (stage: string, year: number, rank: number | null = null) => ({
    competition: "M-1グランプリ",
    stage,
    year,
    rank,
    via: null,
    raceId: null,
  })
  expect(resultSentence([r("1回戦", 2020), r("2回戦", 2021)])).toBe(
    "M-1グランプリ予選に2020年から2回出場（最高2回戦）。"
  )
  expect(resultSentence([r("準決勝", 2022)])).toBe(
    "M-1グランプリ2022準決勝進出。"
  )
  expect(resultSentence([r("決勝", 2023, 3)])).toBe("M-1グランプリ2023で3位。")
})

test("存在しないIDは null", () => {
  expect(personMeta("__none__")).toBeNull()
  expect(groupMeta("__none__")).toBeNull()
})
