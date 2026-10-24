// 公式プロフィールページに載っている YouTube チャンネルと登録者数を集め、data/youtube.json に保存する。
// プロフィールは未調査のページだけを調べ、チャンネルページ（登録者数）は毎回取り直す。1秒1リクエスト。
//   npx tsx scripts/collect-youtube.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { db } from "@/lib/db"
import {
  channelUrls,
  parseSubscribers,
  type YoutubeDump,
} from "@/lib/youtube"

const OUT = new URL("../data/youtube.json", import.meta.url)
const WAIT_MS = 1000
const HEADERS = {
  "User-Agent": "geinin-db importer (fact extraction, 1 req/s)",
  "Accept-Language": "ja",
}

const dump: YoutubeDump = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : { fetched_at: "", pages: {}, channels: {} }
const save = () => {
  dump.fetched_at = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Tokyo",
  })
  writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const get = async (url: string) => {
  try {
    const res = await fetch(url, { headers: HEADERS })
    if (res.ok) return await res.text()
    console.warn(`${url} HTTP ${res.status}`)
  } catch (e) {
    console.warn(`${url} ${(e as Error).message}`)
  } finally {
    await sleep(WAIT_MS)
  }
  return null
}

const used = new Set(
  [...db.people, ...db.groups].flatMap((e) => e.source_ids)
)
const todo = db.sources.filter(
  (s) =>
    s.source_type === "official" &&
    s.source_url &&
    used.has(s.id) &&
    !(s.id in dump.pages)
)
console.log(`プロフィール ${todo.length}件`)
for (const [i, s] of todo.entries()) {
  const html = await get(s.source_url!)
  if (html !== null) dump.pages[s.id] = channelUrls(html)
  if (i % 50 === 49) {
    save()
    console.log(`${i + 1}/${todo.length}`)
  }
}

const urls = [...new Set(Object.values(dump.pages).flat())]
console.log(`チャンネル ${urls.length}件`)
for (const url of urls) {
  const html = await get(url)
  const id = html?.match(/"externalId":"(UC[\w-]{22})"/)?.[1]
  const title = html?.match(/<meta property="og:title" content="([^"]*)"/)?.[1]
  // ページ上部の見出し。それより前に出る数値はおすすめチャンネルのもの
  const subs = html?.match(
    /"metadataParts":\[\{"text":\{"content":"(チャンネル登録者数[^"]*)"/
  )?.[1]
  dump.channels[url] =
    id && title
      ? {
          url: `https://www.youtube.com/channel/${id}`,
          title: title.replace(/&amp;/g, "&").replace(/&#39;/g, "'"),
          subscribers: subs ? parseSubscribers(subs) : null,
        }
      : (dump.channels[url] ?? null)
}
save()
console.log("保存しました")
