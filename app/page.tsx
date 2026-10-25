import Link from "next/link"
import { FC } from "react"
import { SearchBox } from "@/components/search-box"
import { WeeklyPick, type Pick } from "@/components/weekly-pick"
import { db as manual } from "@/data/db"
import { db, edgeIndex, graph, personById } from "@/lib/db"
import {
  EDGE_KINDS,
  graphHref,
  linksOf,
  nodeHref,
  raceId,
  type GEdge,
} from "@/lib/graph"

// トップの特集はすべて登録データから組み立てる。該当データがなければ節ごと出さない

const name = (nodeId: string) => graph.nodes.get(nodeId)?.label ?? nodeId
const thisYear = new Date().getFullYear()

// ヒーローの相関図: 同期・賞レース以外の関係がいちばん多い人物を中心に据える
// （導出される同期・賞レースを含めると大会名ばかりの図になる）
const heroLinks = (id: string) =>
  linksOf(edgeIndex, id).filter(
    (l) => !["doki", "competition", "tv"].includes(l.edge.kind)
  )
const heroId = manual.people
  .map((p) => `p:${p.id}`)
  .toSorted((a, b) => heroLinks(b).length - heroLinks(a).length)[0]
const hero = heroLinks(heroId).slice(0, 8)

// 関係性発見: 説明文つきで登録された関係
const picks: Pick[] = db.relationships.map((r) => ({
  title: `${personById.get(r.source_person_id)?.name} × ${personById.get(r.target_person_id)?.name}`,
  kind: EDGE_KINDS[r.relationship_type].label,
  description: r.description,
  unverified: !r.last_verified_at,
  href: graphHref(`p:${r.source_person_id}`, `&sel=p:${r.target_person_id}`),
  detail: nodeHref(`p:${r.source_person_id}`),
}))

const manualIds = new Set(manual.people.map((p) => `p:${p.id}`))

// 師弟系譜: 師匠→弟子をたどれるいちばん長い連なり
const pupils = Map.groupBy(
  db.relationships.filter((r) => r.relationship_type === "master"),
  (r) => r.source_person_id
)
const longest = (id: string, seen = new Set<string>()): string[] => {
  seen.add(id)
  const next = (pupils.get(id) ?? [])
    .filter((r) => !seen.has(r.target_person_id))
    .map((r) => longest(r.target_person_id, new Set(seen)))
    .toSorted((a, b) => b.length - a.length)[0]
  return [id, ...(next ?? [])]
}
const lineage = [...pupils.keys()]
  .map((id) => longest(id))
  .toSorted((a, b) => b.length - a.length)[0]
// 手入力データの関係を優先して先頭に出す
const masterPairs = db.relationships
  .filter((r) => r.relationship_type === "master")
  .toSorted(
    (a, b) =>
      Number(manualIds.has(`p:${b.source_person_id}`)) -
      Number(manualIds.has(`p:${a.source_person_id}`))
  )

// 同期: 登録人数の多い養成所の期
const terms = [...graph.nodes.values()]
  .filter((n) => n.kind === "term" && n.label.endsWith("期"))
  .map((n) => {
    const members = linksOf(edgeIndex, n.id)
      .filter((l) => l.label === "同期生")
      .map((l) => l.other)
    return {
      id: n.id,
      label: n.label,
      count: members.length,
      notable: members.filter((m) => manualIds.has(m)).map(name),
    }
  })
  .toSorted((a, b) => b.count - a.count || b.notable.length - a.notable.length)
  .slice(0, 5)

// コンビ変遷: 結成年が分かるグループを年表に
const combis = manual.groups
  .filter((g) => g.formation_date)
  .map((g) => {
    const from = Number(g.formation_date!.slice(0, 4))
    const to = g.dissolution_date
      ? Number(g.dissolution_date.slice(0, 4))
      : null
    const former = linksOf(edgeIndex, `g:${g.id}`).filter(
      (l) => l.edge.kind === "former_member"
    )
    return { id: g.id, name: g.name, from, to, former: former.length }
  })
  .toSorted((a, b) => a.from - b.from)
// 元メンバーがいちばん多いコンビ（入口リンク用）
const changed = combis
  .filter((c) => c.former > 0)
  .toSorted((a, b) => b.former - a.former)[0]
const minYear = Math.min(...combis.map((c) => c.from))
const span = thisYear - minYear

