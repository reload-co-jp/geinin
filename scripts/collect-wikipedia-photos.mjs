// Wikipedia API (opensearch + pageimages) から芸人・コンビの画像URLを取得し、JSONに反映する
// 規約: 画像ファイルはコピーせず、Wikimedia Commons の画像URLを参照するだけにする
//
// 使い方:
//   node scripts/collect-wikipedia-photos.mjs data/yoshimoto.json    photo が null なタレントのみ取得
//   node scripts/collect-wikipedia-photos.mjs data/agencies.json     photo が null なタレントのみ取得
//   node scripts/collect-wikipedia-photos.mjs data/yoshimoto.json --all  全件再取得
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
const WAIT_MS = 600 // Wikipedia 礼儀: 間隔を短くしてスループットを上げる

if (!inputPath) {
  console.log("使い方: node scripts/collect-wikipedia-photos.mjs <jsonファイルパス> [--all]")
  console.log("例: node scripts/collect-wikipedia-photos.mjs data/yoshimoto.json")
  process.exit(1)
}

if (!existsSync(OUT.pathname)) {
  console.log(`ファイルが見つかりません: ${OUT.pathname}`)
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const getJson = async (url) => {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "geinin-db wikipedia image collector (contact: example@example.com)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) return await res.json()
      if (res.status === 429 || res.status === 503) {
        if (i >= 1) return null
        await sleep(3000)
        continue
      }
      return null
    } catch (e) {
      if (i >= 1) return null
      await sleep(3000)
    }
  }
  return null
}

// 芸人関連かどうかを説明文で判定
const isComedian = (desc) => {
  if (!desc) return false
  const d = desc.toLowerCase()
  return (
    /お笑い|芸人|タレント|ピン芸人|お笑いコンビ|お笑いトリオ|漫才師|コメディアン/.test(d) ||
    /^\s*\(?\s*(お笑い|芸人|タレント)/.test(d)
  )
}

// Wikipedia 検索で候補（タイトル, 説明）を取得
const searchCandidates = async (keyword) => {
  const url =
    "https://ja.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "opensearch",
      search: keyword,
      limit: "10",
      namespace: "0",
      format: "json",
    }).toString()
  const json = await getJson(url)
  if (!json || !Array.isArray(json) || json.length < 4) return []
  const titles = json[1]
  const descs = json[2] || []
  return titles.map((title, i) => ({ title, desc: descs[i] || "" }))
}

// スペースを除去した正規化
const norm = (s) => s.replace(/\s/g, "")

// 候補を優先順位付け: 正規化完全一致 > 説明に芸人関連語（その他は除外して誤マッチを防ぐ）
const rankCandidates = (candidates, keyword) => {
  const normKeyword = norm(keyword)
  const exact = candidates.filter((c) => norm(c.title) === normKeyword)
  const comedian = candidates.filter(
    (c) => norm(c.title) !== normKeyword && isComedian(c.desc)
  )
  return [...exact, ...comedian]
}

// 指定タイトルの pageimages サムネイルを取得
const fetchThumbnail = async (title) => {
  const url =
    "https://ja.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      prop: "pageimages",
      format: "json",
      pithumbsize: "200",
      titles: title,
    }).toString()
  const json = await getJson(url)
  if (!json || !json.query || !json.query.pages) return null
  const page = Object.values(json.query.pages)[0]
  if (!page || !page.thumbnail) return null
  return page.thumbnail.source
}

// 1人分の画像を取得（候補を優先順位順に試す）
const fetchPhoto = async (name) => {
  const candidates = await searchCandidates(name)
  const ranked = rankCandidates(candidates, name)
  for (const c of ranked) {
    // 曖昧さ回避ページなどはスキップ
    if (/\(曖昧さ回避\)$/.test(c.title)) continue
    const photo = await fetchThumbnail(c.title)
    if (photo) return { photo, title: c.title }
    await sleep(WAIT_MS)
  }
  return null
}

const save = (data) => {
  writeFileSync(
    OUT.pathname,
    JSON.stringify(data, null, 2)
  )
}

const main = async () => {
  const raw = JSON.parse(readFileSync(OUT.pathname, "utf8"))
  // yoshimoto.json: { talents: [...] } / agencies.json: { talents: [...] }
  const data = raw.talents || raw
  const isMap = Array.isArray(data)

  const items = isMap ? data : data.talents

  let todo = all
    ? items
    : items.filter((t) => !t.photo)

  if (limit) todo = todo.slice(0, limit)

  const label = all ? "全件" : "未取得分のみ"
  console.log(`対象 ${todo.length}件 (${label}${limit ? ` / 制限 ${limit}件` : ""})`)

  let n = 0
  let found = 0
  let skipped = 0

  for (const t of todo) {
    const name = t.name
    if (!name) {
      skipped++
      continue
    }

    // すでに photo がある場合はスキップ（--all 時でも重複取得しない）
    if (!all && t.photo) {
      skipped++
      continue
    }

    const result = await fetchPhoto(name)
    n++

    if (result) {
      t.photo = result.photo
      found++
      console.log(`  ✓ ${name} -> ${result.photo} (Wikipedia: ${result.title})`)
    } else {
      t.photo = null
      console.log(`  - ${name} （Wikipediaに画像なし）`)
    }

    if (n % 50 === 0) {
      raw.fetched_at = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
      save(raw)
      console.log(`[${n}/${todo.length}] 取得済 ${found}件 / スキップ ${skipped}件`)
    }
    await sleep(WAIT_MS)
  }

  raw.fetched_at = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
  save(raw)
  console.log(`完了: ${n}件処理 / 新規取得 ${found}件 / スキップ ${skipped}件`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
