import { expect, test } from "vitest"
import { db } from "@/lib/db"
import { groupMeta, personMeta, withReading } from "@/lib/meta"

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

test("芸人の title はコンビ名と年齢を含み、description は生年月日と相方を先に出す", () => {
  const m = personMeta(person("粗品"))!
  expect(m.title).toBe("粗品（霜降り明星）の年齢・プロフィール・相方")
  expect(m.description).toMatch(
    /^粗品（そしな）は霜降り明星のメンバー（相方: せいや）。/
  )
  expect(m.description).toContain("1993年1月7日生まれ")
  expect(m.description).toMatch(/グランプリ20\d\d優勝ほか決勝\d+回/)
})

test("コンビの title は結成年を含み、description はメンバーを先に出す", () => {
  const m = groupMeta(group("霜降り明星"))!
  expect(m.title).toBe("霜降り明星のメンバー・結成年・賞レース戦績")
  expect(m.description).toMatch(
    /^霜降り明星（しもふりみょうじょう）は(せいや・粗品|粗品・せいや)のコンビ。/
  )
  expect(m.description).toContain("年結成")
})

test("存在しないIDは null", () => {
  expect(personMeta("__none__")).toBeNull()
  expect(groupMeta("__none__")).toBeNull()
})
