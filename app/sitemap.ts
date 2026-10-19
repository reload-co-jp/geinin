import type { MetadataRoute } from "next"
import { OTHER, ROWS } from "@/app/list/shared"
import { db } from "@/lib/db"

export const dynamic = "force-static"

const base = "https://geinin.reload.co.jp"

const sitemap = (): MetadataRoute.Sitemap =>
  [
    "/",
    "/graph/",
    "/list/",
    "/schedule/",
    "/finals/",
    "/doki/",
    "/search/",
    ...[...ROWS, OTHER].map((r) => `/list/${r.slug}/`),
    ...db.people.map((p) => `/people/${p.id}/`),
    ...db.groups.map((g) => `/groups/${g.id}/`),
  ].map((path) => ({ url: base + path }))

export default sitemap
