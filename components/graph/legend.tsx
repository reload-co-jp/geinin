import { FC } from "react"
import { EDGE_KINDS, type EdgeKind } from "@/lib/graph"

export const LineSample: FC<{ kind: EdgeKind }> = ({ kind }) => {
  const k = EDGE_KINDS[kind]
  return (
    <svg
      width="40"
      height="12"
      viewBox="-2 0 40 12"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* 線の配色は相関図の明るい描画面に合わせてあるので同じ下地を敷く */}
      <rect x="-2" y="0" width="40" height="12" rx="2" fill="#f7f4ed" />
      <line
        x1="0"
        y1="6"
        x2="30"
        y2="6"
        stroke={k.color}
        strokeWidth={2}
        strokeDasharray={k.dash?.join(" ")}
      />
      {k.arrow === "triangle" && (
        <path d="M28 2 L36 6 L28 10 Z" fill={k.color} />
      )}
      {k.arrow === "tee" && (
        <line x1="33" y1="1" x2="33" y2="11" stroke={k.color} strokeWidth={2} />
      )}
    </svg>
  )
}

// 凡例兼、関係性の種類による表示切り替え
export const Legend: FC<{
  kinds: Set<EdgeKind>
  onToggle: (k: EdgeKind) => void
}> = ({ kinds, onToggle }) => (
  <fieldset
    style={{
      border: 0,
      padding: 0,
      display: "flex",
      flexWrap: "wrap",
      gap: ".25rem .75rem",
    }}
  >
    <legend
      style={{ fontSize: ".75rem", fontWeight: "bold", marginBottom: ".25rem" }}
    >
      関係性の種類
    </legend>
    {(Object.keys(EDGE_KINDS) as EdgeKind[]).map((k) => (
      <label
        key={k}
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".25rem",
          fontSize: ".8rem",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={kinds.has(k)}
          onChange={() => onToggle(k)}
        />
        <LineSample kind={k} />
        {EDGE_KINDS[k].label}
      </label>
    ))}
  </fieldset>
)
