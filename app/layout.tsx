import Link from "next/link"
import { Footer, Header, Main, Title } from "@/components/elements/layout"
import "./reset.css"

export const metadata = {
  title: { default: "芸人系譜DB", template: "%s | 芸人系譜DB" },
  description:
    "お笑い芸人の師弟・同期・コンビ変遷・共演・賞レースの関係をネットワークグラフでたどるデータベース",
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=M+PLUS+Rounded+1c:wght@400;700;800&display=swap"
        />
      </head>
      <body>
        <Header>
          <Title style={{ fontSize: "1.3rem" }}>
            <Link href="/" className="logo">
              芸人系譜DB
            </Link>
          </Title>
          <nav
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: ".6rem",
              fontSize: ".85rem",
            }}
          >
            <Link href="/graph/">関係性グラフ</Link>
            <Link href="/list/">一覧</Link>
            <Link href="/schedule/">賞レース</Link>
            <Link href="/search/">検索</Link>
          </nav>
        </Header>
        <Main>{children}</Main>
        <Footer>
          <p>
            掲載情報は公開情報の要約です。「出典未照合」の項目は確定情報ではありません。
          </p>
        </Footer>
      </body>
    </html>
  )
}
export default RootLayout
