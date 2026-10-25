import { FC } from "react"

// 正方形の顔写真。写真がなければ同じ大きさの枠で列をそろえる
export const Photo: FC<{ src?: string | null; size: number }> = ({
  src,
  size,
}) =>
  src ? (
    <img
      src={src}
      alt=""
      className="photo"
      loading="lazy"
      width={size}
      height={size}
      style={{ objectFit: "cover", flexShrink: 0 }}
    />
  ) : (
    <span
      className="photo"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        background: "color-mix(in srgb, var(--line) 12%, transparent)",
      }}
    />
  )