// 賞レース: 決勝の顔ぶれを新しい大会から
const races = [
  ...Map.groupBy(
    db.competitionResults.filter((r) => r.stage === "決勝"),
    (r) => `${r.competition_name} ${r.year}`
  ),
]
  .map(([title, rs]) => ({
    title,
    name: rs[0].competition_name,
    year: rs[0].year,
    rs: rs.toSorted((a, b) => (a.rank ?? 99) - (b.rank ?? 99)),
  }))
  // 大会ごとの最新回を新しい順に
  .toSorted((a, b) => b.year - a.year)
  .filter((r, i, all) => all.findIndex((x) => x.name === r.name) === i)
  .slice(0, 3)

const counts = [
  { label: "芸人", value: db.people.length, unit: "人" },
  { label: "コンビ・グループ", value: db.groups.length, unit: "組" },
  { label: "師弟・共演などの関係", value: db.relationships.length, unit: "件" },
  {
    label: "グラフ上のつながり",
    value: graph.edges.length,
    unit: "本",
  },
  { label: "賞レース結果", value: db.competitionResults.length, unit: "件" },
]

const css = `
.top { max-width: 1120px; margin: 0 auto; display: grid; gap: 4rem; padding: 1rem 0 2rem; }
.hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 2.5rem; align-items: center; }
.hero-copy { display: grid; gap: 1.2rem; }
.hero h2 { font-size: clamp(2.1rem, 5.4vw, 3.8rem); line-height: 1.2; letter-spacing: 0; }
.hero h2 em { font-family: inherit; font-style: normal; color: var(--pop); white-space: nowrap; }
.hero-lead { color: var(--muted); font-size: .95rem; max-width: 34em; }
.entries { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.entries-label { width: 100%; font-size: .75rem; font-weight: 800; color: var(--muted); }
.more { font-size: .85rem; margin-left: auto; }
.stage { position: relative; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, #fff 0 40%, var(--paper) 72%); border: 1px solid var(--line); box-shadow: 0 0 0 10px var(--surface), 0 0 0 11px var(--line); overflow: hidden; display: block; text-decoration: none; margin: 12px; }
.stage:hover { box-shadow: 0 0 0 10px var(--surface), 0 0 0 12px var(--pop); }
.stage svg { width: 100%; height: 100%; display: block; }
.stage-cap { position: absolute; left: 50%; bottom: 7%; transform: translateX(-50%); }
.sec { display: grid; gap: 1.1rem; }
.sec-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: .3rem 1rem; }
.sec-head h2 { font-size: clamp(1.4rem, 3.4vw, 2rem); }
.sec-head p { color: var(--muted); font-size: .85rem; }
.kicker { width: 100%; font-weight: 800; color: var(--accent); font-size: .8rem; letter-spacing: .12em; }
.weekly { display: grid; gap: .8rem; padding: 1.75rem 2rem; background: var(--surface); border: 1px solid var(--line); border-left: 6px solid var(--accent); border-radius: var(--radius); }
.weekly-title { font-family: var(--display); font-weight: 400; font-size: clamp(1.4rem, 4vw, 2.2rem); line-height: 1.3; }
.weekly-desc { font-size: .95rem; max-width: 46em; }
.lineage { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.lineage a { text-decoration: none; display: grid; justify-items: center; min-width: 7rem; padding: .7rem 1.1rem; border: 1px solid var(--line); background: var(--surface); border-radius: var(--radius); }
.lineage a:hover { border-color: var(--pop); }
.lineage a:first-child { background: var(--accent); border-color: var(--accent); color: #fff; }
.lineage small { font-size: .7rem; font-weight: 800; color: inherit; opacity: .85; }
.lineage b { font-size: 1.15rem; }
.arrow { font-family: var(--display); font-size: 1.4rem; color: var(--accent); }
.pairs { display: flex; flex-wrap: wrap; gap: .4rem; }
.two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2.5rem; }
.rank { list-style: none; padding: 0; display: grid; gap: .5rem; }
.rank li { display: grid; grid-template-columns: 3rem 1fr auto; gap: .2rem .9rem; align-items: center; padding: .8rem 1rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); }
.rank .num { font-size: 2rem; color: var(--muted); }
.rank li:first-child .num { color: var(--pop); }
.rank a { text-decoration: none; font-size: 1.05rem; }
.rank small { grid-column: 2 / -1; color: var(--muted); font-size: .78rem; font-weight: 400; }
.rank .count { font-family: var(--display); font-size: 1.5rem; color: var(--pop); }
.timeline { display: grid; gap: .35rem; padding: 1rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); }
.tl-legend { display: flex; gap: 1rem; font-size: .72rem; color: var(--muted); margin-bottom: .4rem; }
.tl-legend i { display: inline-block; width: 1.4rem; height: .6rem; border-radius: 999px; margin-right: .3rem; vertical-align: middle; }
.tl-row { display: grid; grid-template-columns: 8.5rem 1fr 9.5rem; grid-template-areas: "name track meta"; align-items: center; gap: .6rem; font-size: .82rem; }
.tl-row > a { grid-area: name; }
.tl-track { grid-area: track; }
.tl-meta { grid-area: meta; white-space: nowrap; font-size: .7rem; font-weight: 800; color: var(--muted); }
.tl-row a { text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-track { position: relative; height: 1.4rem; }
.tl-bar, .tl-legend i { background: var(--pop); }
.tl-bar { position: absolute; top: .25rem; bottom: .25rem; border-radius: 999px; }
.tl-bar[data-ended], .tl-legend i[data-ended] { background: repeating-linear-gradient(45deg, #8a857c 0 4px, #5a5650 4px 8px); }
.tl-axis { display: flex; justify-content: space-between; margin: 0 10.1rem 0 9.1rem; font-size: .7rem; color: var(--muted); font-weight: 800; }
.races { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
.race { border: 1px solid var(--line); background: var(--surface); border-radius: var(--radius); overflow: hidden; }
.race h3 { font-size: 1.05rem; padding: .6rem 1rem; background: var(--surface-2); color: var(--pop); display: flex; justify-content: space-between; }
.race ol { list-style: none; padding: .5rem 1rem .9rem; }
.race li { display: flex; align-items: baseline; gap: .7rem; padding: .25rem 0; }
.race .num { font-size: 1.5rem; min-width: 2.2rem; text-align: right; color: var(--muted); }
.race li:first-child .num { color: var(--pop); }
.race a { text-decoration: none; }
.race h3 a { color: inherit; }
.counts { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .75rem; }
.counts div { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 1rem 1.1rem; display: grid; gap: .3rem; }
.counts .num { font-size: clamp(1.8rem, 4.5vw, 2.6rem); color: var(--pop); }
.note { font-size: .8rem; color: var(--muted); }
@media (max-width: 860px) {
  .top { gap: 3rem; }
  .hero, .two { grid-template-columns: 1fr; }
  .stage { max-width: 400px; width: calc(100% - 24px); margin: 12px auto; }
}
@media (max-width: 600px) {
  /* 年表は1組ずつ縦に積み、名前と年を上段、帯を下段に */
  .tl-row { grid-template-columns: 1fr auto; grid-template-areas: "name meta" "track track"; gap: 0 .6rem; padding: .3rem 0; border-bottom: 1px solid var(--line); }
  .tl-axis { margin: 0; }
  .lineage { flex-direction: column; align-items: stretch; }
  .lineage .arrow { align-self: center; transform: rotate(90deg); line-height: 1; }
  .weekly { padding: 1.25rem; }
}
`

