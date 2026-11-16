// 公式プロフィールページに載っている X（旧Twitter）アカウントを集め、data/x.json に保存する。
// プロフィールは未調査のページだけを調べる（1秒1リクエスト）。
// X_BEARER_TOKEN があれば X API v2 でプロフィール（自己紹介・フォロワー数など）と最新投稿も毎回取り直す。
// 最新投稿は静的書き出しのためビルド前に取り込む（埋め込みウィジェットは外部JS・未ログイン時に出ない）。
//   X_BEARER_TOKEN=... npx tsx scripts/collect-x.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { db } from "@/lib/db"
import { unescapeXText, xHandles, type XDump } from "@/lib/x"

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
  id: string
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
      id: u.id,
      // 投稿の取得に失敗したときは前回分を残す
      posts: dump.accounts[u.username.toLowerCase()]?.posts,
      name: u.name,
      description: u.description || undefined,
      location: u.location || undefined,
      url: u.entities?.url?.urls?.[0]?.expanded_url,
      followers: u.public_metrics?.followers_count,
      created_at: u.created_at?.slice(0, 10),
    }
  await sleep(WAIT_MS)
}

type ApiPost = { id: string; text: string; created_at: string }
// users/:id/tweets は1アカウント1リクエスト（最少5件）。リポスト・返信は本人の発信ではないので除く
// ponytail: 全アカウントを毎回取る。件数・課金が問題になったら更新日の古い順に上限を切る
const accounts = Object.values(dump.accounts).filter((a) => a.id)
if (token) console.log(`最新投稿 ${accounts.length}件`)
for (const a of token ? accounts : []) {
  const q = new URLSearchParams({
    max_results: "5",
    exclude: "retweets,replies",
    "tweet.fields": "created_at",
  })
  const res = await fetch(`https://api.x.com/2/users/${a.id}/tweets?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  await sleep(WAIT_MS)
  if (!res.ok) {
    console.warn(`X API @${a.handle} HTTP ${res.status} ${await res.text()}`)
    // 上限に達したら以降も失敗するので打ち切る
    if (res.status === 429) break
    continue
  }
  a.posts = (((await res.json()).data ?? []) as ApiPost[])
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      text: unescapeXText(p.text),
      created_at: p.created_at,
    }))
}
save()
console.log("保存しました")
