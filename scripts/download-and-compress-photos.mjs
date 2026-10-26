// 公式プロフィールの画像をダウンロードし、WebP に変換・圧縮して public/images/photos/ に保存する。
// agencies.json の photo フィールドを絶対URLから /images/photos/<ファイル名>.webp に書き換える。
// 規約: 画像は各事務所の公式サイトから取得し、WebP に圧縮してローカル保存する。
//   node scripts/download-and-compress-photos.mjs          未保存分のみ処理
//   node scripts/download-and-compress-photos.mjs --all    全件をやり直す
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlink,
} from "node:fs"
import { Buffer } from "node:buffer"
import { fileURLToPath } from "node:url"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const OUT = new URL("../data/agencies.json", import.meta.url)
const PUBLIC_DIR = new URL("../public/images/photos/", import.meta.url)
const TMP_DIR = new URL("../tmp/photos/", import.meta.url)
const WAIT_MS = 1000
const WEBP_QUALITY = 80
const MAX_DIM = 400

mkdirSync(fileURLToPath(PUBLIC_DIR), { recursive: true })
mkdirSync(fileURLToPath(TMP_DIR), { recursive: true })

const execFileAsync = promisify(execFile)
const unlinkAsync = promisify(unlink)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "geinin-db photo downloader (1 req/s)" },
        signal: AbortSignal.timeout(30000),
      })
      if (res.ok) return await res.arrayBuffer()
      if (res.status === 404) return null
      throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      if (i >= 2) throw e
      await sleep(5000)
    }
  }
  return null
}

// URL からファイル名用の識別子を抽出（URLの最後のパスセグメントから拡張子を除く）
const slugFromUrl = (url) => {
  const pathname = new URL(url).pathname
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1]
  // 拡張子を除去
  const slug = last.replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, "")
  return slug || null
}

// 画像をダウンロードして WebP に変換・保存。戻り値: 相対パス または null
const downloadAndConvert = async (url) => {
  const slug = slugFromUrl(url)
  if (!slug) return null
  const outName = `${slug}.webp`
  const outUrl = new URL(outName, PUBLIC_DIR)
  const outFsPath = fileURLToPath(outUrl)

  // 既に保存済みならスキップ
  if (existsSync(outFsPath)) return `/images/photos/${outName}`

  const buf = await get(url)
  if (!buf) return null

  const tmpBase = fileURLToPath(new URL(slug, TMP_DIR))
  const ext = url.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] ?? "jpg"
  const tmpWithExt = `${tmpBase}.${ext}`
  writeFileSync(tmpWithExt, Buffer.from(buf))

  try {
    await execFileAsync(
      "cwebp",
      [
        "-q",
        String(WEBP_QUALITY),
        "-resize",
        String(MAX_DIM),
        String(MAX_DIM),
        tmpWithExt,
        "-o",
        outFsPath,
      ],
      { timeout: 30000 }
    )
    return `/images/photos/${outName}`
  } catch (e) {
    console.warn(`  cwebp 失敗 ${slug}: ${e.message}`)
    return null
  } finally {
    if (existsSync(tmpWithExt)) {
      try {
        await unlinkAsync(tmpWithExt)
      } catch {
        /* ignore */
      }
    }
  }
}

const main = async () => {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="))
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity
  const raw = JSON.parse(readFileSync(OUT, "utf8"))
  const data = [...raw.talents]

  // 未保存分のみ：photo が絶対URL（http で始まる）のもの
  const unprocessed = data
    .filter((t) => t.photo && String(t.photo).startsWith("http"))
    .slice(0, limit)
  const alreadySaved = data.filter(
    (t) => t.photo && String(t.photo).startsWith("/images/photos/")
  )
  console.log(
    `すでに保存済み: ${alreadySaved.length}件 / 未保存: ${unprocessed.length}件`
  )

  if (unprocessed.length === 0) {
    console.log("すべて保存済みです")
    return
  }

  let n = 0
  let saved = 0
  let failed = 0
  const save = () =>
    writeFileSync(
      OUT,
      JSON.stringify(
        {
          fetched_at: new Date().toLocaleDateString("sv-SE", {
            timeZone: "Asia/Tokyo",
          }),
          talents: data.sort(
            (a, b) =>
              a.agency.localeCompare(b.agency) || a.url.localeCompare(b.url)
          ),
        },
        null,
        2
      )
    )
  save()

  for (const t of unprocessed) {
    const agency = t.agency
    const photoUrl = t.photo
    const relPath = await downloadAndConvert(photoUrl)
    n++
    if (relPath) {
      t.photo = relPath
      saved++
      console.log(`  ✓ ${t.name} (${agency}) -> ${relPath}`)
    } else {
      failed++
      console.log(`  - ${t.name} (${agency}) （保存失敗）`)
    }
    if (n % 25 === 0) {
      save()
      console.log(
        `[${n}/${unprocessed.length}] 保存済 ${saved}件 / 失敗 ${failed}件`
      )
    }
    await sleep(WAIT_MS)
  }
  save()
  console.log(`完了: ${n}件処理 / 保存 ${saved}件 / 失敗 ${failed}件`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
