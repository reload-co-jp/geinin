"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FC } from "react"
import { useGraphData } from "@/components/graph/use-data"
import { KIND_TAG, TYPES } from "@/components/search-box"
import { graphHref, hasPage, linksOf, nodeHref, searchNodes } from "@/lib/graph"

// 一度に描画する件数。「NSC」など広い語で数千件になるため
const LIMIT = 200

const css = `
.sr { max-width: 820px; }
.sr form { display: flex; border: 1px solid var(--line); border-radius: 2px; background: var(--surface); overflow: hidden; }
.sr form:focus-within { border-color: var(--pop); box-shadow: 0 0 0 2px var(--pop); }
.sr input { flex: 1; min-width: 0; border: 0; padding: .7rem 1.1rem; font-size: 1.05rem; background: transparent; }
.sr input:focus-visible { outline: none; }
.sr form > button { border: 0; border-radius: 0; background: var(--accent); color: #fff; padding: 0 1.3rem; }
.sr-types { display: flex; flex-wrap: wrap; gap: .35rem; }
.sr-types a[aria-current="page"] { background: var(--pop); border-color: var(--pop); color: var(--ink); }
.sr-types small { font-weight: 400; opacity: .8; }
.sr-list { list-style: none; padding: 0; display: grid; gap: .5rem; }
.sr-list li { display: flex; flex-wrap: wrap; gap: .3rem .6rem; align-items: center; padding: .7rem 1rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); }
.sr-list .sr-name { font-size: 1.05rem; }
.sr-list .sr-sub { font-size: .78rem; color: var(--muted); }
.sr-acts { margin-left: auto; display: flex; gap: .3rem; }
.sr-acts .chip { min-height: 2.25rem; font-size: .78rem; }
.sr-status { color: var(--muted); font-size: .9rem; }
`

export const SearchResults: FC = () => {
  const params = useSearchParams()
  const q = params.get("q") ?? ""
  const type = params.get("type") ?? ""
  const data = useGraphData()
  const all = data ? searchNodes(data.graph, q) : []
  const hits = all.filter((id) => id.startsWith(type))
  const name = (id: string) => data?.graph.nodes.get(id)?.label ?? id
  const href = (t: string) =>
    `/search/?q=${encodeURIComponent(q)}${t && `&type=${t}`}`
  return (
    <div className="page sr">
      <style>{css}</style>
      <h1 className="page-title">検索</h1>
      {/* key で URL 変更時に入力値をリセット */}
      <form action="/search/" role="search" key={q}>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="芸人名・コンビ名・事務所（例: 有吉、NSC大阪1期）"
          aria-label="芸人・コンビを検索"
        />
        {type && <input type="hidden" name="type" value={type} />}
        <button>検索</button>
      </form>
      {!q ? (
        <p className="sr-status">
          芸人名・コンビ名・養成所の期・賞レース名で探せます。
          <Link href="/list/">五十音の一覧</Link>からも探せます。
        </p>
      ) : !data ? (
        <p className="sr-status" role="status">
          読み込み中…
        </p>
      ) : (
        <>
          <nav className="sr-types" aria-label="検索対象">
            {TYPES.map((t) => {
              const n = all.filter((id) => id.startsWith(t.id)).length
              return (
                <Link
                  key={t.id}
                  className="chip"
                  href={href(t.id.slice(0, 1))}
                  aria-current={type === t.id.slice(0, 1) ? "page" : undefined}
                >
                  {t.label} <small>{n.toLocaleString()}</small>
                </Link>
              )
            })}
          </nav>
          <p className="sr-status" role="status">
            「{q}」{type && `（${KIND_TAG[type]}）`}の検索結果{" "}
            {hits.length.toLocaleString()}件
            {hits.length > LIMIT && `（上位${LIMIT}件を表示）`}
          </p>
          {hits.length === 0 && (
            <p className="sr-status">
              見つかりませんでした。表記ゆれ（ひらがな・カタカナ、旧コンビ名）を変えて試すか、
              <Link href="/list/">五十音の一覧</Link>から探してください。
            </p>
          )}
        </>
      )}
      <ul className="sr-list">
        {hits.slice(0, LIMIT).map((id) => {
          const links = linksOf(data!.index, id)
          const groups = links
            .filter((l) => l.edge.kind === "member")
            .map((l) => name(l.other))
          return (
            <li key={id}>
              <span className="sticker" data-tone="plain">
                {KIND_TAG[id[0]]}
              </span>
              {hasPage(id) ? (
                <Link className="sr-name" href={nodeHref(id)}>
                  {name(id)}
                </Link>
              ) : (
                <strong className="sr-name">{name(id)}</strong>
              )}
              <span className="sr-sub">
                {id[0] === "x"
                  ? `決勝 ${links.length}組`
                  : groups.join("・") || `つながり ${links.length}件`}
              </span>
              <span className="sr-acts">
                {hasPage(id) ? (
                  <Link className="chip" href={nodeHref(id)}>
                    詳細
                  </Link>
                ) : (
                  <Link className="chip" href={graphHref(id)}>
                    相関図
                  </Link>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
