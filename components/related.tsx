import Link from "next/link"
import { FC } from "react"
import { Photo } from "@/components/photo"
import { nodeHref } from "@/lib/graph"
import type { Faq, Recommendation, TimelineEntry } from "@/lib/related"

// 詳細ページ専用の読み物（年表・よくある質問）と、次に見る芸人への導線

export const Timeline: FC<{ entries: TimelineEntry[] }> = ({ entries }) => (
  <ol className="pf-timeline">
    {entries.map((e, i) => (
      <li key={`${e.date}-${e.text}-${i}`}>
        {/* 同じ年が続くときは年を繰り返さない */}
        <span className="num pf-year">
          {entries[i - 1]?.year === e.year ? "" : e.year}
        </span>
        <span>{e.text}</span>
      </li>
    ))}
  </ol>
)

export const FaqList: FC<{ faqs: Faq[] }> = ({ faqs }) => (
  <>
    <dl className="pf-faq">
      {faqs.map((f) => (
        <div key={f.q}>
          <dt>Q. {f.q}</dt>
          <dd>A. {f.a}</dd>
        </div>
      ))}
    </dl>
    <p className="pf-muted pf-small">
      回答は当サイトの登録データから自動で作成しています。
    </p>
  </>
)

const Cards: FC<{ items: Recommendation[] }> = ({ items }) => (
  <ul className="pf-cast">
    {items.map((r) => (
      <li key={r.id}>
        <Photo src={r.photo} size={64} />
        <span className="pf-cast-body">
          <span className="pf-muted pf-small">
            {r.id.startsWith("g:") ? "コンビ・グループ" : "芸人"}
          </span>
          <Link href={nodeHref(r.id)} style={{ fontWeight: "bold" }}>
            {r.name}
          </Link>
          <span className="pf-muted pf-small">{r.reason}</span>
        </span>
      </li>
    ))}
  </ul>
)

export const NextReads: FC<{
  name: string
  near: Recommendation[]
  agency: Recommendation[]
  agencyId: string | null
  agencyName: string | null
  year: Recommendation[]
  startYear: number | null
  group: boolean
  dokiHref: string | null
}> = ({
  name,
  near,
  agency,
  agencyId,
  agencyName,
  year,
  startYear,
  group,
  dokiHref,
}) =>
  (near.length > 0 || agency.length > 0 || year.length > 0) && (
    <aside aria-label="次に見る" className="nd-next">
      <h2 className="nd-next-title">{name}を見た人におすすめ</h2>
      {near.length > 0 && (
        <section>
          <h3 className="pf-section">関係の近い芸人</h3>
          <Cards items={near} />
        </section>
      )}
      {agency.length > 0 && (
        <section>
          <h3 className="pf-section">同じ事務所の芸人</h3>
          <Cards items={agency} />
          {agencyId && (
            <p className="nd-more">
              <Link href={`/agencies/${agencyId}/`}>
                {agencyName}所属の芸人をすべて見る →
              </Link>
            </p>
          )}
        </section>
      )}
      {year.length > 0 && startYear && (
        <section>
          <h3 className="pf-section">
            {startYear}年{group ? "結成のコンビ・グループ" : "デビューの芸人"}
          </h3>
          <Cards items={year} />
          {dokiHref && (
            <p className="nd-more">
              <Link href={dokiHref}>同期の芸人をすべて見る →</Link>
            </p>
          )}
        </section>
      )}
      <p className="nd-more">
        <Link href="/list/">芸人・コンビ一覧</Link>
        {" ・ "}
        <Link href="/races/">賞レース歴代決勝</Link>
        {" ・ "}
        <Link href="/agencies/">事務所一覧</Link>
      </p>
    </aside>
  )
