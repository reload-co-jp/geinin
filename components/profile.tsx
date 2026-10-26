import Link from "next/link"
import { FC, Fragment, ReactNode } from "react"
import { LineSample } from "@/components/graph/legend"
import { Photo } from "@/components/photo"
import { EDGE_KINDS, nodeHref, programId } from "@/lib/graph"
import {
  EVIDENCE_LABEL,
  verifyState,
  type LinkInfo,
  type NodeInfo,
} from "@/lib/node-info"

// 詳細パネル（クライアント）と詳細ページ（サーバー）で共用する。データ取得はせず NodeInfo を描くだけ

const CONFIDENCE_LABEL = { high: "確度高", medium: "確度中", low: "確度低" }
const KIND_NAME: Record<string, string> = {
  p: "芸人",
  g: "コンビ・グループ",
  t: "同期（養成所の期）",
  x: "賞レースの決勝",
  v: "テレビ番組",
}
const KIND_TONE: Record<string, string | undefined> = {
  p: "red",
  g: undefined,
  t: "blue",
  x: "plain",
  v: "blue",
}
// 関係が多い期ノードでもパネルが延々と伸びないように
const LINK_LIMIT = 60

const Stat: FC<{
  label: string
  value: ReactNode
  unit?: string
  tone?: string
}> = ({ label, value, unit, tone = "var(--surface)" }) => (
  <div
    className="pf-stat"
    // 明るい塗りのときは濃い文字にする
    style={{
      background: tone,
      color: tone === "var(--pop)" ? "var(--ink)" : undefined,
    }}
  >
    <div className="pf-stat-label">{label}</div>
    <div>
      <span className="num">{value}</span>
      {unit && <span className="pf-stat-unit"> {unit}</span>}
    </div>
  </div>
)

// 芸歴・結成年数・賞レース成績を数字で大きく見せる
export const Stats: FC<{ info: NodeInfo }> = ({ info }) => {
  const { career, finals } = info
  const stats: ReactNode[] = []
  if (career) {
    stats.push(
      <Stat key="since" label={`${career.kind}年`} value={career.since} />
    )
    const end = career.until ?? new Date().getFullYear()
    stats.push(
      <Stat
        key="years"
        label={
          career.until
            ? "活動期間"
            : career.kind === "結成"
              ? "結成から"
              : "芸歴"
        }
        value={end - career.since}
        unit="年"
        tone="var(--pop)"
      />
    )
  }
  if (info.birth_date) {
    // 表示時点の年齢
    const now = new Date()
    const [y, m, d] = info.birth_date.split("-").map(Number)
    const age =
      now.getFullYear() -
      y -
      (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)
        ? 1
        : 0)
    stats.push(<Stat key="age" label="年齢" value={age} unit="歳" />)
  }
  if (finals) {
    stats.push(
      <Stat
        key="finals"
        label="賞レース決勝"
        value={finals.count}
        unit="回"
        tone="var(--blue-soft)"
      />
    )
    if (finals.best)
      stats.push(
        <Stat
          key="best"
          label="最高成績"
          value={finals.best === 1 ? "優勝" : finals.best}
          unit={finals.best === 1 ? undefined : "位"}
          tone="var(--accent-soft)"
        />
      )
  }
  const doki = info.links.filter((l) => l.label === "同期生").length
  if (info.id.startsWith("t:") && doki)
    stats.push(
      <Stat
        key="doki"
        label="登録されている同期"
        value={doki}
        unit="人"
        tone="var(--pop)"
      />
    )
  return stats.length > 0 && <div className="pf-stats">{stats}</div>
}

export const Heading: FC<{ info: NodeInfo; level?: 1 | 2 }> = ({
  info,
  level = 2,
}) => {
  const H = `h${level}` as const
  return (
    <div className="pf-hero">
      {info.photo_url && (
        <img
          src={info.photo_url}
          alt={info.name}
          loading="lazy"
          className="pf-photo"
        />
      )}
      <div>
        <p className="pf-row">
          <span className="sticker" data-tone={KIND_TONE[info.id[0]]}>
            {KIND_NAME[info.id[0]]}
          </span>
          {info.status && (
            <span className="sticker" data-tone="plain">
              {info.status}
            </span>
          )}
        </p>
        <p className="pf-muted pf-reading">{info.reading}</p>
        <H className="pf-name">{info.name}</H>
        {info.aliases.length > 0 && (
          <p className="pf-muted">別名: {info.aliases.join("、")}</p>
        )}
      </div>
    </div>
  )
}

