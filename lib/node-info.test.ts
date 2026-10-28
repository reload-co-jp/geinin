import { expect, test } from "vitest"
import {
  relationSummary,
  verifyState,
  type LinkInfo,
  type NodeInfo,
} from "@/lib/node-info"

test("出典照合日があれば確度によらず確認済み、なければ確度低は推定", () => {
  expect(verifyState("low", "2026-10-01")).toBe("確認済み")
  expect(verifyState("low", null)).toBe("推定")
  expect(verifyState("high", null)).toBe("未確認")
})

test("関係の要約文は照合済みだけ言い切り、未照合は「とされる」", () => {
  const link = (label: string, otherName: string, verified: boolean) =>
    ({
      label,
      otherName,
      confidence: "high",
      rel: { last_verified_at: verified ? "2026-10-01" : null },
    }) as LinkInfo
  const info = {
    links: [
      link("師匠", "A", true),
      link("弟子", "B", true),
      link("弟子", "C", false),
      link("同期生", "D", true),
    ],
  } as NodeInfo
  expect(relationSummary(info)).toBe("Aの弟子。弟子はB。弟子はCとされる。")
})
