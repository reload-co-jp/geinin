import type { MetadataRoute } from "next"
import { OTHER, ROWS } from "@/app/list/shared"
import { races } from "@/app/races/shared"
import { years } from "@/app/doki/shared"
import { db, programIds, raceIds } from "@/lib/db"
import { nodeHref } from "@/lib/graph"

export const dynamic = "force-static"

const base = "https://geinin.reload.co.jp"

const sitemap = (): MetadataRoute.Sitemap =>
  [
    "/",
    "/graph/",
    "/list/",
    "/doki/",
    "/search/",
    ...[...ROWS, OTHER].map((r) => `/list/${r.slug}/`),
    ...db.people.map((p) => `/people/${p.id}/`),
    ...db.groups.map((g) => `/groups/${g.id}/`),
    "/races/",
    ...races.map((r) => `/races/${r.slug}/`),
    ...raceIds.map(nodeHref),
    ...years.map(([y]) => `/doki/${y}/`),
    "/programs/",
    ...programIds.map(nodeHref),
    "/agencies/",
    ...db.agencies.map((a) => `/agencies/${a.id}/`),
  ].map((path) => ({ url: base + path }))

export default sitemap
