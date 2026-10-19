// 吉本以外の事務所公式サイトから芸人の名前・読み・メンバー構成のみを取得し data/agencies.json に保存する。
// 経歴文・出演作などの文章は転載しない。事務所ごとに1秒1リクエスト。途中終了しても再実行で続きから取得する。
//   node scripts/import-agencies.mjs              未取得分を取得
//   node scripts/import-agencies.mjs --all        全件を取り直す
//   node scripts/import-agencies.mjs ohtapro titan 指定した事務所のみ
import { existsSync, readFileSync, writeFileSync } from "node:fs"

const OUT = new URL("../data/agencies.json", import.meta.url)
const WAIT_MS = 1000

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&#0?38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()

const all = (html, re) => [...html.matchAll(re)]
const between = (html, from, to) => {
  const i = html.indexOf(from)
  if (i < 0) return ""
  const j = to ? html.indexOf(to, i + from.length) : -1
  return html.slice(i, j < 0 ? undefined : j)
}
// 「井口浩之 （左）」「岡下 浩也(おかしたひろや)」「大島 あきと（オオシマ アキト）」の立ち位置・読みの括弧を外す。読みは平仮名に揃える
const KANA_PAREN = /^(.+?)\s*[（(［[]([ぁ-んァ-ヶー ]+)[）)］\]]$/
const hiragana = (s) =>
  s && s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
const member = (name, kana) => {
  name = name.replace(/\s*[（(](?:左|右|中|中央|真ん中|写真[^）)]*)[）)]$/, "")
  const paren = name.match(KANA_PAREN)
  if (paren) {
    name = paren[1]
    kana ||= paren[2]
  }
  return { name, kana: hiragana(kana) || null }
}
const names = (html, re) =>
  all(html, re).map((m) => member(decode(m[1]), m[2] ? decode(m[2]) : null))

// 立ち位置の印を含む行をメンバー名とみなす。プロフィール項目（「生年月日：」など）を含む行は除く
const positioned = (html, mark) =>
  html
    .split(/<br\s*\/?>|<\/p>|<\/div>/)
    .map(decode)
    .filter((l) => mark.test(l) && !/[:：]/.test(l) && l.length <= 40)
    .map((l) => {
      const name = l.replace(new RegExp(mark.source, "g"), "").trim()
      const m = name.match(/^(.*[^ぁ-んー ])\s+([ぁ-んー ]+)$/)
      return m ? member(m[1], m[2]) : member(name, null)
    })
    .filter((m) => m.name)

