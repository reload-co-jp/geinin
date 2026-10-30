import { describe, expect, it } from "vitest"
import {
  liveDate,
  liveTime,
  livesIndex,
  parseMaseki,
  parseShochiku,
  performerNames,
  startTime,
  type Live,
} from "@/lib/lives"

describe("performerNames", () => {
  it("見出し・役割・注記・他を除いて名前だけを返す", () => {
    expect(
      performerNames(
        "[漫才・落語]海原やすよ ともこ／ダイアン\r\n[新喜劇]酒井藍 [ コーナー出演者]MC：ダイアン／蛙亭（ゲスト）／他"
      )
    ).toEqual(["海原やすよともこ", "ダイアン", "酒井藍", "蛙亭"])
  })
})

describe("liveDate / liveTime", () => {
  it("日付と時刻を整える", () => {
    expect(liveDate('2026/10/30(<span class="g-dayofweek">金</span>)')).toBe(
      "2026-10-30"
    )
    expect(liveDate("")).toBeNull()
    expect(liveTime("110000")).toBe("11:00")
    expect(liveTime("")).toBeNull()
  })
})

describe("livesIndex", () => {
  it("今日以降の公演を日付順にノードごとに返す", () => {
    const l = (date: string, cast: string[]): Live => ({
      date,
      start: null,
      title: date,
      venue: null,
      url: "",
      source: "",
      cast,
    })
    const of = livesIndex(
      {
        fetched_at: "",
        lives: [
          l("2026-11-02", ["g:1"]),
          l("2026-10-01", ["g:1"]),
          l("2026-11-01", ["g:1", "p:2"]),
        ],
      },
      "2026-10-30"
    )
    expect(of("g:1").map((x) => x.date)).toEqual(["2026-11-01", "2026-11-02"])
    expect(of("p:2")).toHaveLength(1)
    expect(of("p:3")).toEqual([])
  })
})

describe("startTime", () => {
  it("開演時刻を優先し、日付の数字は時刻と取り違えない", () => {
    expect(startTime("2026年10月2日（金）18：00開場・18：30開演")).toBe("18:30")
    expect(startTime("19:00")).toBe("19:00")
    expect(startTime("2026年10月2日（金）")).toBeNull()
  })
})

describe("parseMaseki", () => {
  it("LIVE・STAGE の行だけを日付・時刻・出演者付きで返す", () => {
    const html = `<tr><th><a id="day_11_3"></a><div>2026</div><div>11.3</div></th><td><table class="sc2table_desc">
      <tr data-url="/live/lucifer_2026" class="aclink"><th><div><div class="media_icon"><p >LIVE</p></div></div><div>15:00&nbsp</div></th>
      <td><div class="sc_dsc">&nbsp『<b>ネタライブ &amp; トーク</b>』<ul class="talent_photoname_list">
      <li><a href="/talent/a"><div class="talent_photoname_list_name"><p>&nbsp;</p>ルシファー吉岡</div></a></li>
      <li><a href="/talent/b"><div class="talent_photoname_list_name"><p>&nbsp;</p>三四郎</div></a></li></ul></div></td></tr>
      <tr><th><div><div class="media_icon"><p >TV</p></div></div><div>16:30&nbsp</div></th><td>TBS『<b>番組</b>』</td></tr>
      </table></td></tr>`
    expect(parseMaseki(html)).toEqual([
      {
        date: "2026-11-03",
        start: "15:00",
        title: "ネタライブ & トーク",
        url: "/live/lucifer_2026",
        names: ["ルシファー吉岡", "三四郎"],
      },
    ])
  })
})

describe("parseShochiku", () => {
  it("公演ごとに日付・開演・出演者を返す", () => {
    const html = `<li class="event-end"></li><li class=""><a href="https://www.shochikugeino.co.jp/topics/events/170124/">
      <p class="event-data en">11.03 <span class="week sat">[TUE]</span></p>
      <h3 class="event-title">デンドロビーム初単独ライブ</h3>
      <dl class="summary-list"><dt>出演</dt><dd>デンドロビーム、桂佐ん吉（米朝事務所）</dd><dt>公演時間</dt><dd>18:00開場／18:30開演</dd></dl></li>`
    expect(parseShochiku(html, 2026)).toEqual([
      {
        date: "2026-11-03",
        start: "18:30",
        title: "デンドロビーム初単独ライブ",
        url: "https://www.shochikugeino.co.jp/topics/events/170124/",
        names: ["デンドロビーム", "桂佐ん吉"],
      },
    ])
  })
})
