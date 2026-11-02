// M-1グランプリ公式サイトのエントリー一覧（プロ）を page=1 から順に辿り、未登録の芸人の名前・読み・メンバー構成のみを
// data/agencies.json に追加する。所属事務所は詳細ページの「所属」欄から data/db.ts の事務所に対応付け、フリー・アマチュアや未知の事務所は飛ばす。
// 経歴文などの文章は転載しない。1秒1リクエスト。
//   node scripts/import-m1.mjs          2026年のエントリー
//   node scripts/import-m1.mjs 2025     指定年のエントリー
import { readFileSync, writeFileSync } from "node:fs"

const BASE = "https://www.m-1gp.com/combi/"
const OUT = new URL("../data/agencies.json", import.meta.url)
const WAIT_MS = 1000
const YEAR = process.argv[2] ?? "2026"

// 事務所は data/db.ts の agencies に登録されたものに名前で対応付ける。M-1 側の略称・表記揺れはここで寄せる
const ALIAS = {
  SMA: "sma",
  ソニー: "sma",
  FANBEST: "funbest",
  咲ネタスト: "saki-next",
  "NAVY.inc": "navy",
  めぐみエンターテインメント: "megumi",
  "viviON(あおぎり高校)": "vivion",
}
// 事務所ではない所属
const NOT_AGENCY = new Set([
  "フリー",
  "アマチュア",
  "アマ",
  "漫才協会",
  "落語協会",
])

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
const key = (s) => s.normalize("NFKC").replace(/[\s・]/g, "")
const company = (s) =>
  key(s).replace(/^(?:株式会社|有限会社|合同会社|\(株\))|株式会社$/, "")
const hiragana = (s) =>
  s && s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))

// 「プロ（吉本興業/フリー）」「プロ（マセキ芸能社／太田プロダクション／タイタン）」→ 最初の既知の事務所の id
export const agencyOf = (belong, agencies) => {
  const ids = new Map([
    ...agencies.map((a) => [company(a.name), a.id]),
    ...Object.entries(ALIAS).map(([n, id]) => [company(n), id]),
  ])
  const parts = (belong.match(/（(.+)）/)?.[1] ?? belong).split(/[/／]/)
  return (
    parts.map((p) => ids.get(company(p))).find(Boolean) ??
    (parts.every((p) => NOT_AGENCY.has(p.trim())) ? null : undefined)
  )
}

export const parseList = (html) =>
  [
    ...html.matchAll(/<td><a href="(\d+\.html)" target="_blank">([^<]+)<\/a>/g),
  ].map((m) => ({ url: BASE + m[1], name: decode(m[2]) }))

export const parseDetail = (html) => ({
  name: decode(html.match(/name-txt-full">([^<]*)/)?.[1] ?? ""),
  kana:
    hiragana(decode(html.match(/name-txt-kana">([^<]*)/)?.[1] ?? "")) || null,
  belong: decode(html.match(/<dt>所属<\/dt>\s*<dd>([^<]*)/)?.[1] ?? ""),
  members: [
    ...html.matchAll(
      /<dt>名前<\/dt>\s*<dd>([^<]*)<\/dd>\s*(?:<dt>フリガナ<\/dt>\s*<dd>([^<]*))?/g
    ),
  ].map((m) => ({
    name: decode(m[1]),
    kana: hiragana(decode(m[2] ?? "")) || null,
  })),
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = async (url) => {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "geinin-db importer (fact extraction, 1 req/s)",
        },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      if (i >= 2) throw e
      await sleep(5000)
    }
  }
}

const main = async () => {
  const dump = JSON.parse(readFileSync(OUT, "utf8"))
  const yoshimoto = JSON.parse(
    readFileSync(new URL("../data/yoshimoto.json", import.meta.url), "utf8")
  )
  const manual = readFileSync(new URL("../data/db.ts", import.meta.url), "utf8")
  // 手入力・吉本・他事務所のいずれかに同名があれば登録済みとみなす
  const registered = new Set(
    [
      ...[...manual.matchAll(/(?:person|group)\(\s*"[^"]+",\s*"([^"]+)"/g)].map(
        (m) => m[1]
      ),
      ...yoshimoto.talents.map((t) => t.name),
      ...dump.talents.map((t) => t.name),
    ].map(key)
  )
  const agencies = [
    ...manual.matchAll(/\{ id: "([^"]+)", name: "([^"]+)" \}/g),
  ].map((m) => ({ id: m[1], name: m[2] }))
  const done = new Set(dump.talents.map((t) => t.url))

  const found = []
  for (let page = 1; ; page++) {
    const rows = parseList(
      await get(
        `${BASE}list.php?search_holdyear=${YEAR}&search_orga_year_from=%E6%9C%AA%E9%81%B8%E6%8A%9E&search_orga_year_to=%E6%9C%AA%E9%81%B8%E6%8A%9E&search_belong=1&search_allSingle=all&page=${page}`
      )
    )
    // 最終ページを超えても最終ページと同じ行が返るため、新しい行がなくなったら終える
    const fresh = rows.filter((r) => !found.some((f) => f.url === r.url))
    if (!fresh.length) break
    found.push(...fresh)
    if (page % 20 === 0) console.log(`一覧 ${page}ページ ${found.length}件`)
    await sleep(WAIT_MS)
  }
  const todo = found.filter(
    (t) => !registered.has(key(t.name)) && !done.has(t.url)
  )
  console.log(`一覧 ${found.length}件 / 未登録 ${todo.length}件`)

  const save = () =>
    writeFileSync(
      OUT,
      JSON.stringify({
        ...dump,
        talents: dump.talents.sort(
          (a, b) =>
            a.agency.localeCompare(b.agency) || a.url.localeCompare(b.url)
        ),
      })
    )
  const unknown = new Map()
  let added = 0
  for (const [i, t] of todo.entries()) {
    try {
      const d = parseDetail(await get(t.url))
      const agency = agencyOf(d.belong, agencies)
      if (agency) {
        dump.talents.push({
          agency,
          url: t.url,
          name: d.name || t.name,
          kana: d.kana,
          members: d.members,
        })
        added++
      } else if (agency === undefined)
        unknown.set(d.belong, (unknown.get(d.belong) ?? 0) + 1)
    } catch (e) {
      console.warn(`${t.url} ${e.message}`)
    }
    if (i % 50 === 49) {
      save()
      console.log(`${i + 1}/${todo.length}`)
    }
    await sleep(WAIT_MS)
  }
  save()
  console.log(`追加 ${added}件`)
  console.log(
    "未知の事務所:",
    [...unknown].sort((a, b) => b[1] - a[1]).slice(0, 30)
  )
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