// ヒーローの相関図。中心から放射状に関係のある芸人を並べた静的SVG
const HeroGraph: FC = () => {
  const c = 200
  const r = 135
  const nodes = hero.map((l, i) => {
    const a = (i / hero.length) * Math.PI * 2 - Math.PI / 2
    return { ...l, x: c + r * Math.cos(a), y: c + r * Math.sin(a) }
  })
  const line = (e: GEdge) => EDGE_KINDS[e.kind]
  return (
    <Link
      href={graphHref(heroId)}
      className="stage"
      aria-label={`${name(heroId)}を中心に関係性グラフを開く`}
    >
      <svg viewBox="0 0 400 400" role="img" aria-hidden="true">
        {nodes.map((n) => (
          <line
            key={n.edge.id}
            x1={c}
            y1={c}
            x2={n.x}
            y2={n.y}
            stroke={line(n.edge).color}
            strokeWidth={line(n.edge).width + 1}
            strokeDasharray={line(n.edge).dash?.join(" ")}
          />
        ))}
        {nodes.map((n) => {
          const w = Math.max(n.label.length, name(n.other).length) * 13 + 24
          return (
            <g key={n.other} transform={`translate(${n.x} ${n.y})`}>
              <rect
                x={-w / 2}
                y={-20}
                width={w}
                height={40}
                rx={n.other.startsWith("g:") ? 8 : 20}
                fill={n.other.startsWith("g:") ? "#ffd54a" : "#fff"}
                stroke="#1f1d1a"
                strokeWidth={2.5}
              />
              <text
                y={-4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="800"
                fill={
                  line(n.edge).color === "#1f1d1a"
                    ? "#5f5a52"
                    : line(n.edge).color
                }
              >
                {n.label}
              </text>
              <text
                y={12}
                textAnchor="middle"
                fontSize="13"
                fontWeight="800"
                fill="#1f1d1a"
              >
                {name(n.other)}
              </text>
            </g>
          )
        })}
        <circle
          cx={c}
          cy={c}
          r={52}
          fill="#e8483f"
          stroke="#1f1d1a"
          strokeWidth={4}
        />
        <text
          x={c}
          y={c + 6}
          textAnchor="middle"
          fontSize="17"
          fontWeight="800"
          fill="#fff"
        >
          {name(heroId)}
        </text>
      </svg>
      <span className="sticker stage-cap" data-tone="plain">
        タップして相関図を開く
      </span>
    </Link>
  )
}

const SecHead: FC<{
  kicker: string
  title: string
  lead?: string
  more?: [string, string]
}> = ({ kicker, title, lead, more }) => (
  <div className="sec-head">
    <span className="kicker">{kicker}</span>
    <h2>{title}</h2>
    {lead && <p>{lead}</p>}
    {more && (
      <Link className="more" href={more[1]}>
        {more[0]} →
      </Link>
    )}
  </div>
)

export const metadata = { alternates: { canonical: "/" } }

const Page: FC = () => (
  <div className="top">
    <style>{css}</style>

    <section className="hero">
      <div className="hero-copy">
        <span className="kicker">芸人同士のつながりをたどる</span>
        <h2>
          その芸人、
          <br />
          あの芸人と
          <br />
          <em>どうつながってる？</em>
        </h2>
        <p className="hero-lead">
          師匠と弟子、養成所の同期、コンビの結成と解散、賞レースで競ったライバル。芸人から芸人へ、お笑い界のつながりをたどって探索できます。
        </p>
        <SearchBox />
        <nav className="entries" aria-label="探し方">
          <span className="entries-label">関係からたどる</span>
          {lineage && (
            <Link
              className="chip"
              href={graphHref(`p:${lineage[0]}`, "&mode=lineage")}
            >
              意外な師弟関係
            </Link>
          )}
          <Link className="chip" href="/doki/">
            同期芸人
          </Link>
          {changed && (
            <Link
              className="chip"
              href={graphHref(`g:${changed.id}`, "&mode=combi")}
            >
              コンビの変遷
            </Link>
          )}
          <Link className="chip" href="/races/">
            賞レースのライバル
          </Link>
        </nav>
        <p>
          <Link className="cta" href="/graph/">
            関係性グラフを開く →
          </Link>
        </p>
      </div>
      {hero.length > 0 && <HeroGraph />}
    </section>

    {picks.length > 0 && (
      <section className="sec">
        <SecHead
          kicker="PICK UP"
          title="今週の関係性発見"
          lead="登録された関係から毎週ひとつ紹介"
        />
        <WeeklyPick picks={picks} />
      </section>
    )}

    {lineage && lineage.length > 1 && (
      <section className="sec">
        <SecHead
          kicker="系譜"
          title="芸人の系譜をたどる"
          lead={`師匠から弟子へ、${lineage.length}代にわたるつながり`}
          more={[
            "師弟系譜をグラフで見る",
            graphHref(`p:${lineage[0]}`, "&mode=lineage"),
          ]}
        />
        <div className="lineage">
          {lineage.map((id, i) => (
            <span key={id} style={{ display: "contents" }}>
              {i > 0 && (
                <span className="arrow" aria-label="から弟子へ">
                  →
                </span>
              )}
              <Link href={nodeHref(`p:${id}`)}>
                <small>{i === 0 ? "師匠" : `${i}代目の弟子`}</small>
                <b>{personById.get(id)?.name}</b>
              </Link>
            </span>
          ))}
        </div>
        <div>
          <h3 style={{ fontSize: "1rem", marginBottom: ".5rem" }}>
            師匠と弟子の関係
          </h3>
          <div className="pairs">
            {masterPairs.slice(0, 15).map((r) => (
              <Link
                key={r.id}
                className="chip"
                href={graphHref(
                  `p:${r.source_person_id}`,
                  `&mode=lineage&sel=p:${r.target_person_id}`
                )}
              >
                {personById.get(r.source_person_id)?.name}
                <span style={{ color: "var(--accent)" }}>▶</span>
                {personById.get(r.target_person_id)?.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    )}

    <div className="two">
      {terms.length > 0 && (
        <section className="sec">
          <SecHead
            kicker="同期"
            title="同期芸人をまとめて見る"
            lead="登録の多い養成所の期"
            more={["同期一覧", "/doki/"]}
          />
          <ol className="rank">
            {terms.map((t, i) => (
              <li key={t.id}>
                <span className="num">{i + 1}</span>
                <Link href={graphHref(t.id, "&mode=doki")}>{t.label}</Link>
                <span className="count">
                  {t.count.toLocaleString()}
                  <span style={{ fontSize: ".75rem" }}>人</span>
                </span>
                {t.notable.length > 0 && (
                  <small>{t.notable.slice(0, 4).join("・")} ほか</small>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {combis.length > 0 && (
        <section className="sec">
          <SecHead
            kicker="変遷"
            title="コンビの結成・解散"
            lead="結成年の分かるコンビの年表"
            more={["芸人・コンビ一覧", "/list/"]}
          />
          <div className="timeline">
            <div className="tl-legend" aria-hidden="true">
              <span>
                <i />
                活動中
              </span>
              <span>
                <i data-ended="" />
                解散
              </span>
            </div>
            {combis.map((g) => (
              <div className="tl-row" key={g.id}>
                <Link href={nodeHref(`g:${g.id}`)}>{g.name}</Link>
                <div className="tl-track">
                  <div
                    className="tl-bar"
                    data-ended={g.to ? "" : undefined}
                    style={{
                      left: `${((g.from - minYear) / span) * 100}%`,
                      width: `${Math.max((((g.to ?? thisYear) - g.from) / span) * 100, 2)}%`,
                    }}
                  />
                </div>
                <span className="tl-meta">
                  {g.from}
                  {g.to ? `–${g.to} 解散` : "– 活動中"}
                  {g.former > 0 && ` / 元メンバー${g.former}`}
                </span>
              </div>
            ))}
            <div className="tl-axis">
              <span>{minYear}</span>
              <span>{thisYear}</span>
            </div>
          </div>
        </section>
      )}
    </div>

    {races.length > 0 && (
      <section className="sec">
        <SecHead
          kicker="賞レース"
          title="賞レースから見るライバル関係"
          lead="同じ年の決勝を戦った芸人同士"
          more={["賞レース一覧", "/races/"]}
        />
        <div className="races">
          {races.map((race) => (
            <article className="race" key={race.title}>
              <h3>
                <Link href={nodeHref(raceId(race.name, race.year))}>
                  {race.name}
                </Link>
                <span>{race.year}</span>
              </h3>
              <ol>
                {race.rs.map((r) => (
                  <li key={r.id}>
                    <span className="num">{r.rank ?? "-"}</span>
                    <Link href={graphHref(r.entrant_id, "&mode=race")}>
                      {graph.nodes.get(r.entrant_id)?.label}
                    </Link>
                    {r.rank === 1 && (
                      <span className="sticker" data-tone="red">
                        優勝
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>
    )}

    <section className="sec">
      <SecHead kicker="DATA" title="登録データ" />
      <div className="counts">
        {counts.map((c) => (
          <div key={c.label}>
            <span
              style={{
                fontSize: ".8rem",
                fontWeight: 800,
                color: "var(--muted)",
              }}
            >
              {c.label}
            </span>
            <span>
              <span className="num">{c.value.toLocaleString()}</span> {c.unit}
            </span>
          </div>
        ))}
      </div>
      <p className="note">
        掲載情報は公開情報の要約です。出典を照合できていない項目には「出典未照合」と表示しています。
      </p>
      <p>
        <Link className="chip" href="/list/">
          五十音の一覧で見る →
        </Link>
      </p>
    </section>
  </div>
)

export default Page
