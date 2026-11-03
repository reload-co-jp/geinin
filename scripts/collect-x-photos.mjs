// X（旧Twitter）プロフィールページからプロフィール画像URLを取得し、
// data/yoshimoto.json / data/agencies.json に反映する。
//
// 規約: 画像ファイルはコピーせず、Xのプロフィール画像URLを参照するだけにする
//
// 使い方:
//   node scripts/collect-x-photos.mjs data/yoshimoto.json    photo が null なタレントのみ取得
//   node scripts/collect-x-photos.mjs data/agencies.json     photo が null なタレントのみ取得
//   node scripts/collect-x-photos.mjs data/yoshimoto.json --all  全件再取得
//   node scripts/collect-x-photos.mjs data/yoshimoto.json --limit 50  50件ずつ分割取得
//
// 1 req/s でアクセス。進捗は50件ごとに保存される。

import { readFileSync, writeFileSync, existsSync } from "node:fs"

const [, , inputPath, ...rest] = process.argv
const all = rest.includes("--all")
const limitIdx = rest.indexOf("--limit")
const limitEq = rest.find((a) => a.startsWith("--limit="))
const limitVal = limitEq ? limitEq.split("=")[1] : rest[limitIdx + 1]
const limit = limitVal ? parseInt(limitVal, 10) : null

// カレントディレクトリ基準でパスを解決
const resolved = inputPath.startsWith("/") ? inputPath : `${process.cwd()}/${inputPath}`
const OUT = new URL("file://" + resolved)
const XDUMP = new URL("file://" + `${process.cwd()}/data/x.json`)
const WAIT_MS = 1200 // X 礼儀: 1 req/s 以上の間隔

if (!inputPath) {
  console.log("使い方: node scripts/collect-x-photos.mjs <jsonファイルパス> [--all] [--limit N]")
  console.log("例: node scripts/collect-x-photos.mjs data/yoshimoto.json --limit 50")
  process.exit(1)
}

if (!existsSync(OUT.pathname)) {
  console.log(`ファイルが見つかりません: ${OUT.pathname}`)
  process.exit(1)
}

if (!existsSync(XDUMP.pathname)) {
  console.log(`data/x.json が見つかりません`)
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const getHtml = async (url) => {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) return await res.text()
      if (res.status === 429 || res.status === 503) {
        if (i >= 1) return null
        await sleep(5000)
        continue
      }
      return null
    } catch (e) {
      if (i >= 1) return null
      await sleep(5000)
    }
  }
  return null
}

