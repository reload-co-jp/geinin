import { FC } from "react"

// < をエスケープして </script> 注入を防ぐ
export const JsonLd: FC<{ data: object }> = ({ data }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    }}
  />
)
