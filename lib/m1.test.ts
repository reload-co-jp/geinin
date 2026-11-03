import { expect, test } from "vitest"
import {
  mergeM1Formation,
  mergeM1Prelims,
  prelimPeers,
  stageRank,
  type M1Prelim,
} from "@/lib/m1"
import type { Db, Group } from "@/lib/types"

const URL_A = "https://www.m-1gp.com/combi/1.html"
const group = (
  id: string,
  name: string,
  extra: Partial<Group> = {}
): Group => ({
  id,
  name,
  reading: name,
  aliases: [],
  group_type: "combi",
  formation_date: null,
  dissolution_date: null,
  agency_id: null,
  activity_status: null,
  source_ids: [],
  ...extra,
})
const base: Db = {
  sources: [
    {
      id: "s-a",
      source_name: "M-1",
      source_url: URL_A,
      source_type: "official",
      published_at: null,
      checked_at: null,
    },
  ],
  agencies: [],
  people: [],
  groups: [
    group("a", "エー", { source_ids: ["s-a"] }),
    group("b", "ビー"),
    group("c", "シー", { formation_date: "2010" }),
    group("d1", "同名"),
    group("d2", "同名"),
  ],
  memberships: [],
  relationships: [],
  competitionResults: [],
}

test("結成年は出典URLか一意な名前で照合し、未登録のときだけ補う", () => {
  const db = mergeM1Formation(base, {
    fetched_at: "2026-11-01",
    year: 2026,
    formed: {
      [URL_A]: { name: "別表記", year: 2020 },
      "https://www.m-1gp.com/combi/2.html": { name: "ビー", year: 2019 },
      "https://www.m-1gp.com/combi/3.html": { name: "シー", year: 2018 },
      "https://www.m-1gp.com/combi/4.html": { name: "同名", year: 2017 },
    },
  })
  expect(db.groups.map((g) => g.formation_date)).toEqual([
    "2020",
    "2019",
    "2010",
    null,
    null,
  ])
})

const prelim = (url: string, name: string, extra: Partial<M1Prelim> = {}) => ({
  year: 2026,
  stage: "2回戦" as const,
  url,
  name,
  date: "2026-09-01",
  venue: "会場X",
  source_url: "https://www.m-1gp.com/news/2.html",
  ...extra,
})

test("予選の進出を成績に加え、同じ日・会場の組を引ける", () => {
  const dump = {
    fetched_at: "2026-11-01",
    results: [
      prelim(URL_A, "エー"),
      prelim(URL_A, "エー"),
      prelim("https://www.m-1gp.com/combi/2.html", "ビー"),
      prelim("https://www.m-1gp.com/combi/5.html", "未登録"),
      prelim(URL_A, "エー", { stage: "3回戦", venue: "会場Y" }),
    ],
  }
  const db = mergeM1Prelims(base, dump)
  expect(db.competitionResults.map((r) => [r.entrant_id, r.stage])).toEqual([
    ["g:a", "2回戦"],
    ["g:b", "2回戦"],
    ["g:a", "3回戦"],
  ])
  const peers = prelimPeers(db, dump)
  expect(peers("g:a").map((p) => [p.prelim.stage, p.ids])).toEqual([
    ["3回戦", []],
    ["2回戦", ["g:b"]],
  ])
  expect(stageRank("3回戦")).toBeGreaterThan(stageRank("2回戦"))
})
