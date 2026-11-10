import type { MetadataRoute } from "next"
import { OTHER, ROWS } from "@/app/list/shared"
import { races } from "@/app/races/shared"
import {
  daysOf,
  entrantsOf,
  prelimYears,
  SPLIT_AT,
  stagesOf,
} from "@/app/m1/shared"
import { STAGE_SLUGS } from "@/lib/m1"
import { years } from "@/app/doki/shared"
import { db, isThin, programIds, raceIds, venues } from "@/lib/db"
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
    // noindex のページはサイトマップに載せない
    ...db.people
      .filter((p) => !isThin(`p:${p.id}`))
      .map((p) => `/people/${p.id}/`),
    ...db.groups
      .filter((g) => !isThin(`g:${g.id}`))
      .map((g) => `/groups/${g.id}/`),
    "/races/",
    ...races.map((r) => `/races/${r.slug}/`),
    ...raceIds.map(nodeHref),
    ...years.map(([y]) => `/doki/${y}/`),
    "/programs/",
    ...programIds.filter((id) => !isThin(id)).map(nodeHref),
    "/agencies/",
    ...db.agencies.map((a) => `/agencies/${a.id}/`),
    ...prelimYears.flatMap((y) => [
      `/m1/${y}/`,
      ...stagesOf(y).flatMap((s) => {
        const href = `/m1/${y}/${STAGE_SLUGS[s]}/`
        const es = entrantsOf(y, s)
        return [
          href,
          ...(es.length > SPLIT_AT
            ? daysOf(es).map((d) => `${href}${d.slug}/`)
            : []),
        ]
      }),
    ]),
    "/venues/",
    ...venues.map((v) => `/venues/${v.slug}/`),
  ].map((path) => ({ url: base + path }))

export default sitemap
