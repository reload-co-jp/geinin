import { expect, test } from "vitest"
import { verifyState } from "@/lib/node-info"

test("出典照合日があれば確度によらず確認済み、なければ確度低は推定", () => {
  expect(verifyState("low", "2026-10-01")).toBe("確認済み")
  expect(verifyState("low", null)).toBe("推定")
  expect(verifyState("high", null)).toBe("未確認")
})
