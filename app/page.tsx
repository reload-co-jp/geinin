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
    (l) => l.edge.kind !== "doki" && l.edge.kind !== "competition"
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
.top { max-width: 1120px; margin: 0 auto; display: grid; gap: 3.5rem; padding: .5rem 0 2rem; }
.hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 2rem; align-items: center; }
.hero-copy { display: grid; gap: 1.1rem; }
.hero h2 { background: none; font-size: clamp(2.1rem, 5.4vw, 3.8rem); line-height: 1.15; letter-spacing: 0; }
.hero h2 em { font-family: inherit; font-style: normal; color: var(--accent); position: relative; white-space: nowrap; }
.hero h2 em::after { content: ""; position: absolute; left: -4%; right: -4%; bottom: .02em; height: .28em; background: var(--pop); z-index: -1; transform: rotate(-1.5deg); }
.hero-lead { color: var(--muted); font-size: .95rem; max-width: 34em; }
.entries { display: flex; flex-wrap: wrap; gap: .5rem; }
.entries a:nth-child(1) { background: var(--accent); color: #fff; }
.entries a:nth-child(2) { background: var(--blue); color: #fff; }
.entries a:nth-child(3) { background: var(--pop); }
.entries a:nth-child(4) { background: var(--text); color: var(--pop); }
.more { font-size: .85rem; margin-left: auto; }
.stage { position: relative; aspect-ratio: 1; border: 3px solid var(--text); border-radius: 50%; background: repeating-conic-gradient(from 0deg, #ffcf2455 0 6deg, transparent 6deg 15deg), radial-gradient(circle, #fff 0 35%, var(--bg) 70%); box-shadow: 8px 8px 0 var(--text); overflow: hidden; display: block; text-decoration: none; }
.stage:hover { background: repeating-conic-gradient(from 4deg, #ffcf2477 0 6deg, transparent 6deg 15deg), radial-gradient(circle, #fff 0 35%, var(--bg) 70%); }
.stage svg { width: 100%; height: 100%; display: block; }
.stage-cap { position: absolute; left: 50%; bottom: 7%; transform: translateX(-50%) rotate(-2deg); }
.sec { display: grid; gap: 1.1rem; }
.sec-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: .4rem 1rem; }
.sec-head h2 { font-size: clamp(1.4rem, 3.4vw, 2rem); }
.sec-head p { color: var(--muted); font-size: .85rem; }
.kicker { font-family: var(--display); color: var(--accent); font-size: .85rem; letter-spacing: .1em; }
.weekly { display: grid; gap: .6rem; padding: 1.5rem 1.75rem; text-decoration: none; background: var(--surface); border: 3px solid var(--text); box-shadow: 6px 6px 0 var(--accent); position: relative; }
.weekly:hover { background: var(--surface); transform: translate(-2px, -2px); box-shadow: 8px 8px 0 var(--accent); }
.weekly::before { content: ""; position: absolute; top: -12px; left: 50%; width: 110px; height: 24px; background: #ffcf24cc; transform: translateX(-50%) rotate(-3deg); }
.weekly .sticker { justify-self: start; }
.weekly-title { font-family: var(--display); font-weight: 400; font-size: clamp(1.4rem, 4vw, 2.2rem); line-height: 1.25; }
.weekly-desc { font-weight: 400; font-size: .95rem; }
.weekly-go { color: var(--accent); font-size: .85rem; }
.lineage { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.lineage a { text-decoration: none; display: grid; justify-items: center; padding: .7rem 1.1rem; border: 3px solid var(--text); background: var(--surface); border-radius: 18px; box-shadow: 4px 4px 0 var(--text); }
.lineage a:first-child { background: var(--accent); color: #fff; }
.lineage small { font-size: .65rem; font-weight: 800; color: inherit; opacity: .8; }
.lineage b { font-size: 1.15rem; }
.arrow { font-family: var(--display); font-size: 1.6rem; color: var(--accent); }
.pairs { display: flex; flex-wrap: wrap; gap: .4rem; }
.two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2.5rem; }
.rank { list-style: none; padding: 0; display: grid; border-top: 3px solid var(--text); }
.rank li { display: grid; grid-template-columns: 3.2rem 1fr auto; gap: .2rem .9rem; align-items: center; padding: .7rem 0; border-bottom: 2px dashed #1f1d1a44; }
.rank .num { font-size: 2.4rem; color: var(--blue); }
.rank li:first-child .num { color: var(--accent); }
.rank a { text-decoration: none; font-size: 1.05rem; }
.rank small { grid-column: 2 / -1; color: var(--muted); font-size: .78rem; font-weight: 400; }
.rank .count { font-family: var(--display); font-size: 1.3rem; }
.timeline { display: grid; gap: .35rem; padding: 1rem; background: var(--surface); border: 3px solid var(--text); box-shadow: 6px 6px 0 var(--blue); }
.tl-row { display: grid; grid-template-columns: 8.5rem 1fr; align-items: center; gap: .6rem; font-size: .82rem; }
.tl-row a { text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-track { position: relative; height: 1.4rem; }
.tl-bar { position: absolute; top: .2rem; bottom: .2rem; border: 2px solid var(--text); background: var(--pop); border-radius: 999px; }
.tl-bar[data-ended] { background: repeating-linear-gradient(45deg, #fff 0 4px, #e7e0d0 4px 8px); }
.tl-bar span { position: absolute; left: calc(100% + .35rem); top: 50%; transform: translateY(-50%); white-space: nowrap; font-size: .7rem; font-weight: 800; }
.tl-axis { display: flex; justify-content: space-between; margin-left: 9.1rem; font-size: .7rem; color: var(--muted); font-weight: 800; }
.races { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.2rem; }
.race { border: 3px solid var(--text); background: var(--surface); box-shadow: 5px 5px 0 var(--text); }
.race h3 { font-size: 1.05rem; padding: .5rem .9rem; background: var(--text); color: var(--pop); display: flex; justify-content: space-between; }
.race ol { list-style: none; padding: .4rem .9rem .8rem; }
.race li { display: flex; align-items: baseline; gap: .7rem; padding: .25rem 0; }
.race .num { font-size: 1.7rem; min-width: 2.2rem; text-align: right; }
.race li:first-child .num { color: var(--accent); }
.race a { text-decoration: none; }
.race h3 a { color: inherit; }
.counts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); border: 3px solid var(--text); background: var(--text); gap: 3px; }
.counts div { background: var(--pop); padding: 1rem; display: grid; gap: .2rem; }
.counts div:nth-child(2n) { background: var(--surface); }
.counts .num { font-size: clamp(1.8rem, 4.5vw, 3rem); }
@media (max-width: 860px) {
  .top { gap: 2.5rem; }
  .hero, .two { grid-template-columns: 1fr; }
  .stage { max-width: 420px; width: 100%; margin: 0 auto; }
  .tl-row { grid-template-columns: 6rem 1fr; }
  .tl-axis { margin-left: 6.6rem; }
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
                fill={n.other.startsWith("g:") ? "#ffcf24" : "#fff"}
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
          fill="#d9342b"
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
        <span
          className="sticker"
          data-tone="red"
          style={{ width: "fit-content" }}
        >
          芸人同士のつながりをたどる
        </span>
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
          <Link className="chip" href="/graph/">
            相関図を自由に見る
          </Link>
        </nav>
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
              <Link href={graphHref(`p:${id}`, "&mode=lineage")}>
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
            {combis.map((g) => (
              <div className="tl-row" key={g.id}>
                <Link href={graphHref(`g:${g.id}`, "&mode=combi")}>
                  {g.name}
                </Link>
                <div className="tl-track">
                  <div
                    className="tl-bar"
                    data-ended={g.to ? "" : undefined}
                    style={{
                      left: `${((g.from - minYear) / span) * 85}%`,
                      width: `${Math.max((((g.to ?? thisYear) - g.from) / span) * 85, 2)}%`,
                    }}
                  >
                    <span>
                      {g.from}
                      {g.to ? `–${g.to} 解散` : "–"}
                      {g.former > 0 && ` / 元メンバー${g.former}`}
                    </span>
                  </div>
                </div>
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
            <span style={{ fontSize: ".8rem", fontWeight: 800 }}>
              {c.label}
            </span>
            <span>
              <span className="num">{c.value.toLocaleString()}</span> {c.unit}
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: ".85rem" }}>
        <Link href="/list/">五十音の一覧で見る →</Link>
      </p>
    </section>
  </div>
)

export default Page
