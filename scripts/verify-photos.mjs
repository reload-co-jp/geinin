import { db } from "../data/db.ts"

const peopleWithPhoto = db.people.filter((p) => p.photo_url).length
const groupsWithPhoto = db.groups.filter((g) => g.photo_url).length
const totalPeople = db.people.length
const totalGroups = db.groups.length

console.log("=== マージ後の DB 状態 ===")
console.log(`人: photo_url 付き ${peopleWithPhoto} / ${totalPeople}`)
console.log(`グループ: photo_url 付き ${groupsWithPhoto} / ${totalGroups}`)
console.log(`合計: ${peopleWithPhoto + groupsWithPhoto} / ${totalPeople + totalGroups}`)
console.log("")
console.log("--- photo_url サンプル (先頭5件) ---")
for (const p of db.people.filter((p) => p.photo_url).slice(0, 5)) {
  console.log(`  ${p.name}: ${p.photo_url}`)
}
for (const g of db.groups.filter((g) => g.photo_url).slice(0, 5)) {
  console.log(`  ${g.name}: ${g.photo_url}`)
}
