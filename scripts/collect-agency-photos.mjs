// 事務所公式サイトからメイン画像URLを取得し、
// data/agencies.json の talent レコードに photo フィールドを付与する。
// 規約: 画像ファイルはコピーせず、公式プロフィールの画像URLを参照するだけにする。
//   node scripts/collect-agency-photos.mjs <事務所id>   指定事務所のみ取得（未取得分のみ）
//   node scripts/collect-agency-photos.mjs --all          全事務所を取得（未取得分のみ）
// 対応事務所: asai grape jinrikisha maseki ohtapro sma shochiku titan watanabe
// （shochiku・titan は一覧ページからコンビ/グループ写真を一括取得）
import { readFileSync, writeFileSync } from "node:fs"

const OUT = new URL("../data/agencies.json", import.meta.url)
const WAIT_MS = 1000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const key = (s) => s.normalize("NFKC").replace(/[\s・]/g, "")

const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "geinin-db photo collector (1 req/s)" },
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

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const toAbsolute = (u, base) => {
  try {
    return new URL(u, base).href
  } catch {
    return null
  }
}

// 各事務所の詳細ページからメイン画像を抽出（1タレントずつ詳細ページを取得）
// 戻り値: 絶対URL または null
const detailExtractors = {
  ohtapro: (html, url) => {
    const mSlug = url.match(new RegExp("talent/([^/]+?)(?:\\.html)?/?$"))
    const slug = mSlug ? mSlug[1] : null
    if (!slug) return null
    const re = new RegExp("images/" + escapeRegExp(slug) + "\\.jpg", "i")
    const matches = [...html.matchAll(/(?:src|href)=["']([^"']*)["']/gi)]
    const candidates = matches.map((x) => x[1])
    const exact = candidates.find((u) => re.test(u))
    if (exact) return toAbsolute(exact, url)
    const fallback = candidates.find(
      (u) =>
        /images\//i.test(u) &&
        !/release|logo|header|bnr|icon|btn|button|sp-|pc-/.test(u)
    )
    return fallback ? toAbsolute(fallback, url) : null
  },

  asai: (html, url) => {
    const mSlug = url.match(new RegExp("talent/profile/([^/]+)/?$"))
    const slug = mSlug ? mSlug[1] : null
    if (!slug) return null
    const re = new RegExp(
      "wp-content/uploads/" + escapeRegExp(slug) + "\\.jpg",
      "i"
    )
    const matches = [...html.matchAll(/(?:src|href)=["']([^"']*)["']/gi)]
    const candidates = matches.map((x) => x[1])
    const exact = candidates.find((u) => re.test(u))
    return exact ? toAbsolute(exact, url) : null
  },

  grape: (html, url) => {
    const mSlug = url.match(new RegExp("talent_writer/([^/]+)/?$"))
    const slug = mSlug ? mSlug[1].replace(/-/g, "_") : null
    if (!slug) return null
    const re = new RegExp("profile-thumb-" + escapeRegExp(slug) + "\\.jpg", "i")
    const matches = [...html.matchAll(/(?:src|href)=["']([^"']*)["']/gi)]
    const candidates = matches.map((x) => x[1])
    const exact = candidates.find((u) => re.test(u))
    return exact ? toAbsolute(exact, url) : null
  },

  jinrikisha: (html, url) => {
    const mSlug = url.match(new RegExp("talent/([^/]+)/?$"))
    const slug = mSlug ? mSlug[1] : null
    if (!slug) return null
    const re = new RegExp(
      "talent/img/" + escapeRegExp(slug) + "_mypage\\.jpg",
      "i"
    )
    const matches = [...html.matchAll(/(?:src|href)=["']([^"']*)["']/gi)]
    const candidates = matches.map((x) => x[1])
    const exact = candidates.find((u) => re.test(u))
    return exact ? toAbsolute(exact, url) : null
  },

  maseki: (html, url) => {
    const mId = url.match(/[?&]talent_id=(\d+)/)
    const id = mId ? mId[1] : null
    if (!id) return null
    const re = new RegExp(
      "talent_images/profile_image_" + escapeRegExp(id) + "_.*\\.JPG",
      "i"
    )
    const matches = [...html.matchAll(/(?:src|href)=["']([^"']*)["']/gi)]
    const candidates = matches.map((x) => x[1])
    const exact = candidates.find((u) => re.test(u))
    return exact ? toAbsolute(exact, url) : null
  },

  sma: (html, url) => {
    const matches = [
      ...html.matchAll(
        /(?:src|href)=["']([^"']*\/images\/15\/[^"']*-\d+\.[^"']*)["']/gi
      ),
    ]
    const candidates = matches.map((x) => x[1])
    const exact = candidates.find((u) => /-01\.(jpg|jpeg|png)$/i.test(u))
    return exact ? toAbsolute(exact, url) : null
  },

  watanabe: (html, url) => {
    const mId = url.match(/mypage\/(\d+)\/?/)
    const id = mId ? mId[1] : null
    if (!id) return null
    const re = new RegExp("img/profile/" + escapeRegExp(id) + "\\.jpg", "i")
    const matches = [...html.matchAll(/(?:src|href)=["']([^"']*)["']/gi)]
    const candidates = matches.map((x) => x[1])
    const exact = candidates.find((u) => re.test(u))
    return exact ? toAbsolute(exact, url) : null
  },
}

// 各事務所の一覧ページから全タレントの画像を一括抽出（1ページ取得で完了）
// 戻り値: Map<識別子, 画像絶対URL>
//   shochiku: 識別子 = タレント名（key正規化）
//   titan: 識別子 = 詳細ページURL
const listExtractors = {
  shochiku: (html, listUrl) => {
    const result = new Map()
    // <li data-talent-gender=...> 各エントリ: <a href="..."> + 画像 + <p class="name">名前</p>
    // data-talent-gender を持つ li のみを対象にし、ヘッダー/フッターの偽陽性を除外
    const re =
      /<li[^>]*data-talent-gender[^>]*>[\s\S]*?<a href="([^"]+)">[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<p class="name">([^<]+)<\/p>[\s\S]*?<\/a>[\s\S]*?<\/li>/g
    let m
    while ((m = re.exec(html)) !== null) {
      const [, imgUrl, name] = m
      if (!imgUrl || !name) continue
      const absImg = toAbsolute(imgUrl, listUrl)
      if (!absImg) continue
      // ロゴなど偽陽性を除外（画像URLにtalents/を含むもの、またはuploads/を含むもののみ）
      if (!/wp-content\/uploads/.test(absImg)) continue
      result.set(key(name), absImg)
    }
    return result
  },

  titan: (html, listUrl) => {
    const result = new Map()
    // <li> 各エントリ: <a href="https://www.titan-net.co.jp/talent/<slug>/"> + 画像
    const re =
      /<li[\s\S]*?<a href="([^"]+)">[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<\/li>/g
    let m
    while ((m = re.exec(html)) !== null) {
      const [, detailUrl, imgUrl] = m
      if (!detailUrl || !imgUrl) continue
      const absDetail = toAbsolute(detailUrl, listUrl)
      const absImg = toAbsolute(imgUrl, listUrl)
      if (!absImg) continue
      // ロゴやボタンなど偽陽性を除外
      if (!/wp-content\/uploads/.test(absImg)) continue
      result.set(absDetail, absImg)
    }
    return result
  },
}

