import type { MetadataRoute } from "next"
import { OTHER, ROWS } from "@/app/list/shared"
import { races } from "@/app/races/shared"
import { prelimYears, stagesOf } from "@/app/m1/shared"
import { STAGE_SLUGS } from "@/lib/m1"
import { years } from "@/app/doki/shared"
import { indexedTerms } from "@/app/nsc/shared"
import { rankings } from "@/app/ranking/shared"
import {
  agencyIndexable,
  db,
  isThin,
  programIds,
  raceIds,
  venues,
} from "@/lib/db"
import { nodeHref } from "@/lib/graph"
import { pageHref } from "@/lib/paging"
import { listExtraPages } from "@/app/list/[row]/view"
import { dokiExtraPages } from "@/app/doki/[year]/view"
import { termExtraPages } from "@/app/nsc/[school]/[term]/view"
import { agencyExtraPages } from "@/app/agencies/[id]/view"

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
    // 一覧の2ページ目以降
    ...listExtraPages().map(({ row, n }) => pageHref(`/list/${row}/`, n)),
    // noindex のページはサイトマップに載せない
    ...db.people
      .filter((p) => !isThin(`p:${p.id}`))
      .map((p) => `/people/${p.id}/`),
    ...db.groups
      .filter((g) => !isThin(`g:${g.id}`))
      .map((g) => `/groups/${g.id}/`),
    "/races/",
    "/ranking/",
    ...rankings.map((r) => `/ranking/${r.slug}/`),
    "/shitei/",
    ...races.map((r) => `/races/${r.slug}/`),
    ...raceIds.map(nodeHref),
    ...years.map(([y]) => `/doki/${y}/`),
    ...dokiExtraPages().map(({ year, n }) => pageHref(`/doki/${year}/`, n)),
    "/nsc/",
    ...indexedTerms.map((t) => t.href),
    ...termExtraPages().map(({ school, term, n }) =>
      pageHref(`/nsc/${school}/${term}/`, n)
    ),
    "/programs/",
    ...programIds.filter((id) => !isThin(id)).map(nodeHref),
    "/agencies/",
    ...db.agencies
      .filter((a) => agencyIndexable(a.id))
      .map((a) => `/agencies/${a.id}/`),
    ...agencyExtraPages()
      .filter(({ id }) => agencyIndexable(id))
      .map(({ id, n }) => pageHref(`/agencies/${id}/`, n)),
    ...prelimYears.flatMap((y) => [
      `/m1/${y}/`,
      // 日程別のページ（/m1/{年}/{回戦}/{日付}/）は noindex なので載せない
      ...stagesOf(y).map((s) => `/m1/${y}/${STAGE_SLUGS[s]}/`),
    ]),
    "/venues/",
    ...venues.map((v) => `/venues/${v.slug}/`),
  ].map((path) => ({ url: base + path }))

export default sitemap
