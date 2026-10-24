import Link from "next/link"
import { AdSlot } from "@/components/ad-slot"
import { Footer, Header, Main, Title } from "@/components/elements/layout"
import "./reset.css"

export const metadata = {
  metadataBase: new URL("https://geinin.reload.co.jp"),
  title: { default: "芸人系譜DB", template: "%s | 芸人系譜DB" },
  description:
    "お笑い芸人の師弟・同期・コンビ変遷・共演・賞レースの関係をネットワークグラフでたどるデータベース",
  openGraph: { siteName: "芸人系譜DB", type: "website", locale: "ja_JP" },
  twitter: { card: "summary_large_image" },
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=M+PLUS+Rounded+1c:wght@400;700;800&display=swap"
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6542845006087970"
          crossOrigin="anonymous"
        />
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-19N15RDTJ5"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-19N15RDTJ5');`,
          }}
        />
      </head>
      <body>
        <Header>
          <Title style={{ fontSize: "1.3rem" }}>
            <Link href="/" className="logo">
              芸人系譜DB
            </Link>
          </Title>
          <nav>
            <Link href="/graph/">関係性グラフ</Link>
            <Link href="/list/">一覧</Link>
            <Link href="/schedule/">賞レース</Link>
            <Link href="/finals/">決勝進出</Link>
            <Link href="/doki/">同期</Link>
            <Link href="/search/">検索</Link>
          </nav>
        </Header>
        <Main>
          {children}
          <AdSlot
            data-ad-slot="4829146611"
            data-ad-format="auto"
            data-full-width-responsive="true"
            style={{ marginTop: "2rem" }}
          />
        </Main>
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
