import Link from "next/link"
import { FC } from "react"
import { COMPETITIONS, type Ranking } from "@/app/ranking/shared"
import { Photo } from "@/components/photo"

export const css = `
.rk { list-style: none; padding: 0; margin: .75rem 0; display: grid; gap: .25rem; }
.rk li { display: grid; grid-template-columns: 2.5rem auto 1fr auto; gap: .5rem; align-items: center; padding: .35rem .25rem; border-bottom: 1px solid var(--line); }
.rk .rk-n { text-align: right; font-weight: bold; }
.rk .rk-body { min-width: 0; overflow-wrap: anywhere; }
.rk .rk-body small { display: block; color: var(--muted); font-size: .75rem; }
.rk .rk-v { white-space: nowrap; }
`

// 順位表。同順位は同じ数字で出す
export const RankTable: FC<{ ranking: Ranking; limit: number }> = ({
  ranking,
  limit,
}) => (
  <ol className="rk">
    {ranking.rows.slice(0, limit).map((r) => (
      <li key={r.id}>
        <span className="num rk-n">{r.rank}</span>
        <Photo src={r.photo} size={40} />
        <span className="rk-body">
          <Link href={ranking.href(r)} style={{ fontWeight: "bold" }}>
            {r.name}
          </Link>
          <small>{r.detail}</small>
        </span>
        <span className="rk-v">
          <b className="num">{r.value}</b>
          {ranking.unit}
        </span>
      </li>
    ))}
  </ol>
)

// 集計条件。どのランキングにも同じものを出す
export const Conditions = () => (
  <details className="pf-small" style={{ margin: ".5rem 0" }}>
    <summary>集計の条件</summary>
    <ul>
      <li>
        対象は当サイトに登録されている賞レースの決勝結果です（
        {COMPETITIONS.map((c, i) => (
          <span key={c.slug}>
            {i > 0 && "、"}
            <Link href={`/races/${c.slug}/`}>{c.name}</Link> {c.from}〜{c.to}年
          </span>
        ))}
        ）。予選・準決勝の結果は含みません。
      </li>
      <li>
        同じ値は同順位とし、次の順位は同順位の数だけ繰り下げます（1位・2位・2位・4位）。同順位の中は名前順です。
      </li>
      <li>決勝結果の登録が増えると、次の更新で集計し直します。</li>
    </ul>
  </details>
)
