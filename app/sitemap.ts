import type { MetadataRoute } from "next"
import { OTHER, ROWS } from "@/app/list/shared"
import { db, raceIds } from "@/lib/db"
import { nodeHref } from "@/lib/graph"

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
    ...raceIds.map(nodeHref),
  ].map((path) => ({ url: base + path }))

export default sitemap
