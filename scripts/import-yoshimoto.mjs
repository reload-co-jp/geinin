// 吉本興業 公式プロフィール (profile.yoshimoto.co.jp) から事実項目のみを取得し data/yoshimoto.json に保存する。
// 経歴文・出演作などの文章は転載しない。1秒1リクエスト。途中終了しても再実行で続きから取得する。
//   node scripts/import-yoshimoto.mjs          未取得分を取得
//   node scripts/import-yoshimoto.mjs --all    全件を取り直す
import { existsSync, readFileSync, writeFileSync } from "node:fs"

const BASE = "https://profile.yoshimoto.co.jp"
const OUT = new URL("../data/yoshimoto.json", import.meta.url)
const WAIT_MS = 1000

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()

const field = (html, label) => {
  const m = html.match(new RegExp(`<p>${label}：([\\s\\S]*?)</p>`))
  return m ? decode(m[1]) || null : null
}

const date = (s) => {
  const m = s?.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null
}

const yearMonth = (s) => {
  const m = s?.match(/(\d{4})\D*(\d{1,2})?/)
  return m ? (m[2] ? `${m[1]}-${m[2].padStart(2, "0")}` : m[1]) : null
}

export const parse = (id, html) => {
  const name = html.match(/class="prof_name">([\s\S]*?)<\/p>/)
  if (!name) return null
  const head = html.match(/<h1>([\s\S]*?)<\/h1>/)[1]
  const kana = html.match(/class="prof_kana">\s*<p>([\s\S]*?)<\/p>/)
  const category = html.match(
    /<ul class="prof_category">([\s\S]*?)(?:<\/ul>|<div)/
  )
  const members = [
    ...html.matchAll(
      /class="prof_person js-profPerson"[\s\S]*?(?=class="prof_person js-profPerson"|class="detailBoxWrap"|$)/g
    ),
  ].map(([block]) => {
    const [, n, k] = block.match(/prof_person_name">([^<(]*)\(([^)]*)\)/) ?? [
      null,
      decode(block.match(/prof_person_name">([^<]*)/)?.[1] ?? ""),
      "",
    ]
    return {
      id:
        Number(
          block.match(
            /modalLink_text"><a href="\/talent\/detail\?id=(\d+)"/
          )?.[1]
        ) || null,
      name: decode(n),
      kana: decode(k) || null,
      position:
        decode(block.match(/prof_person_position">([^<]*)/)?.[1] ?? "") || null,
    }
  })
  // 個人ページは h1 に所属グループへのリンクを持つ
  const groups = [...head.matchAll(/detail\?id=(\d+)/g)].map((m) =>
    Number(m[1])
  )
  return {
    id,
    name: decode(name[1]),
    kana: kana ? decode(kana[1]) || null : null,
    categories: category
      ? [...category[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) =>
          decode(m[1])
        )
      : [],
    formed: yearMonth(field(html, "結成年月")),
    groups,
    members,
    // メンバー一覧を持つグループページでは個人欄はメンバーのもの
    birth: members.length ? null : date(field(html, "生年月日")),
    origin: members.length ? null : field(html, "出身\\/入社\\/入門"),
  }
}

const main = async () => {
  const all = process.argv.includes("--all")
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text()
  const ids = [
    ...new Set(
      [...sitemap.matchAll(/detail\?id=(\d+)/g)].map((m) => Number(m[1]))
    ),
  ]
  const data = new Map(
    !all && existsSync(OUT)
      ? JSON.parse(readFileSync(OUT, "utf8")).talents.map((t) => [t.id, t])
      : []
  )
  const todo = ids.filter((id) => !data.has(id))
  const save = () =>
    writeFileSync(
      OUT,
      JSON.stringify({
        source: `${BASE}/`,
        fetched_at: new Date().toLocaleDateString("sv-SE", {
          timeZone: "Asia/Tokyo",
        }),
        talents: [...data.values()].sort((a, b) => a.id - b.id),
      })
    )
  console.log(`sitemap ${ids.length}件 / 取得対象 ${todo.length}件`)
  for (const [i, id] of todo.entries()) {
    try {
      const res = await fetch(`${BASE}/talent/detail?id=${id}`, {
        headers: {
          "User-Agent": "geinin-db importer (fact extraction, 1 req/s)",
        },
      })
      if (res.ok) {
        const t = parse(id, await res.text())
        if (t) data.set(id, t)
      } else console.warn(`id=${id} HTTP ${res.status}`)
    } catch (e) {
      console.warn(`id=${id} ${e.message}`)
    }
    if (i % 50 === 49) {
      save()
      console.log(`${i + 1}/${todo.length}`)
    }
    await new Promise((r) => setTimeout(r, WAIT_MS))
  }
  save()
  console.log(`保存 ${data.size}件`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
