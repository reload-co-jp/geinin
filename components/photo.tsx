import { FC } from "react"

// 正方形の顔写真。元の比率のまま枠に収める。写真がなければ同じ大きさの枠で列をそろえる
export const Photo: FC<{ src?: string | null; size: number }> = ({
  src,
  size,
}) => (
  <span
    className="photo"
    style={{
      display: "inline-block",
      width: size,
      height: size,
      flexShrink: 0,
      background: `${src ? `url(${JSON.stringify(src)}) center / contain no-repeat, ` : ""}color-mix(in srgb, var(--line) 12%, transparent)`,
    }}
  />
)
