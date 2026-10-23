import { FC } from "react"

export const metadata = { title: "賞レース開催時期" }

// 例年の目安（月単位）。年により前後する。from/to は 1〜12 の月
const SCHEDULE = [
  {
    name: "R-1グランプリ",
    spans: [
      { label: "予選", from: 1, to: 2 },
      { label: "決勝", from: 3, to: 3 },
      { label: "予選", from: 12, to: 12 },
    ],
  },
  {
    name: "THE SECOND",
    spans: [
      { label: "予選", from: 2, to: 4 },
      { label: "決勝", from: 5, to: 5 },
    ],
  },
  {
    name: "ABCお笑いグランプリ",
    spans: [
      { label: "予選", from: 5, to: 6 },
      { label: "決勝", from: 7, to: 7 },
    ],
  },
  {
    name: "キングオブコント",
    spans: [
      { label: "予選", from: 6, to: 9 },
      { label: "決勝", from: 10, to: 10 },
    ],
  },
  {
    name: "M-1グランプリ",
    spans: [
      { label: "予選", from: 8, to: 11 },
      { label: "決勝", from: 12, to: 12 },
    ],
  },
  {
    name: "THE W",
    spans: [
      { label: "予選", from: 8, to: 11 },
      { label: "決勝", from: 12, to: 12 },
    ],
  },
]

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const Page: FC = () => (
  <div className="page">
    <h2 style={{ fontSize: "1.1rem" }}>賞レース開催時期</h2>
    <p className="lead">例年の目安です。年によって前後します。</p>
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "10rem repeat(12, minmax(2.5rem, 1fr))",
          minWidth: 640,
          background: "var(--surface)",
          fontSize: ".8rem",
        }}
      >
        <div />
        {MONTHS.map((m) => (
          <div
            key={m}
            style={{
              textAlign: "center",
              padding: ".35rem 0",
              borderBottom: "2px solid var(--line)",
            }}
          >
            {m}月
          </div>
        ))}
        {SCHEDULE.map((c, row) => (
          <div key={c.name} style={{ display: "contents" }}>
            <div
              style={{
                gridRow: row + 2,
                gridColumn: 1,
                padding: ".5rem",
                borderBottom: "1px solid var(--line)",
                fontWeight: "bold",
              }}
            >
              {c.name}
            </div>
            {MONTHS.map((m) => (
              <div
                key={m}
                style={{
                  gridRow: row + 2,
                  gridColumn: m + 1,
                  borderBottom: "1px solid var(--line)",
                  borderLeft: "1px solid var(--line)",
                }}
              />
            ))}
            {c.spans.map((s) => (
              <div
                key={`${s.label}-${s.from}`}
                title={`${c.name} ${s.label} ${s.from}〜${s.to}月`}
                style={{
                  gridRow: row + 2,
                  gridColumn: `${s.from + 1} / ${s.to + 2}`,
                  alignSelf: "center",
                  margin: "0 2px",
                  padding: ".15rem .35rem",
                  borderRadius: 4,
                  color: s.label === "決勝" ? "#fff" : "var(--text)",
                  background:
                    s.label === "決勝"
                      ? "var(--accent)"
                      : "color-mix(in srgb, var(--accent) 25%, transparent)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {s.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default Page