// list: 一覧ページの URL, links: 一覧 HTML → [{ url, name, kana }], members: 詳細 HTML → [{ name, kana }]
export const AGENCIES = {
  shochiku: {
    list: ["https://www.shochikugeino.co.jp/talents/03/"],
    // 一覧ページには他ジャンルも含まれるため、お笑い・バラエティ (03) の項目だけ拾う
    links: (html) =>
      all(
        html,
        /<li class="([^"]*)"[^>]*>\s*<a href="(https:\/\/www\.shochikugeino\.co\.jp\/talents\/[\w-]+\/)">[\s\S]*?<p class="name">([^<]+)<\/p>/g
      )
        .filter((m) => /-03\b/.test(m[1]))
        .map((m) => ({ url: m[2], name: decode(m[3]), kana: null })),
    // 個人ページも名前欄が1つあるため、2つ以上のときだけメンバーとみなす
    members: (html) => {
      const m = names(
        html,
        /talent-single-name">([^<]+)<\/strong>\s*<strong class="talent-yomigana">([^<【]*)/g
      )
      return m.length > 1 ? m : []
    },
  },
  watanabe: {
    list: ["https://www.watanabepro.co.jp/artist/500/"],
    links: (html) =>
      all(
        html,
        /href="(\/mypage\/\d+\/)"[\s\S]*?card-s-simple-item__title">([^<]+)</g
      ).map((m) => ({
        url: `https://www.watanabepro.co.jp${m[1]}`,
        name: decode(m[2]),
        kana: null,
      })),
    // 個人ページの同じ欄には所属グループが載るため、2つ以上のときだけメンバーとみなす
    members: (html) => {
      const m = names(
        between(html, '<ul class="mypage-group">', "</ul>"),
        /<span>([^<]+)<\/span>/g
      )
      return m.length > 1 ? m : []
    },
  },
  ohtapro: {
    list: ["https://www.ohtapro.co.jp/talent/"],
    links: (html) =>
      all(
        html,
        /<a href="([\w-]+\.html)">[\s\S]*?<rb>([^<]+)<\/rb>\s*<rt>([^<]*)<\/rt>/g
      ).map((m) => ({
        url: `https://www.ohtapro.co.jp/talent/${m[1]}`,
        name: decode(m[2]),
        kana: decode(m[3]) || null,
      })),
    members: (html) =>
      names(
        html,
        /<p class="member">\s*<ruby>\s*<rb>([^<]+)<\/rb>\s*<rt>([^<]*)<\/rt>/g
      ),
  },
  jinrikisha: {
    list: ["https://www.p-jinriki.com/talent/"],
    links: (html) =>
      all(
        html,
        /<a href="(https:\/\/www\.p-jinriki\.com\/talent\/[\w-]+\/)">[\s\S]*?<h2>([^<]+)<\/h2>/g
      ).map((m) => ({ url: m[1], name: decode(m[2]), kana: null })),
    members: (html) =>
      // 「【左】鈴木 拓（すずきたく）」「飯塚 悟志（いいづかさとし） 【中】」
      positioned(
        between(html, '<div class="prof_desc">', "talent_prof END"),
        /【(?:左|中|右)】/
      ),
  },
  sma: {
    list: ["https://sma-owarai.com/s/beachv/?ima=4507"],
    links: (html) =>
      all(
        html,
        /href="(\/s\/beachv\/artist\/\w+)\?ima=\d+"[\s\S]*?<p>([^<]+)<\/p>/g
      ).map((m) => ({
        url: `https://sma-owarai.com${m[1]}`,
        name: decode(m[2]),
        kana: null,
      })),
    members: (html) =>
      names(html, /<p class="acto_name">(?:[^：<]*：)?([^<]+)<\/p>/g),
  },
  grape: {
    list: ["https://grapecom.jp/talent_writer/"],
    // TALENT 欄の各項目は「コンビ」「俳優」などの種別と名前を持つ。芸人の種別だけ拾う
    links: (html) =>
      all(
        between(html, ">TALENT<", ">WRITER<"),
        /href="(https:\/\/grapecom\.jp\/talent_writer\/[\w-]+\/)"[^>]*>([\s\S]*?)<\/a>/g
      )
        .map((m) => [
          m[1],
          m[2]
            .split(/<[^>]+>/)
            .map(decode)
            .filter(Boolean),
        ])
        .filter(([, [kind]]) => /コンビ|トリオ|ピン|芸人|ユニット/.test(kind))
        .map(([url, [, name]]) => ({ url, name, kana: null })),
    members: (html) =>
      names(
        between(html, '<table class="profile-table pc">', "</thead>"),
        /<th>([^<]+)<span>/g
      ),
  },
  titan: {
    list: ["https://www.titan-net.co.jp/talent/"],
    // 文化人・作家の欄より前がタレント。一覧は画像のみのため名前は詳細ページの title から取る
    links: (html) =>
      all(
        between(html, ">タレント<", ">文化人<"),
        /href="(https:\/\/www\.titan-net\.co\.jp\/talent\/[\w-]+\/)"/g
      ).map((m) => ({ url: m[1], name: null, kana: null })),
    name: (html) => decode(html.match(/<title>([^<|]+)/)?.[1] ?? "") || null,
    members: (html) =>
      names(html, /<strong>([^<]+)<\/strong><\/p>\s*<p>生年月日/g),
  },
  maseki: {
    list: ["https://www.maseki.co.jp/talent/"],
    links: (html) =>
      all(
        between(html, 'id="A_gid1"', '<div id="A_gid'),
        /data-url="(\/talent\/detail\?talent_id=\d+)"[\s\S]*?talent_list_name">([^<]+)</g
      ).map((m) => ({
        url: `https://www.maseki.co.jp${m[1]}`,
        name: decode(m[2]),
        kana: null,
      })),
    // 名前欄は SNS 欄と同じ見出しを使うため、見出し語を除く
    members: (html) =>
      names(
        html,
        /<div class="head_bar">([^<]+)<\/div><div class="sns_icon">/g
      ).filter((m) => !/^(SNS|YouTube|動画配信チャンネル)$/.test(m.name)),
  },
  asai: {
    list: ["https://asaikikaku.co.jp/talent/category/comedian"],
    links: (html) =>
      all(
        html,
        /href="(https?:\/\/asaikikaku\.co\.jp\/talent\/profile\/[\w-]+)"[^>]*>([\s\S]*?)<\/a>/g
      ).map((m) => ({
        url: m[1].replace(/^http:/, "https:"),
        name: decode(m[2]).replace(/\s*\[[^\]]*\]$/, ""),
        kana: null,
      })),
    members: (html) =>
      positioned(
        between(html, '<div class="talent_txt">', "</div>"),
        /【(?:左|中|右)】/
      ),
  },
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

const crawl = async (agency, conf, data, refetch, save) => {
  const found = new Map()
  for (const url of conf.list) {
    for (const t of conf.links(await get(url)))
      if (!found.has(t.url)) found.set(t.url, t)
    await sleep(WAIT_MS)
  }
  console.log(`${agency}: 一覧 ${found.size}件`)
  let n = 0
  for (const t of found.values()) {
    if (!refetch && data.get(t.url)?.members) continue
    let members = null
    let name = t.name
    try {
      const html = await get(t.url)
      members = conf.members(html)
      name = conf.name?.(html) ?? name
    } catch (e) {
      console.warn(`${t.url} ${e.message}`)
    }
    // members: null は詳細未取得。統合時は既存レコードへの所属付与だけに使う
    if (name)
      data.set(t.url, { agency, url: t.url, name, kana: t.kana, members })
    if (++n % 50 === 0) save()
    await sleep(WAIT_MS)
  }
}

const main = async () => {
  const args = process.argv.slice(2)
  const refetch = args.includes("--all")
  const targets = args.filter((a) => !a.startsWith("--"))
  const data = new Map(
    existsSync(OUT)
      ? JSON.parse(readFileSync(OUT, "utf8")).talents.map((t) => [t.url, t])
      : []
  )
  const save = () =>
    writeFileSync(
      OUT,
      JSON.stringify({
        fetched_at: new Date().toLocaleDateString("sv-SE", {
          timeZone: "Asia/Tokyo",
        }),
        talents: [...data.values()].sort(
          (a, b) =>
            a.agency.localeCompare(b.agency) || a.url.localeCompare(b.url)
        ),
      })
    )
  // 事務所ごとに別ホストなので並行に回す
  await Promise.all(
    Object.entries(AGENCIES)
      .filter(([a]) => !targets.length || targets.includes(a))
      .map(([a, conf]) =>
        crawl(a, conf, data, refetch, save).catch((e) =>
          console.warn(`${a}: ${e.message}`)
        )
      )
  )
  save()
  console.log(`保存 ${data.size}件`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
