import Link from "next/link"
import { FC } from "react"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"
import { Photo } from "@/components/photo"
import { CONFIDENCE_LABEL, db, graph, personById } from "@/lib/db"
import { EVIDENCE_LABEL } from "@/lib/node-info"
import type { Relationship } from "@/lib/types"

// 師弟関係の一覧と系譜。登録された師弟関係（relationship_type === "master"）だけを使い、
// 事務所の先輩・後輩や共演は含めない。師匠のいない師匠を起点に、弟子・孫弟子を入れ子で並べる

const rels = db.relationships.filter(
  (r) =>
    r.relationship_type === "master" &&
    personById.has(r.source_person_id) &&
    personById.has(r.target_person_id)
)
const pupilsOf = Map.groupBy(rels, (r) => r.source_person_id)
const hasMaster = new Set(rels.map((r) => r.target_person_id))
// 系譜の起点。弟子が多い順
const roots = [...pupilsOf.keys()]
  .filter((id) => !hasMaster.has(id))
  .toSorted(
    (a, b) =>
      (pupilsOf.get(b)?.length ?? 0) - (pupilsOf.get(a)?.length ?? 0) ||
      personById.get(a)!.name.localeCompare(personById.get(b)!.name, "ja")
  )
const masters = new Set(rels.map((r) => r.source_person_id))
const people = new Set([...masters, ...hasMaster])

export const metadata = {
  title: `芸人の師弟関係一覧｜師匠と弟子の系譜（${rels.length}組）`,
  description: `お笑い芸人の師匠と弟子の関係${rels.length}組を系譜でまとめた一覧。${roots
    .slice(0, 4)
    .map((id) => personById.get(id)!.name)
    .join(
      "・"
    )}などの一門。公式プロフィール・本人の発言・事典などの出典と確度を添えて掲載。`,
  alternates: { canonical: "/shitei/" },
}

const Person: FC<{ id: string }> = ({ id }) => (
  <Link href={`/people/${id}/`} style={{ fontWeight: "bold" }}>
    {personById.get(id)!.name}
  </Link>
)

// 確度中・低は確定情報ではないことを添える
const Note: FC<{ r: Relationship }> = ({ r }) => (
  <small className="sh-note">
    <span
      className="pf-badge"
      data-tone={r.confidence === "high" ? "ok" : "warn"}
    >
      {CONFIDENCE_LABEL[r.confidence]}
    </span>{" "}
    {EVIDENCE_LABEL[r.evidence_type]}
    {r.description && ` ${r.description}`}
  </small>
)

// 弟子を入れ子で並べる。循環した登録があっても止まるよう、たどった人は再訪しない
const Pupils: FC<{ id: string; seen: Set<string> }> = ({ id, seen }) => {
  const rs = (pupilsOf.get(id) ?? []).filter(
    (r) => !seen.has(r.target_person_id)
  )
  if (!rs.length) return null
  const next = new Set([...seen, ...rs.map((r) => r.target_person_id)])
  return (
    <ul className="sh-tree">
      {rs.map((r) => (
        <li key={r.id}>
          <Photo
            src={graph.nodes.get(`p:${r.target_person_id}`)?.photo ?? null}
            size={32}
          />
          <span>
            <Person id={r.target_person_id} />
            <Note r={r} />
            <Pupils id={r.target_person_id} seen={next} />
          </span>
        </li>
      ))}
    </ul>
  )
}

const css = `
.sh-root { margin-top: 1.25rem; padding: .75rem; background: var(--surface); border-bottom: 1px solid var(--line); }
.sh-root h2 { font-size: 1rem; display: flex; gap: .5rem; align-items: center; margin: 0; }
.sh-tree { list-style: none; margin: .5rem 0 0; padding-left: 1rem; border-left: 2px solid var(--line); display: grid; gap: .5rem; }
.sh-tree li { display: flex; gap: .5rem; align-items: flex-start; }
.sh-tree li > span { min-width: 0; overflow-wrap: anywhere; }
.sh-note { display: block; color: var(--muted); font-size: .75rem; }
`

const Page: FC = () => (
  <div className="page">
    <style>{css}</style>
    <Breadcrumbs
      items={[
        ["トップ", "/"],
        ["師弟関係", "/shitei/"],
      ]}
    />
    <h1 className="page-title">
      芸人の師弟関係一覧
      <span style={{ color: "var(--muted)", fontWeight: "normal" }}>
        {" "}
        {rels.length}組
      </span>
    </h1>
    <p className="lead">
      登録されている師匠と弟子の関係（{people.size}
      人）を、師匠から弟子・孫弟子へたどれる系譜にまとめています。弟子入り・師事が出典に書かれている関係だけを載せ、事務所の先輩・後輩や共演は含めません。
      「確度中」は事典の基礎情報などに師匠として挙げられているものの、出典との照合が済んでいない関係で、確定情報ではありません。
    </p>
    <InArticleAd />
    {roots.map((id) => (
      <section key={id} className="sh-root">
        <h2>
          <Photo src={graph.nodes.get(`p:${id}`)?.photo ?? null} size={40} />
          <span>
            <Person id={id} />
            の一門
          </span>
        </h2>
        <Pupils id={id} seen={new Set([id])} />
      </section>
    ))}
  </div>
)

export default Page
