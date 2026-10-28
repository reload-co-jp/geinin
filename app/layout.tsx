import Link from "next/link"
import { AdSlot } from "@/components/ad-slot"
import { Footer, Header, Main, Title } from "@/components/elements/layout"
import "./reset.css"

export const metadata = {
  metadataBase: new URL("https://geinin.reload.co.jp"),
  title: { default: "芸人データベース", template: "%s | 芸人データベース" },
  description:
    "お笑い芸人の師弟・同期・コンビ変遷・共演・賞レースの関係をネットワークグラフでたどるデータベース",
  openGraph: { siteName: "芸人データベース", type: "website", locale: "ja_JP" },
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
              <img src="/icon.svg" alt="" width={29} height={29} />
              芸人データベース
            </Link>
          </Title>
          <nav aria-label="メイン">
            <Link href="/list/">芸人一覧</Link>
            <Link href="/doki/">同期</Link>
            <Link href="/races/">賞レース</Link>
            <Link href="/programs/">番組</Link>
            <Link href="/agencies/">事務所</Link>
            <Link href="/search/">検索</Link>
            <Link href="/graph/">相関図</Link>
          </nav>
        </Header>
        <Main>
          <AdSlot data-ad-slot="4829146611" className="ad-top" />
          {children}
          <AdSlot
            data-ad-slot="4829146611"
            data-ad-format="auto"
            data-full-width-responsive="true"
            style={{ margin: "1rem auto" }}
          />
        </Main>
        <Footer>
          <p>
            掲載情報は公開情報の要約です。「出典未照合」の項目は確定情報ではありません。
          </p>
          <p>
            <a
              href="https://github.com/reload-co-jp/geinin/issues/new?title=%E6%83%85%E5%A0%B1%E3%81%AE%E8%AA%A4%E3%82%8A"
              target="_blank"
              rel="noopener noreferrer"
            >
              掲載情報の誤りを報告
            </a>
          </p>
        </Footer>
      </body>
    </html>
  )
}
export default RootLayout