const DETAIL_AGENCIES = Object.keys(detailExtractors)
const LIST_AGENCIES = Object.keys(listExtractors)
const SUPPORTED = [...DETAIL_AGENCIES, ...LIST_AGENCIES]

const saveTalents = (data) =>
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

const main = async () => {
  const all = process.argv.includes("--all")
  const targets = process.argv.slice(2).filter((a) => !a.startsWith("--"))
  const agency = targets.length ? targets[0] : null
  if (!agency && !all) {
    console.log(
      "使い方: node scripts/collect-agency-photos.mjs <事務所id>  (例: ohtapro)"
    )
    console.log("       node scripts/collect-agency-photos.mjs --all")
    console.log("対応:", SUPPORTED.join(", "))
    return
  }
  if (agency && !SUPPORTED.includes(agency)) {
    console.log(`未対応の事務所です: ${agency}`)
    console.log("対応:", SUPPORTED.join(", "))
    return
  }
  const agenciesToRun = all ? SUPPORTED : [agency]

  const raw = JSON.parse(readFileSync(OUT, "utf8"))
  const data = [...raw.talents]

  for (const ag of agenciesToRun) {
    const todo = data.filter((t) => !t.photo && t.agency === ag)
    if (todo.length === 0) {
      console.log(`${ag}: 取得対象なし（全件画像ありまたは未登録）`)
      continue
    }

    if (LIST_AGENCIES.includes(ag)) {
      // 一覧ページを1回取得して全タレントの画像を一括マッチ
      const listUrl =
        ag === "shochiku"
          ? "https://www.shochikugeino.co.jp/talents/03/"
          : "https://www.titan-net.co.jp/talent/"
      console.log(`===== ${ag}: 一覧ページ取得 ${listUrl} =====`)
      const html = await get(listUrl)
      if (!html) {
        console.log(`${ag}: 一覧ページの取得に失敗しました`)
        continue
      }
      const photoMap = listExtractors[ag](html, listUrl)
      console.log(`一覧から ${photoMap.size} 件の画像を検出`)

      let n = 0
      let found = 0
      for (const t of todo) {
        if (ag === "shochiku") {
          // 名前で照合（agencies.jsonのURLは数字ID/スラッグ混在のため）
          t.photo = photoMap.get(key(t.name))
        } else {
          // titan: 詳細URLで照合
          t.photo = photoMap.get(t.url)
        }
        n++
        if (t.photo) {
          found++
          console.log(`  ✓ ${t.name} -> ${t.photo}`)
        } else {
          console.log(`  - ${t.name} （画像なし）`)
        }
        if (n % 25 === 0) {
          saveTalents(data)
          console.log(`[${n}/${todo.length}] 取得済 ${found}件`)
        }
        await sleep(WAIT_MS)
      }
      saveTalents(data)
      console.log(`${ag} 完了: ${n}件処理 / 新規取得 ${found}件`)
    } else {
      // 詳細ページを1タレントずつ取得
      const extract = detailExtractors[ag]
      console.log(`===== ${ag}: 対象 ${todo.length}件 =====`)

      let n = 0
      let found = 0
      saveTalents(data)
      for (const t of todo) {
        const html = await get(t.url)
        let photo = null
        if (html) photo = extract(html, t.url)
        t.photo = photo
        n++
        if (photo) {
          found++
          console.log(`  ✓ ${t.name} -> ${photo}`)
        } else {
          console.log(`  - ${t.name} （画像なし）`)
        }
        if (n % 25 === 0) {
          saveTalents(data)
          console.log(`[${n}/${todo.length}] 取得済 ${found}件`)
        }
        await sleep(WAIT_MS)
      }
      saveTalents(data)
      console.log(`${ag} 完了: ${n}件処理 / 新規取得 ${found}件`)
    }
  }

  console.log("すべて完了")
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
