import type { MetadataRoute } from "next"
import { OTHER, ROWS } from "@/app/list/shared"
import { races } from "@/app/races/shared"
import { years } from "@/app/doki/shared"
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
    "/races/",
    ...races.map((r) => `/races/${r.slug}/`),
    ...raceIds.map(nodeHref),
    ...years.map(([y]) => `/doki/${y}/`),
  ].map((path) => ({ url: base + path }))

export default sitemap
