import { FC, Fragment, ReactNode } from "react"
import { LineSample } from "@/components/graph/legend"
import { EDGE_KINDS } from "@/lib/graph"
import type { LinkInfo, NodeInfo } from "@/lib/node-info"

// 詳細パネル（クライアント）と詳細ページ（サーバー）で共用する。データ取得はせず NodeInfo を描くだけ

const CONFIDENCE_LABEL = { high: "確度高", medium: "確度中", low: "確度低" }
const KIND_NAME: Record<string, string> = {
  p: "芸人",
  g: "コンビ・グループ",
  t: "同期（養成所の期）",
  x: "賞レースの決勝",
}
const KIND_TONE: Record<string, string | undefined> = {
  p: "red",
  g: undefined,
  t: "blue",
  x: "plain",
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
    style={{
      border: "2px solid var(--text)",
      background: tone,
      padding: ".5rem .6rem",
      boxShadow: "3px 3px 0 var(--text)",
    }}
  >
    <div style={{ fontSize: ".7rem", fontWeight: 800 }}>{label}</div>
    <div>
      <span className="num" style={{ fontSize: "2rem" }}>
        {value}
      </span>
      {unit && (
        <span style={{ fontSize: ".8rem", fontWeight: 800 }}> {unit}</span>
      )}
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
  return (
    stats.length > 0 && (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: ".6rem",
          margin: ".75rem 0 1rem",
        }}
      >
        {stats}
      </div>
    )
  )
}

export const Heading: FC<{ info: NodeInfo; level?: 1 | 2 }> = ({
  info,
  level = 2,
}) => {
  const H = `h${level}` as const
  return (
    <div>
      {info.photo_url && (
        <img
          src={info.photo_url}
          alt={info.name}
          loading="lazy"
          style={{ width: 120, height: "auto", marginBottom: ".5rem" }}
        />
      )}
      <p style={{ display: "flex", gap: ".35rem", flexWrap: "wrap" }}>
        <span className="sticker" data-tone={KIND_TONE[info.id[0]]}>
          {KIND_NAME[info.id[0]]}
        </span>
        {info.status && (
          <span
            className="sticker"
            data-tone="plain"
            style={{ transform: "rotate(1.5deg)" }}
          >
            {info.status}
          </span>
        )}
      </p>
      <p
        style={{
          fontSize: ".75rem",
          color: "var(--muted)",
          marginTop: ".4rem",
        }}
      >
        {info.reading}
      </p>
      <H
        style={{
          fontSize: level === 1 ? "clamp(2rem, 6vw, 3rem)" : "1.7rem",
          lineHeight: 1.2,
          background: "none",
        }}
      >
        {info.name}
      </H>
      {info.aliases.length > 0 && (
        <p style={{ fontSize: ".8rem", color: "var(--muted)" }}>
          別名: {info.aliases.join("、")}
        </p>
      )}
    </div>
  )
}

