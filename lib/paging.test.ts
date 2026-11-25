import { expect, test } from "vitest"
import {
  extraPages,
  pageCount,
  pageHref,
  pageSlice,
  pageTitle,
  validPage,
} from "@/lib/paging"

test("ページ分け", () => {
  expect(pageCount(0, 10)).toBe(1)
  expect(pageCount(21, 10)).toBe(3)
  expect(pageSlice([1, 2, 3, 4, 5], 2, 3)).toEqual([5])
  expect(pageHref("/list/a/", 1)).toBe("/list/a/")
  expect(pageHref("/list/a/", 2)).toBe("/list/a/page/2/")
  expect(pageTitle("一覧", 1)).toBe("一覧")
  expect(pageTitle("一覧", 3)).toBe("一覧（3ページ目）")
  expect(extraPages(21, 10)).toEqual([2, 3])
  expect(extraPages(5, 10)).toEqual([])
  expect(validPage("2", 21, 10)).toBe(2)
  expect(validPage("1", 21, 10)).toBeNull()
  expect(validPage("4", 21, 10)).toBeNull()
  expect(validPage("02", 21, 10)).toBeNull()
})
