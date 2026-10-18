import { FC, ReactNode } from "react"
import { LineSample } from "@/components/graph/legend"
import type { LinkInfo, NodeInfo } from "@/lib/node-info"

// 詳細パネル（クライアント）と詳細ページ（サーバー）で共用する。データ取得はせず NodeInfo を描くだけ

const CONFIDENCE_LABEL = { high: "確度高", medium: "確度中", low: "確度低" }

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
      <p style={{ fontSize: ".75rem", color: "var(--muted)" }}>
        {info.reading}
      </p>
      <H
        style={{
          fontSize: level === 1 ? "1.75rem" : "1.25rem",
          lineHeight: 1.3,
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
  return (
    <ul
      style={{ listStyle: "none", padding: 0, display: "grid", gap: ".5rem" }}
    >
      {info.links.map((l) => (
        <li key={l.edgeId} style={{ fontSize: ".875rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".4rem",
              flexWrap: "wrap",
            }}
          >
            <LineSample kind={l.kind} />
            <span style={{ color: "var(--muted)" }}>{l.label}</span>
            {renderOther(l)}
          </div>
          <div
            style={{
              display: "flex",
              gap: ".25rem",
              flexWrap: "wrap",
              marginLeft: "2.6rem",
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
            <p style={{ marginLeft: "2.6rem", fontSize: ".8rem" }}>
              {l.rel.description}
            </p>
          )}
        </li>
      ))}
    </ul>
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

export const SectionTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <h3
    style={{
      fontSize: ".9rem",
      margin: "1.25rem 0 .5rem",
      borderBottom: "1px solid var(--line)",
      paddingBottom: ".25rem",
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
    <Facts info={info} />
    <SectionTitle>関係（{info.links.length}件）</SectionTitle>
    <Links info={info} renderOther={renderOther} />
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
  </>
)