export const Facts: FC<{ info: NodeInfo }> = ({ info }) =>
  info.facts.length > 0 && (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: ".25rem 1rem",
        fontSize: ".875rem",
      }}
    >
      {info.facts.map(([term, value]) => (
        <div key={term} style={{ display: "contents" }}>
          <dt style={{ color: "var(--muted)" }}>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )

const Badge: FC<{ children: ReactNode; tone?: "warn" | "ok" }> = ({
  children,
  tone,
}) => (
  <span
    style={{
      fontSize: ".7rem",
      padding: "0 .35rem",
      borderRadius: 4,
      whiteSpace: "nowrap",
      border: "1px solid",
      color:
        tone === "warn"
          ? "#9a5b00"
          : tone === "ok"
            ? "#1e7a3c"
            : "var(--muted)",
    }}
  >
    {children}
  </span>
)

// renderOther: 相手ノードの表示（パネルではボタン、詳細ページではリンク）
export const Links: FC<{
  info: NodeInfo
  renderOther: (l: LinkInfo) => ReactNode
}> = ({ info, renderOther }) => {
  if (!info.links.length)
    return <p style={{ fontSize: ".875rem" }}>登録された関係はありません。</p>
  const order = Object.keys(EDGE_KINDS)
  const links = info.links
    .toSorted((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    .slice(0, LINK_LIMIT)
  return (
    <>
      <ul
        style={{ listStyle: "none", padding: 0, display: "grid", gap: ".5rem" }}
      >
        {links.map((l, i) => (
          <Fragment key={l.edgeId}>
            {links[i - 1]?.kind !== l.kind && (
              <li
                style={{
                  fontSize: ".75rem",
                  fontWeight: 800,
                  marginTop: i ? ".5rem" : 0,
                  display: "flex",
                  alignItems: "center",
                  gap: ".4rem",
                }}
              >
                <LineSample kind={l.kind} />
                {EDGE_KINDS[l.kind].label}
              </li>
            )}
            <li style={{ fontSize: ".875rem", paddingLeft: ".5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".4rem",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "var(--muted)", minWidth: "3em" }}>
                  {l.label}
                </span>
                {renderOther(l)}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: ".25rem",
                  flexWrap: "wrap",
                  marginLeft: "3.4rem",
                }}
              >
                {l.derived ? (
                  <Badge>登録データから導出</Badge>
                ) : (
                  l.kind !== "member" &&
                  l.kind !== "former_member" && (
                    <Badge>{CONFIDENCE_LABEL[l.confidence]}</Badge>
                  )
                )}
                {l.rel &&
                  (l.rel.last_verified_at ? (
                    <Badge tone="ok">確認日 {l.rel.last_verified_at}</Badge>
                  ) : (
                    <Badge tone="warn">出典未照合</Badge>
                  ))}
                {l.rel && (l.rel.start_date || l.rel.end_date) && (
                  <Badge>{`${l.rel.start_date ?? "?"}〜${l.rel.end_date ?? ""}`}</Badge>
                )}
              </div>
              {l.rel && (
                <p style={{ marginLeft: "3.4rem", fontSize: ".8rem" }}>
                  {l.rel.description}
                </p>
              )}
            </li>
          </Fragment>
        ))}
      </ul>
      {info.links.length > LINK_LIMIT && (
        <p
          style={{
            fontSize: ".8rem",
            color: "var(--muted)",
            marginTop: ".5rem",
          }}
        >
          ほか {info.links.length - LINK_LIMIT}
          件。グラフで展開するとたどれます。
        </p>
      )}
    </>
  )
}

export const Results: FC<{ info: NodeInfo }> = ({ info }) =>
  info.results.length > 0 && (
    <ul style={{ paddingLeft: "1.25rem", fontSize: ".875rem" }}>
      {info.results.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  )

export const Sources: FC<{ info: NodeInfo }> = ({ info }) => (
  <ul style={{ paddingLeft: "1.25rem", fontSize: ".8rem" }}>
    {info.sources.map((s) => (
      <li key={s.id}>
        {s.url ? (
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            {s.name}
          </a>
        ) : (
          s.name
        )}{" "}
        <span style={{ color: "var(--muted)" }}>
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
  <ul style={{ paddingLeft: "1.25rem", fontSize: ".875rem" }}>
    {info.youtube?.channels.map((c) => (
      <li key={c.url}>
        <a href={c.url} target="_blank" rel="noopener noreferrer">
          {c.title}
        </a>{" "}
        {c.subscribers !== null && (
          <span style={{ color: "var(--muted)" }}>
            登録者 {subscribers.format(c.subscribers)}人
          </span>
        )}
      </li>
    ))}
  </ul>
)

export const History: FC<{ info: NodeInfo }> = ({ info }) => (
  <ul style={{ paddingLeft: "1.25rem", fontSize: ".8rem" }}>
    {info.history?.map((h) => (
      <li key={`${h.date}-${h.note}`}>
        <span style={{ color: "var(--muted)" }}>{h.date}</span> {h.note}
      </li>
    ))}
  </ul>
)

export const SectionTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <h3
    style={{
      fontSize: ".9rem",
      margin: "1.5rem 0 .6rem",
      padding: ".15rem .6rem",
      background: "var(--text)",
      color: "var(--pop)",
    }}
  >
    {children}
  </h3>
)

// 詳細パネル・詳細ページ共通の本文
export const Profile: FC<{
  info: NodeInfo
  renderOther: (l: LinkInfo) => ReactNode
}> = ({ info, renderOther }) => (
  <>
    <Stats info={info} />
    <Facts info={info} />
    <SectionTitle>関係（{info.links.length}件）</SectionTitle>
    <Links info={info} renderOther={renderOther} />
    {info.youtube && (
      <>
        <SectionTitle>YouTube（{info.youtube.fetched_at}時点）</SectionTitle>
        <Youtube info={info} />
      </>
    )}
    {info.results.length > 0 && (
      <>
        <SectionTitle>賞レース</SectionTitle>
        <Results info={info} />
      </>
    )}
    {info.sources.length > 0 && (
      <>
        <SectionTitle>出典</SectionTitle>
        <Sources info={info} />
      </>
    )}
    {info.history && (
      <>
        <SectionTitle>更新履歴</SectionTitle>
        <History info={info} />
      </>
    )}
  </>
)
