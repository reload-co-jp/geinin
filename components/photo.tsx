import { FC } from "react"

// 正方形の顔写真。元の比率のまま枠に収める。写真がなければ同じ大きさの枠で列をそろえる。
// 一覧には数千人が並ぶページもあるので、画面に近づいてから読み込む（loading="lazy"）。
// 名前は隣に文字で出すので alt は空にする
export const Photo: FC<{ src?: string | null; size: number }> = ({
  src,
  size,
}) =>
  src ? (
    <img
      className="photo"
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span className="photo" style={{ width: size, height: size }} />
  )
