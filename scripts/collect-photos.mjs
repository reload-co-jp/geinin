// 画像のない芸人の画像URLを公式プロフィールから取得し data/yoshimoto.json に反映する
// 規約: 画像ファイルはコピーせず、公式プロフィールの画像URLを参照するだけにする
//   node scripts/collect-photos.mjs          photo が null な吉本タレントを再取得
//   node scripts/collect-photos.mjs --all    吉本タレント全件を再取得
import { readFileSync, writeFileSync } from "node:fs"

const BASE = "https://profile.yoshimoto.co.jp"
const OUT = new URL("../data/yoshimoto.json", import.meta.url)
const WAIT_MS = 1000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "geinin-db photo collector (1 req/s)",
        },
        signal: AbortSignal.timeout(30000),
      })
      if (res.ok) return await res.text()
      if (res.status === 404) return null
      throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      if (i >= 2) throw e
      await sleep(5000)
    }
  }
  return null
}

// プロフィール画像URLを複数のパターンで抽出
const extractPhoto = (html) => {
  const patterns = [
    // 既定パターン: assets/data/profile/...jpg
    /src="(https:\/\/profile\.yoshimoto\.co\.jp\/assets\/data\/profile\/[^"]+)"/,
    // og:image
    /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i,
    // 画像タグ版
    /<img[^>]+src="(https:\/\/profile\.yoshimoto\.co\.jp\/assets\/data\/profile\/[^"]+)"/i,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return m[1]
  }
  return null
}

const main = async () => {
  const all = process.argv.includes("--all")
  if (!all) {
    console.log("使い方: node scripts/collect-photos.mjs --all")
    console.log("  吉本タレント全件を再取得し、公式プロフィール画像URLを data/yoshimoto.json に反映します")
    console.log("  （※ 1 req/s でアクセス。全件約15分程度。未取得分のみ再取得したい場合は import-yoshimoto.mjs をご利用ください）")
    return
  }
  const raw = JSON.parse(readFileSync(OUT, "utf8"))
  const data = new Map(raw.talents.map((t) => [t.id, t]))

  const todo = all
    ? [...data.values()].map((t) => t.id)
    : [...data.values()].filter((t) => !t.photo).map((t) => t.id)

  const modeLabel = all ? "全件" : "photoなし"
  console.log(`対象 ${todo.length}件（${modeLabel}）`)

  let n = 0
  let found = 0
  const save = () => {
    writeFileSync(
      OUT,
      JSON.stringify(
        {
          source: `${BASE}/`,
          fetched_at: new Date().toLocaleDateString("sv-SE", {
            timeZone: "Asia/Tokyo",
          }),
          talents: [...data.values()].sort((a, b) => a.id - b.id),
        },
        null,
        2
      )
    )
  }
  save()

  for (const id of todo) {
    const t = data.get(id)
    if (!t) continue
    const html = await get(`${BASE}/talent/detail?id=${id}`)
    if (!html) {
      console.warn(`id=${id} 取得失敗`)
    } else {
      const photo = extractPhoto(html)
      if (photo) {
        t.photo = photo
        found++
        console.log(`  ✓ id=${id} ${t.name} -> ${photo}`)
      } else {
        t.photo = null
        console.log(`  - id=${id} ${t.name} （画像なし）`)
      }
    }
    n++
    if (n % 50 === 0) {
      save()
      console.log(`[${n}/${todo.length}] 取得済 ${found}件`)
    }
    await sleep(WAIT_MS)
  }
  save()
  console.log(`完了: ${n}件処理 / 新規取得 ${found}件`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
