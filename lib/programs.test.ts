import { expect, test } from "vitest"
import { cleanWikitext, extractPrograms } from "@/lib/programs"

const wikitext = `== 出演 ==
=== テレビ番組 ===
==== レギュラー番組 ====
'''現在の出演番組'''
* [[ダウンタウンのガキの使いやあらへんで!]]（1997年2月9日 - 、日本テレビ系）- '''レギュラー'''
'''過去の出演番組'''
* [[DABO銀]]（1995年4月3日 - 1996年3月25日、[[テレビ朝日]]）<ref>{{Cite web|title=x}}</ref>
* [[フジテレビジョン|フジテレビ]]
** [[笑っていいとも!増刊号]]
==== ドラマ ====
* [[明日があるさ]]（2001年、日本テレビ）
=== ラジオ ===
* ラジオ番組（2000年 - ）
`

test("テレビ・バラエティ節の番組だけを、出演中・終了つきで取り出す", () => {
  expect(extractPrograms(wikitext)).toEqual([
    {
      title: "ダウンタウンのガキの使いやあらへんで!",
      note: "1997年2月9日 - 、日本テレビ系",
      status: "current",
    },
    {
      title: "DABO銀",
      note: "1995年4月3日 - 1996年3月25日、テレビ朝日",
      status: "past",
    },
    { title: "笑っていいとも!増刊号", note: null, status: "past" },
  ])
})

test("リンク・参照・テンプレートを外す", () => {
  expect(
    cleanWikitext("[[A|B]]と[[C]]<ref name=x/>{{small|{{x}}}}'''D'''")
  ).toBe("BとCD")
})

test("局名だけの行は除き、局名を含む番組名は残す", () => {
  expect(
    extractPrograms("=== テレビ ===\n* TBS\n* [[24時間テレビ]]（日本テレビ）")
  ).toEqual([{ title: "24時間テレビ", note: "日本テレビ", status: null }])
})
