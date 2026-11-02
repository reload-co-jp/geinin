// M-1グランプリ公式サイトのエントリー一覧を「結成年」で絞り込んで辿り、コンビ番号 → 結成年の対応を
// data/m1-formation.json に書き出す。lib/m1.ts がこれを使い、結成年が未登録のグループに補う。
// 一覧の行（コンビ名と番号）だけを使い、詳細ページは取得しない。1秒1リクエスト。
//   node scripts/import-m1-formation.mjs          2026年のエントリー
//   node scripts/import-m1-formation.mjs 2025     指定年のエントリー
// 注意: 結成年の絞り込みパラメータの値の形式（"2015" か "2015年" か）は公式サイトで未確認。
// 絞り込みが効かない（全件が返る）ときは中断する。
import { readFileSync, writeFileSync } from "node:fs"
import { parseList } from "./import-m1.mjs"

const BASE = "https://www.m-1gp.com/combi/"
const OUT = new URL("../data/m1-formation.json", import.meta.url)
const WAIT_MS = 1000
const YEAR = Number(process.argv[2] ?? "2026")
// M-1 は結成15年以内が出場資格。余裕を見て20年前から
const FROM = YEAR - 20
const UNSET = encodeURIComponent("未選択")

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

const list = async (from, to) => {
  const found = []
  for (let page = 1; ; page++) {
    const rows = parseList(
      await get(
        `${BASE}list.php?search_holdyear=${YEAR}&search_orga_year_from=${from}&search_orga_year_to=${to}&search_belong=1&search_allSingle=all&page=${page}`
      )
    )
    await sleep(WAIT_MS)
    // 最終ページを超えても最終ページと同じ行が返るため、新しい行がなくなったら終える
    const fresh = rows.filter((r) => !found.some((f) => f.url === r.url))
    if (!fresh.length) return found
    found.push(...fresh)
  }
}

const main = async () => {
  const prev = (() => {
    try {
      return JSON.parse(readFileSync(OUT, "utf8"))
    } catch {
      return { formed: {} }
    }
  })()
  // 絞り込みが効いているかを、全件の先頭ページと比べて確かめる
  const firstAll = parseList(
    await get(
      `${BASE}list.php?search_holdyear=${YEAR}&search_orga_year_from=${UNSET}&search_orga_year_to=${UNSET}&search_belong=1&search_allSingle=all&page=1`
    )
  ).map((r) => r.url)
  const formed = { ...prev.formed }
  for (let y = FROM; y <= YEAR; y++) {
    const rows = await list(y, y)
    if (
      rows.length >= firstAll.length &&
      firstAll.every((u) => rows.some((r) => r.url === u)) &&
      y === FROM
    ) {
      console.error(
        "結成年の絞り込みが効いていない。パラメータの値の形式を確認すること"
      )
      process.exit(1)
    }
    for (const r of rows) formed[r.url] = { name: r.name, year: y }
    console.log(`${y}年結成 ${rows.length}組`)
  }
  writeFileSync(
    OUT,
    JSON.stringify({
      fetched_at: new Date().toISOString().slice(0, 10),
      year: YEAR,
      formed: Object.fromEntries(
        Object.entries(formed).sort(([a], [b]) => a.localeCompare(b))
      ),
    })
  )
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
