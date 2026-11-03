import { execSync } from "node:child_process"

const FILE = process.argv[2] || "data/agencies.json"
const SCRIPT = process.argv[3] || "scripts/collect-x-photos.mjs"
const LIMIT = parseInt(process.argv[4] || "20", 10)
const MAX_LOOPS = parseInt(process.argv[5] || "40", 10)

let count = 0
while (count < MAX_LOOPS) {
  const before = JSON.parse(
    execSync(`node -e "const a=JSON.parse(require('fs').readFileSync('${FILE}','utf8')); console.log(a.talents.filter(t=>!t.photo).length)"`
  ).toString().trim())
  console.log(`=== Loop ${count + 1}: before=${before} ===`)
  if (before === 0) break

  try {
    execSync(
      `node ${SCRIPT} ${FILE} --limit ${LIMIT}`,
      { stdio: "inherit", timeout: 280000 }
    )
  } catch (e) {
    console.log(`Loop ${count + 1} interrupted (timeout or error)`)
  }

  const after = JSON.parse(
    execSync(`node -e "const a=JSON.parse(require('fs').readFileSync('${FILE}','utf8')); console.log(a.talents.filter(t=>!t.photo).length)"`
  ).toString().trim())
  console.log(`after=${after}`)

  if (before === after) {
    console.log("No progress, stopping.")
    break
  }
  count++
}
console.log("=== All loops done ===")
