// 公式プロフィールページに載っている X（旧Twitter）アカウントを集め、data/x.json に保存する。
// プロフィールは未調査のページだけを調べる（1秒1リクエスト）。
// X_BEARER_TOKEN があれば X API v2 でプロフィール（自己紹介・フォロワー数など）も毎回取り直す。
//   X_BEARER_TOKEN=... npx tsx scripts/collect-x.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { db } from "@/lib/db"
import { xHandles, type XDump } from "@/lib/x"

const OUT = new URL("../data/x.json", import.meta.url)
const WAIT_MS = 1000
const HEADERS = {
  "User-Agent": "geinin-db importer (fact extraction, 1 req/s)",
  "Accept-Language": "ja",
}

const dump: XDump = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : { fetched_at: "", pages: {}, accounts: {} }
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
    // トップや検索へ飛ばされたときはプロフィールが見られていないので未調査のままにする
    if (res.ok && new URL(res.url).pathname !== "/") return await res.text()
    console.warn(`${url} HTTP ${res.status} ${res.url}`)
  } catch (e) {
    console.warn(`${url} ${(e as Error).message}`)
  } finally {
    await sleep(WAIT_MS)
  }
  return null
}

const used = new Set([...db.people, ...db.groups].flatMap((e) => e.source_ids))
const todo = db.sources.filter(
  (s) =>
    s.source_type === "official" &&
    s.source_url &&
    new URL(s.source_url).pathname !== "/" &&
    used.has(s.id) &&
    !(s.id in dump.pages)
)
console.log(`プロフィール ${todo.length}件`)
for (const [i, s] of todo.entries()) {
  const html = await get(s.source_url!)
  if (html !== null) dump.pages[s.id] = xHandles(html)
  if (i % 50 === 49) {
    save()
    console.log(`${i + 1}/${todo.length}`)
  }
}

type ApiUser = {
  username: string
  name: string
  description?: string
  location?: string
  created_at?: string
  public_metrics?: { followers_count: number }
  entities?: { url?: { urls?: { expanded_url?: string }[] } }
}
const token = process.env.X_BEARER_TOKEN
const handles = [...new Set(Object.values(dump.pages).flat())]
if (!token) console.log("X_BEARER_TOKEN が無いのでプロフィール取得は省略")
// users/by は1回100件まで
for (let i = 0; token && i < handles.length; i += 100) {
  const q = new URLSearchParams({
    usernames: handles.slice(i, i + 100).join(","),
    "user.fields":
      "description,location,url,created_at,public_metrics,entities",
  })
  const res = await fetch(`https://api.x.com/2/users/by?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    console.warn(`X API HTTP ${res.status} ${await res.text()}`)
    break
  }
  for (const u of ((await res.json()).data ?? []) as ApiUser[])
    dump.accounts[u.username.toLowerCase()] = {
      handle: u.username,
      name: u.name,
      description: u.description || undefined,
      location: u.location || undefined,
      url: u.entities?.url?.urls?.[0]?.expanded_url,
      followers: u.public_metrics?.followers_count,
      created_at: u.created_at?.slice(0, 10),
    }
  await sleep(WAIT_MS)
}
save()
console.log("保存しました")
