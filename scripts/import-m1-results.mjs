// M-1グランプリ公式サイトのエントリー一覧（プロ）を辿り、各組の結成年と予選の進出状況を書き出す。
//   data/m1-formation.json  コンビ番号ページ → 名前・結成年（lib/m1.ts が未登録の結成年を補う）
//   data/m1-prelims.json    予選の進出記録（その年の最新の回戦は日付・会場つき）
// 一覧の行（コンビ名・最新ステータス・予選の日程・結成年）だけを使う。1秒1リクエスト。
// --history を付けると各組の詳細ページの概要（meta description）から過去の年の戦績も取る（件数分のリクエスト）。
//   node scripts/import-m1-results.mjs [年] [--history]
import { readFileSync, writeFileSync } from "node:fs"

const BASE = "https://www.m-1gp.com/combi/"
const SCHEDULE = "https://www.m-1gp.com/schedule/"
const FORMATION = new URL("../data/m1-formation.json", import.meta.url)
const PRELIMS = new URL("../data/m1-prelims.json", import.meta.url)
const WAIT_MS = 1000
const args = process.argv.slice(2)
const YEAR = Number(args.find((a) => /^\d{4}$/.test(a)) ?? "2026")
const HISTORY = args.includes("--history")
const UNSET = encodeURIComponent("未選択")
// 予選として記録する段階。敗者復活戦・決勝は data/db.ts で順位つきで管理する
const STAGES = ["1回戦", "2回戦", "3回戦", "準々決勝", "準決勝"]

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()

// 「2026年 ２回戦：敗退」→ { year, stage, result }
export const parseStatus = (s) => {
  const m = s.normalize("NFKC").match(/(\d{4})年\s*(.+?):(.+)/)
  return m
    ? { year: Number(m[1]), stage: m[2].trim(), result: m[3].trim() }
    : null
}

// 「10/21(水)  [東京] 雷5656会館ときわホール」→ 日付（年を補う）と会場
export const parseHeat = (s, year) => {
  const m = decode(s)
    .normalize("NFKC")
    .match(/^(\d{1,2})\/(\d{1,2})\([^)]*\)\s*(?:\[([^\]]+)\])?\s*(.*)$/)
  return m
    ? {
        date: `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`,
        area: m[3] ?? null,
        venue: m[4] || null,
      }
    : null
}

export const parseRows = (html) =>
  [
    ...html.matchAll(
      /<tr[^>]*>\s*<td><a href="(\d+\.html)"[^>]*>([^<]+)<\/a><\/td>([\s\S]*?)<\/tr>/g
    ),
  ].map(([, href, name, rest]) => {
    const tds = [...rest.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    const status = parseStatus(
      decode(tds[0]?.match(/<span>([\s\S]*?)<\/span>/)?.[1] ?? "")
    )
    const heatLink = tds[0]?.match(/<a href="([^"]+)">([\s\S]*?)<\/a>/)
    const formed = decode(tds[1] ?? "")
      .normalize("NFKC")
      .match(/(\d{4})年/)
    return {
      url: BASE + href,
      name: decode(name),
      status,
      heat:
        status && heatLink
          ? {
              ...parseHeat(heatLink[2], status.year),
              url: new URL(heatLink[1], BASE).href,
            }
          : null,
      formed: formed ? Number(formed[1]) : null,
    }
  })

// 詳細ページの概要「[2026年 エントリーNo.10705] １回戦：通過 ２回戦：通過 ３回戦：出場予定 [2023年 …] …」
export const parseHistory = (html) => {
  const d = (
    html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ""
  ).normalize("NFKC")
  return [...d.matchAll(/\[(\d{4})年[^\]]*\]([^[]*)/g)].flatMap(([, y, body]) =>
    [...body.matchAll(/(\S+?):(\S+)/g)]
      // シードで免除された回戦は出場していない
      .filter(([, , r]) => !r.includes("シード"))
      .map(([, stage]) => ({ year: Number(y), stage }))
  )
}

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
  const rows = []
  for (let page = 1; ; page++) {
    const got = parseRows(
      await get(
        `${BASE}list.php?search_holdyear=${YEAR}&search_orga_year_from=${UNSET}&search_orga_year_to=${UNSET}&search_belong=1&search_allSingle=all&page=${page}`
      )
    )
    await sleep(WAIT_MS)
    // 最終ページを超えても最終ページと同じ行が返るため、新しい行がなくなったら終える
    const fresh = got.filter((r) => !rows.some((x) => x.url === r.url))
    if (!fresh.length) break
    rows.push(...fresh)
    if (page % 20 === 0) console.log(`一覧 ${page}ページ ${rows.length}件`)
  }
  console.log(`一覧 ${rows.length}件`)
  const today = new Date().toISOString().slice(0, 10)

  writeFileSync(
    FORMATION,
    JSON.stringify({
      fetched_at: today,
      year: YEAR,
      formed: Object.fromEntries(
        rows
          .filter((r) => r.formed)
          .map((r) => [r.url, { name: r.name, year: r.formed }])
      ),
    })
  )

  const results = new Map()
  const add = (r, year, stage, heat, source_url) => {
    if (!STAGES.includes(stage)) return
    const k = `${r.url} ${year} ${stage}`
    if (results.has(k) && !heat) return
    results.set(k, {
      year,
      stage,
      url: r.url,
      name: r.name,
      date: heat?.date ?? null,
      venue: heat?.venue ?? null,
      source_url,
    })
  }
  for (const r of rows) {
    if (!r.status || r.status.year !== YEAR) continue
    // 最新の回戦に出場（予定）していれば、それより前の回戦はシードの可能性があるので詳細でだけ補う
    add(r, YEAR, r.status.stage, r.heat, r.heat?.url ?? `${SCHEDULE}index.html`)
  }
  // 前回までの記録は残す（--history で取った過去の年の戦績を含む）
  let prev = []
  try {
    prev = JSON.parse(readFileSync(PRELIMS, "utf8")).results
  } catch {
    /* 初回 */
  }
  for (const p of prev) {
    const k = `${p.url} ${p.year} ${p.stage}`
    if (!results.has(k)) results.set(k, p)
  }
  const save = () =>
    writeFileSync(
      PRELIMS,
      JSON.stringify({
        fetched_at: today,
        results: [...results.values()].sort(
          (a, b) =>
            a.url.localeCompare(b.url) ||
            a.year - b.year ||
            STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage)
        ),
      })
    )
  if (HISTORY) {
    // 詳細ページから取った記録は出典が詳細ページ自身。取得済みの組は飛ばして途中から再開できる
    const done = new Set(
      [...results.values()]
        .filter((p) => p.source_url === p.url)
        .map((p) => p.url)
    )
    const todo = rows.filter((r) => !done.has(r.url))
    console.log(`詳細 未取得 ${todo.length}/${rows.length}件`)
    for (const [i, r] of todo.entries()) {
      try {
        for (const h of parseHistory(await get(r.url)))
          add(r, h.year, h.stage, null, r.url)
      } catch (e) {
        console.warn(`${r.url} ${e.message}`)
      }
      if (i % 100 === 99) {
        save()
        console.log(`詳細 ${i + 1}/${todo.length}`)
      }
      await sleep(WAIT_MS)
    }
  }
  save()
  console.log(`予選の記録 ${results.size}件`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