// Xプロフィールページからプロフィール画像URLを抽出
const extractProfileImage = (html) => {
  const patterns = [
    // pbs.twimg.com/profile_images/... (400x400 または元サイズ)
    /https:\/\/pbs\.twimg\.com\/profile_images\/[^"&<>\s]+/g,
  ]
  for (const re of patterns) {
    const matches = [...html.matchAll(re)]
    for (const m of matches) {
      const url = m[0]
      // デフォルトエッグ画像やサイズ指定なしのものはスキップ
      if (/default_profile_images/.test(url)) continue
      // _400x400.jpg や _normal.jpg を元サイズに変換（_400x400 → なし、_normal → なし）
      let clean = url.replace(/_400x400\.(jpg|png)$/, ".$1").replace(/_normal\.(jpg|png)$/, ".$1")
      // クエリパラメータを除去
      clean = clean.split("?")[0]
      return clean
    }
  }
  return null
}

// data/x.json から pages（source_id → ハンドル配列）を読み込む
const xDump = JSON.parse(readFileSync(XDUMP.pathname, "utf8"))
const pages = xDump.pages || {}

// source_id から JSON ファイル内のタレントを特定する関数
// 戻り値: { file: 'yoshimoto' | 'agencies', index: number } または null
const resolveTalent = (sourceId, allTalents) => {
  if (sourceId.startsWith("yoshimoto:")) {
    const id = parseInt(sourceId.replace("yoshimoto:", ""), 10)
    const idx = allTalents.yoshimoto.findIndex((t) => t.id === id)
    return idx >= 0 ? { file: "yoshimoto", index: idx } : null
  }
  // 他事務所: {agency}:{slug}
  const m = sourceId.match(/^([^:]+):(.+)$/)
  if (!m) return null
  const [, agency, slug] = m
  // M-1公式の場合は slug の前に m1- が付く
  const actualSlug = slug.startsWith("m1-") ? slug.replace(/^m1-/, "") : slug
  const idx = allTalents.agencies.findIndex(
    (t) => t.agency === agency && t.url.includes(actualSlug)
  )
  return idx >= 0 ? { file: "agencies", index: idx } : null
}

// すべてのユニークハンドルと source_id のマッピングを構築
const handleToSources = new Map() // handle (lowercase) -> source_id[]
for (const [sourceId, handles] of Object.entries(pages)) {
  if (!Array.isArray(handles)) continue
  for (const h of handles) {
    const key = h.toLowerCase()
    if (!handleToSources.has(key)) handleToSources.set(key, [])
    handleToSources.get(key).push(sourceId)
  }
}

console.log(`Xハンドル数: ${handleToSources.size}件`)

const save = (talents) => {
  const raw = JSON.parse(readFileSync(OUT.pathname, "utf8"))
  const key = OUT.pathname.includes("yoshimoto") ? "talents" : "talents"
  raw[key] = talents
  raw.fetched_at = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
  writeFileSync(OUT.pathname, JSON.stringify(raw, null, 2))
}

const main = async () => {
  const raw = JSON.parse(readFileSync(OUT.pathname, "utf8"))
  let talents = raw.talents || raw
  const isArray = Array.isArray(talents)
  if (!isArray) talents = talents.talents

  // 対象ファイルの全タレント（source_id 解決用）
  const allTalents = {
    yoshimoto: JSON.parse(readFileSync(new URL("file://" + `${process.cwd()}/data/yoshimoto.json`).pathname, "utf8")).talents,
    agencies: JSON.parse(readFileSync(new URL("file://" + `${process.cwd()}/data/agencies.json`).pathname, "utf8")).talents,
  }

  // 対象を絞り込む: photo なし + pages に source_id があるもののみ（よしもと・M-1公式は pages にキーがないため除外）
  let todo = all
    ? talents
    : talents.filter((t) => !t.photo)

  if (!all) {
    const filtered = []
    for (const t of todo) {
      // よしもとは pages にキーがないためスキップ
      if (OUT.pathname.includes("yoshimoto")) continue
      // M-1公式サイトは pages にキーがないためスキップ
      if (t.url && t.url.startsWith("https://www.m-1gp.com/")) continue
      const m = t.url ? t.url.match(/([^/?=]+?)(?:\.html)?\/?$/) : null
      const slug = m ? m[1] : null
      const sourceId = slug ? `${t.agency}:${slug}` : null
      if (sourceId && pages[sourceId]) filtered.push(t)
    }
    todo = filtered
  }

  if (limit) todo = todo.slice(0, limit)

  const limitStr = limit ? ` / 制限 ${limit}件` : ""
  const mode = all ? "全件" : "未取得分のみ"
  console.log(`対象 ${todo.length}件 (${mode}${limitStr})`)

  let n = 0
  let found = 0
  let skipped = 0
  const handledSet = new Set() // 既に処理したハンドル

  for (const t of todo) {
    if (t.photo && !all) {
      skipped++
      continue
    }

    // このタレントの source_id を特定（pages に登録されているキーとマッチさせる）
    let sourceId = null
    if (OUT.pathname.includes("yoshimoto")) {
      // よしもとは pages に yoshimoto:{id} 形式のキーがないため、現状スキップ
      sourceId = null
    } else {
      // M-1公式サイトは pages に登録されていないためスキップ
      if (t.url.startsWith("https://www.m-1gp.com/")) {
        skipped++
        continue
      }
      // agencies: agency + slug from url
      const m = t.url.match(/([^/?=]+?)(?:\.html)?\/?$/)
      const slug = m ? m[1] : null
      sourceId = slug ? `${t.agency}:${slug}` : null
    }

    let photo = null
    let usedHandle = null

    if (sourceId && pages[sourceId]) {
      // source_id 直接マッピングがある場合
      const handles = pages[sourceId]
      for (const h of handles) {
        if (handledSet.has(h.toLowerCase())) continue
        handledSet.add(h.toLowerCase())
        const html = await getHtml(`https://x.com/${h}`)
        n++
        if (html) {
          photo = extractProfileImage(html)
          usedHandle = h
          if (photo) break
        }
        await sleep(WAIT_MS)
      }
    } else if (sourceId) {
      // source_id はあるが pages にマッピングがない（Xアカウント未登録）
      skipped++
      continue
    } else {
      skipped++
      continue
    }

    if (photo) {
      t.photo = photo
      found++
      console.log(`  ✓ ${t.name} (@${usedHandle}) -> ${photo}`)
    } else {
      t.photo = null
      console.log(`  - ${t.name} （Xに画像なし）`)
    }

    if (n % 10 === 0) {
      save(talents)
      console.log(`[${n}/${todo.length}] 取得済 ${found}件 / スキップ ${skipped}件`)
    }
    await sleep(WAIT_MS)
  }

  save(talents)
  console.log(`完了: ${n}件処理 / 新規取得 ${found}件 / スキップ ${skipped}件`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
