import type { MetadataRoute } from "next"

export const dynamic = "force-static"

const robots = (): MetadataRoute.Robots => ({
  rules: { userAgent: "*", allow: "/" },
  sitemap: "https://geinin.reload.co.jp/sitemap.xml",
})

export default robots