export const Facts: FC<{ info: NodeInfo }> = ({ info }) =>
  info.facts.length > 0 && (
    <dl className="pf-facts">
      {info.facts.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )

const Badge: FC<{ children: ReactNode; tone?: "warn" | "ok" }> = ({
  children,
  tone,
}) => (
  <span className="pf-badge" data-tone={tone}>
    {children}
  </span>
)

// 関係の確認状態・確度・根拠。詳細ページとグラフの線の詳細で共用
export const RelBadges: FC<{ link: LinkInfo }> = ({ link: l }) => {
  if (l.kind === "tv") return <Badge tone="warn">Wikipedia記載・未照合</Badge>
  if (l.derived) return <Badge>登録データから導出</Badge>
  if (!l.rel)
    return (
      l.kind !== "member" &&
      l.kind !== "former_member" && (
        <Badge>{CONFIDENCE_LABEL[l.confidence]}</Badge>
      )
    )
  const state = verifyState(l.confidence, l.rel.last_verified_at)
  return (
    <>
      <Badge tone={state === "確認済み" ? "ok" : "warn"}>
        {state === "確認済み"
          ? `確認済み ${l.rel.last_verified_at}`
          : state === "推定"
            ? "推定（出典未照合）"
            : "未確認（出典未照合）"}
      </Badge>
      <Badge>{CONFIDENCE_LABEL[l.confidence]}</Badge>
      <Badge>根拠: {EVIDENCE_LABEL[l.rel.evidence_type]}</Badge>
    </>
  )
}

// renderOther: 相手ノードの表示（パネルではボタン、詳細ページではリンク）
export const Links: FC<{
  info: NodeInfo
  renderOther: (l: LinkInfo) => ReactNode
}> = ({ info, renderOther }) => {
  if (!info.links.length)
    return <p className="pf-text">登録された関係はありません。</p>
  const order = Object.keys(EDGE_KINDS)
  const links = info.links
    .toSorted((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    .slice(0, LINK_LIMIT)
  return (
    <>
      <ul className="pf-links">
        {links.map((l, i) => (
          <Fragment key={l.edgeId}>
            {links[i - 1]?.kind !== l.kind && (
              <li className="pf-kind">
                <LineSample kind={l.kind} />
                {EDGE_KINDS[l.kind].label}
              </li>
            )}
            <li className="pf-link">
              <div className="pf-row">
                <span className="pf-muted pf-rel-label">{l.label}</span>
                {l.otherPhoto && <Photo src={l.otherPhoto} size={28} />}
                {renderOther(l)}
              </div>
              <div className="pf-row pf-indent">
                <RelBadges link={l} />
                {l.period && (
                  <Badge>
                    {l.kind === "tv" ? l.period : `在籍 ${l.period}`}
                  </Badge>
                )}
                {l.rel && (l.rel.start_date || l.rel.end_date) && (
                  <Badge>{`${l.rel.start_date ?? "?"}〜${l.rel.end_date ?? ""}`}</Badge>
                )}
              </div>
              {l.rel && (
                <p className="pf-indent pf-small">{l.rel.description}</p>
              )}
            </li>
          </Fragment>
        ))}
      </ul>
      {info.links.length > LINK_LIMIT && (
        <p className="pf-muted pf-more">
          ほか {info.links.length - LINK_LIMIT}
          件。グラフで展開するとたどれます。
        </p>
      )}
    </>
  )
}

export const Results: FC<{ info: NodeInfo }> = ({ info }) =>
  info.results.length > 0 && (
    <ol className="pf-timeline">
      {info.results.map((r) => (
        <li key={`${r.year}-${r.competition}-${r.stage}-${r.via}`}>
          <span className="num pf-year">{r.year}</span>
          <span>
            {r.raceId ? (
              <Link href={nodeHref(r.raceId)}>{r.competition}</Link>
            ) : (
              r.competition
            )}{" "}
            <span className="pf-muted pf-small">{r.stage}</span>
            {r.via && <span className="pf-muted pf-small">（{r.via}）</span>}
          </span>
          {r.rank && (
            <span
              className="sticker"
              data-tone={r.rank === 1 ? "red" : "plain"}
            >
              {r.rank === 1 ? "優勝" : `${r.rank}位`}
            </span>
          )}
        </li>
      ))}
    </ol>
  )

export const Sources: FC<{ info: NodeInfo }> = ({ info }) => (
  <ul className="pf-list pf-small">
    {info.sources.map((s) => (
      <li key={s.id}>
        {s.url ? (
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            {s.name}
          </a>
        ) : (
          s.name
        )}{" "}
        <span className="pf-muted">
          {s.checked_at ? `確認日 ${s.checked_at}` : "未照合"}
          {s.notes && ` / ${s.notes}`}
        </span>
      </li>
    ))}
  </ul>
)

const subscribers = new Intl.NumberFormat("ja-JP", {
  notation: "compact",
  maximumSignificantDigits: 3,
})

export const Youtube: FC<{ info: NodeInfo }> = ({ info }) => (
  <ul className="pf-list">
    {info.youtube?.channels.map((c) => (
      <li key={c.url}>
        <a href={c.url} target="_blank" rel="noopener noreferrer">
          {c.title}
        </a>{" "}
        {c.subscribers !== null && (
          <span className="pf-muted">
            登録者 {subscribers.format(c.subscribers)}人
          </span>
        )}
      </li>
    ))}
  </ul>
)

const PROGRAM_STATUS = { current: "出演中", past: "終了" }

export const Programs: FC<{ info: NodeInfo }> = ({ info }) =>
  info.programs && (
    <>
      <p className="pf-small pf-programs-head">
        <Badge tone="warn">Wikipedia記載・出典未照合</Badge>{" "}
        <a
          href={`https://ja.wikipedia.org/wiki/${encodeURIComponent(info.programs.page)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Wikipedia「{info.programs.page}」
        </a>
        <span className="pf-muted"> {info.programs.fetched_at}取得</span>
      </p>
      <ul className="pf-list">
        {info.programs.items.map((p) => (
          <li key={p.title}>
            {p.hasPage ? (
              <Link href={nodeHref(programId(p.title))}>{p.title}</Link>
            ) : (
              p.title
            )}
            {p.status && (
              <>
                {" "}
                <Badge tone={p.status === "current" ? "ok" : undefined}>
                  {PROGRAM_STATUS[p.status]}
                </Badge>
              </>
            )}
            {p.note && <span className="pf-muted pf-small"> {p.note}</span>}
          </li>
        ))}
      </ul>
    </>
  )

export const History: FC<{ info: NodeInfo }> = ({ info }) => (
  <ul className="pf-list pf-small">
    {info.history?.map((h) => (
      <li key={`${h.date}-${h.note}`}>
        <span className="pf-muted">{h.date}</span> {h.note}
      </li>
    ))}
  </ul>
)

export const SectionTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <h3 className="pf-section">{children}</h3>
)

// 関係を種類ごとの節にまとめる。ここに無い種類は「関連する芸人」へ
const LINK_SECTIONS: [string, string[]][] = [
  ["コンビ・グループとメンバー", ["member", "former_member"]],
  ["師弟関係", ["master"]],
  ["同期・養成所", ["doki"]],
  ["賞レースで競った芸人", ["competition"]],
]

// 詳細パネル・詳細ページ共通の本文
export const Profile: FC<{
  info: NodeInfo
  renderOther: (l: LinkInfo) => ReactNode
  // 詳細ページでは節への目次を出す
  toc?: boolean
}> = ({ info, renderOther, toc }) => {
  // 芸人・コンビの番組共演は下の「テレビ出演番組」に出すので関係の一覧からは外す
  const rels = info.id.startsWith("v:")
    ? info
    : { ...info, links: info.links.filter((l) => l.kind !== "tv") }
  // [見出し, 本文]。目次と本文で共用する
  const sections: [string, ReactNode][] = []
  const linkSections: [string, LinkInfo[]][] = info.id.startsWith("v:")
    ? [[`出演者（${rels.links.length}件）`, rels.links]]
    : rels.links.length === 0
      ? [["関係", rels.links]]
      : [
          ...LINK_SECTIONS,
          [
            "関連する芸人",
            Object.keys(EDGE_KINDS).filter(
              (k) => !LINK_SECTIONS.some(([, ks]) => ks.includes(k))
            ),
          ] as [string, string[]],
        ].flatMap(([title, kinds]): [string, LinkInfo[]][] => {
          const links = rels.links.filter((l) => kinds.includes(l.kind))
          return links.length ? [[`${title}（${links.length}件）`, links]] : []
        })
  for (const [title, links] of linkSections)
    sections.push([
      title,
      <Links key={title} info={{ ...rels, links }} renderOther={renderOther} />,
    ])
  if (info.results.length > 0)
    sections.push([
      `賞レース（${info.results.length}件）`,
      <Results key="r" info={info} />,
    ])
  if (info.youtube)
    sections.push([
      `YouTube（${info.youtube.fetched_at}時点）`,
      <Youtube key="y" info={info} />,
    ])
  if (info.programs)
    sections.push([
      `テレビ出演番組（バラエティなど ${info.programs.items.length}件）`,
      <Programs key="v" info={info} />,
    ])
  if (info.sources.length > 0 || /^[pg]:/.test(info.id))
    sections.push([
      "出典・確認状況",
      info.sources.length > 0 ? (
        <Sources key="s" info={info} />
      ) : (
        <p key="s" className="pf-text pf-muted">
          出典は未登録です。掲載内容は確定情報ではありません。
        </p>
      ),
    ])
  if (info.history) sections.push(["更新履歴", <History key="h" info={info} />])
  return (
    <>
      <Stats info={info} />
      {info.biography && <p className="pf-lead">{info.biography}</p>}
      <Facts info={info} />
      {info.profileChecked !== undefined && (
        <p className="pf-checked">
          {info.profileChecked ? (
            <Badge tone="ok">
              プロフィール出典確認日 {info.profileChecked}
            </Badge>
          ) : (
            <Badge tone="warn">
              プロフィールは出典未照合（確定情報ではありません）
            </Badge>
          )}
        </p>
      )}
      {toc && sections.length >= 3 && (
        <nav aria-label="目次" className="pf-toc">
          {sections.map(([title], i) => (
            <a key={title} href={`#s${i}`}>
              {title}
            </a>
          ))}
        </nav>
      )}
      {sections.map(([title, body], i) => (
        <section key={title} id={`s${i}`} className="pf-sec">
          <SectionTitle>{title}</SectionTitle>
          {body}
        </section>
      ))}
    </>
  )
}
