import type {
  CompetitionResult,
  Db,
  Group,
  Membership,
  Person,
  Relationship,
} from "@/lib/types"

// 初期データ。広く知られた公開情報を要約して登録したもので、
// 出典との照合（checked_at / last_verified_at）は未実施。照合したら日付を入れる。

const person = (
  id: string,
  name: string,
  reading: string,
  rest: Partial<Person> = {}
): Person => ({
  id,
  name,
  reading,
  aliases: [],
  agency_id: null,
  debut_date: null,
  birth_date: null,
  training_school: null,
  training_school_term: null,
  biography: null,
  activity_status: null,
  source_ids: ["wiki"],
  ...rest,
})

const group = (
  id: string,
  name: string,
  reading: string,
  rest: Partial<Group> = {}
): Group => ({
  id,
  name,
  reading,
  aliases: [],
  group_type: "combi",
  formation_date: null,
  dissolution_date: null,
  agency_id: null,
  activity_status: null,
  source_ids: ["wiki"],
  ...rest,
})

const member = (
  person_id: string,
  group_id: string,
  rest: Partial<Membership> = {}
): Membership => ({
  person_id,
  group_id,
  role: null,
  start_date: null,
  end_date: null,
  status: "current",
  ...rest,
})

const rel = (
  id: string,
  source_person_id: string,
  target_person_id: string,
  relationship_type: Relationship["relationship_type"],
  description: string,
  rest: Partial<Relationship> = {}
): Relationship => ({
  id,
  source_person_id,
  target_person_id,
  relationship_type,
  description,
  start_date: null,
  end_date: null,
  evidence_type: "encyclopedia",
  confidence: "high",
  source_ids: ["wiki"],
  last_verified_at: null,
  ...rest,
})

const result = (
  competition_name: string,
  year: number,
  group_id: string,
  rank: number | null
): CompetitionResult => ({
  id: `${competition_name}-${year}-${group_id}`,
  competition_name,
  year,
  group_id,
  stage: "決勝",
  rank,
  score: null,
  source_ids: competition_name === "M-1グランプリ" ? ["m1"] : ["wiki"],
})

const NSC_OSAKA = "NSC大阪"

export const db: Db = {
  sources: [
    {
      id: "wiki",
      source_name: "Wikipedia日本語版（二次情報）",
      source_url: "https://ja.wikipedia.org/",
      source_type: "encyclopedia",
      published_at: null,
      checked_at: null,
      notes: "個別記事および一次情報での確認が必要",
    },
    {
      id: "m1",
      source_name: "M-1グランプリ公式サイト",
      source_url: "https://www.m-1.gr.jp/",
      source_type: "competition_official",
      published_at: null,
      checked_at: null,
    },
    {
      id: "yoshimoto",
      source_name: "吉本興業 公式サイト",
      source_url: "https://www.yoshimoto.co.jp/",
      source_type: "official",
      published_at: null,
      checked_at: null,
    },
    {
      id: "ohtapro",
      source_name: "太田プロダクション 公式サイト",
      source_url: "https://www.ohtapro.co.jp/",
      source_type: "official",
      published_at: null,
      checked_at: null,
    },
    {
      id: "titan",
      source_name: "タイタン 公式サイト",
      source_url: "https://www.titan-net.co.jp/",
      source_type: "official",
      published_at: null,
      checked_at: null,
    },
  ],
  agencies: [
    { id: "yoshimoto", name: "吉本興業" },
    { id: "ohtapro", name: "太田プロダクション" },
    { id: "titan", name: "タイタン" },
    { id: "tngon", name: "T.Nゴン" },
    { id: "grape", name: "グレープカンパニー" },
    { id: "kdash", name: "ケイダッシュステージ" },
    { id: "maseki", name: "マセキ芸能社" },
    { id: "jinrikisha", name: "プロダクション人力舎" },
  ],
  people: [
    // NSC大阪1期
    person("matsumoto", "松本人志", "まつもと ひとし", {
      agency_id: "yoshimoto",
      debut_date: "1982",
      training_school: NSC_OSAKA,
      training_school_term: 1,
      source_ids: ["wiki", "yoshimoto"],
    }),
    person("hamada", "浜田雅功", "はまだ まさとし", {
      agency_id: "yoshimoto",
      debut_date: "1982",
      training_school: NSC_OSAKA,
      training_school_term: 1,
      source_ids: ["wiki", "yoshimoto"],
    }),
    person("tomizu-masa", "トミーズ雅", "とみーず まさ", {
      agency_id: "yoshimoto",
      training_school: NSC_OSAKA,
      training_school_term: 1,
    }),
    person("tomizu-ken", "トミーズ健", "とみーず けん", {
      agency_id: "yoshimoto",
      training_school: NSC_OSAKA,
      training_school_term: 1,
    }),
    person("ringo", "ハイヒール・リンゴ", "はいひーる りんご", {
      agency_id: "yoshimoto",
      training_school: NSC_OSAKA,
      training_school_term: 1,
    }),
    person("momoko", "ハイヒール・モモコ", "はいひーる ももこ", {
      agency_id: "yoshimoto",
      training_school: NSC_OSAKA,
      training_school_term: 1,
    }),
    // 上方の師弟
    person("matsunosuke", "笑福亭松之助", "しょうふくてい まつのすけ", {
      activity_status: "deceased",
      biography: "上方落語家。明石家さんまの師匠。",
    }),
    person("sanma", "明石家さんま", "あかしや さんま", {
      agency_id: "yoshimoto",
      debut_date: "1974",
      biography: "笑福亭松之助に弟子入りして芸能活動を始める。",
    }),
    person("kyojin", "オール巨人", "おーる きょじん", {
      agency_id: "yoshimoto",
    }),
    person("hanshin", "オール阪神", "おーる はんしん", {
      agency_id: "yoshimoto",
    }),
    // 浅草・たけし一門
    person("fukami", "深見千三郎", "ふかみ せんざぶろう", {
      activity_status: "deceased",
      biography: "浅草フランス座で活動した芸人。ビートたけしの師匠。",
    }),
    person("takeshi", "ビートたけし", "びーと たけし", {
      aliases: ["北野武"],
      agency_id: "tngon",
    }),
    person("kiyoshi", "ビートきよし", "びーと きよし"),
    person("higashi", "そのまんま東", "そのまんま ひがし", {
      aliases: ["東国原英夫"],
    }),
    person("hakase", "水道橋博士", "すいどうばし はかせ"),
    person("tamabukuro", "玉袋筋太郎", "たまぶくろ すじたろう"),
    // 東京
    person("ota", "太田光", "おおた ひかり", {
      agency_id: "titan",
      source_ids: ["wiki", "titan"],
    }),
    person("tanaka", "田中裕二", "たなか ゆうじ", {
      agency_id: "titan",
      source_ids: ["wiki", "titan"],
    }),
    person("ariyoshi", "有吉弘行", "ありよし ひろいき", {
      agency_id: "ohtapro",
      source_ids: ["wiki", "ohtapro"],
    }),
    person("moriwaki", "森脇和成", "もりわき かずなり"),
    person("date", "伊達みきお", "だて みきお", { agency_id: "grape" }),
    person("tomizawa", "富澤たけし", "とみざわ たけし", { agency_id: "grape" }),
    person("wakabayashi", "若林正恭", "わかばやし まさやす", {
      agency_id: "kdash",
    }),
    person("kasuga", "春日俊彰", "かすが としあき", { agency_id: "kdash" }),
    person("hanawa", "塙宣之", "はなわ のぶゆき", { agency_id: "maseki" }),
    person("tsuchiya", "土屋伸之", "つちや のぶゆき", { agency_id: "maseki" }),
    person("ishida", "石田明", "いしだ あきら", { agency_id: "yoshimoto" }),
    person("inoue", "井上裕介", "いのうえ ゆうすけ", {
      agency_id: "yoshimoto",
    }),
    person("tsuyoshi", "中川剛", "なかがわ つよし", {
      aliases: ["中川家 剛"],
      agency_id: "yoshimoto",
    }),
    person("reiji", "中川礼二", "なかがわ れいじ", {
      aliases: ["中川家 礼二"],
      agency_id: "yoshimoto",
    }),
    person("seiya", "せいや", "せいや", { agency_id: "yoshimoto" }),
    person("soshina", "粗品", "そしな", { agency_id: "yoshimoto" }),
    person("iizuka", "飯塚悟志", "いいづか さとし", {
      agency_id: "jinrikisha",
    }),
    person("toyomoto", "豊本明長", "とよもと あきなが", {
      agency_id: "jinrikisha",
    }),
    person("kakuta", "角田晃広", "かくた あきひろ", {
      agency_id: "jinrikisha",
    }),
  ],
  groups: [
    group("downtown", "ダウンタウン", "だうんたうん", {
      formation_date: "1982",
      agency_id: "yoshimoto",
      source_ids: ["wiki", "yoshimoto"],
    }),
    group("tomizu", "トミーズ", "とみーず", { agency_id: "yoshimoto" }),
    group("highheel", "ハイヒール", "はいひーる", { agency_id: "yoshimoto" }),
    group("allhanshinkyojin", "オール阪神・巨人", "おーるはんしんきょじん", {
      formation_date: "1975",
      agency_id: "yoshimoto",
    }),
    group("twobeat", "ツービート", "つーびーと"),
    group("asakusakid", "浅草キッド", "あさくさきっど", {
      formation_date: "1987",
    }),
    group("bakumon", "爆笑問題", "ばくしょうもんだい", {
      formation_date: "1988",
      agency_id: "titan",
      source_ids: ["wiki", "titan"],
    }),
    group("saruganseki", "猿岩石", "さるがんせき", {
      formation_date: "1994",
      dissolution_date: "2004",
      activity_status: "disbanded",
    }),
    group("sandwichman", "サンドウィッチマン", "さんどうぃっちまん", {
      formation_date: "1998",
      agency_id: "grape",
    }),
    group("audrey", "オードリー", "おーどりー", {
      aliases: ["ナイスミドル"],
      formation_date: "2000",
      agency_id: "kdash",
    }),
    group("knights", "ナイツ", "ないつ", { agency_id: "maseki" }),
    group("nonstyle", "NON STYLE", "のんすたいる", {
      formation_date: "2000",
      agency_id: "yoshimoto",
    }),
    group("nakagawake", "中川家", "なかがわけ", {
      formation_date: "1992",
      agency_id: "yoshimoto",
    }),
    group("shimofuri", "霜降り明星", "しもふりみょうじょう", {
      formation_date: "2013",
      agency_id: "yoshimoto",
    }),
    group("wagyu", "和牛", "わぎゅう", { agency_id: "yoshimoto" }),
    group("tokyo03", "東京03", "とうきょうぜろさん", {
      group_type: "trio",
      formation_date: "2003",
      agency_id: "jinrikisha",
    }),
    group("alfalfa", "アルファルファ", "あるふぁるふぁ", {
      dissolution_date: "2003",
      activity_status: "disbanded",
    }),
    group("plusdriver", "プラスドライバー", "ぷらすどらいばー", {
      activity_status: "disbanded",
    }),
  ],
  memberships: [
    member("matsumoto", "downtown"),
    member("hamada", "downtown"),
    member("tomizu-masa", "tomizu"),
    member("tomizu-ken", "tomizu"),
    member("ringo", "highheel"),
    member("momoko", "highheel"),
    member("hanshin", "allhanshinkyojin"),
    member("kyojin", "allhanshinkyojin"),
    member("takeshi", "twobeat"),
    member("kiyoshi", "twobeat"),
    member("hakase", "asakusakid"),
    member("tamabukuro", "asakusakid"),
    member("ota", "bakumon"),
    member("tanaka", "bakumon"),
    member("ariyoshi", "saruganseki", { end_date: "2004", status: "former" }),
    member("moriwaki", "saruganseki", { end_date: "2004", status: "former" }),
    member("date", "sandwichman"),
    member("tomizawa", "sandwichman"),
    member("wakabayashi", "audrey"),
    member("kasuga", "audrey"),
    member("hanawa", "knights"),
    member("tsuchiya", "knights"),
    member("ishida", "nonstyle"),
    member("inoue", "nonstyle"),
    member("tsuyoshi", "nakagawake"),
    member("reiji", "nakagawake"),
    member("seiya", "shimofuri"),
    member("soshina", "shimofuri"),
    member("iizuka", "tokyo03", { start_date: "2003" }),
    member("toyomoto", "tokyo03", { start_date: "2003" }),
    member("kakuta", "tokyo03", { start_date: "2003" }),
    member("iizuka", "alfalfa", { end_date: "2003", status: "former" }),
    member("toyomoto", "alfalfa", { end_date: "2003", status: "former" }),
    member("kakuta", "plusdriver", { status: "former" }),
  ],
  relationships: [
    rel(
      "r-matsunosuke-sanma",
      "matsunosuke",
      "sanma",
      "master",
      "明石家さんまが笑福亭松之助に弟子入り。",
      {
        start_date: "1974",
      }
    ),
    rel(
      "r-fukami-takeshi",
      "fukami",
      "takeshi",
      "master",
      "浅草フランス座で深見千三郎に師事。"
    ),
    rel(
      "r-takeshi-hakase",
      "takeshi",
      "hakase",
      "master",
      "ビートたけしに弟子入り（たけし軍団）。"
    ),
    rel(
      "r-takeshi-tamabukuro",
      "takeshi",
      "tamabukuro",
      "master",
      "ビートたけしに弟子入り（たけし軍団）。"
    ),
    rel(
      "r-takeshi-higashi",
      "takeshi",
      "higashi",
      "master",
      "ビートたけしに弟子入り（たけし軍団）。"
    ),
    rel(
      "r-kyojin-ariyoshi",
      "kyojin",
      "ariyoshi",
      "master",
      "猿岩石結成前にオール巨人へ弟子入りしていた。",
      {
        confidence: "medium",
        end_date: "1994",
      }
    ),
    rel(
      "r-tsuyoshi-reiji",
      "tsuyoshi",
      "reiji",
      "family",
      "実の兄弟（剛が兄、礼二が弟）。"
    ),
    rel(
      "r-sanma-takeshi",
      "sanma",
      "takeshi",
      "costar",
      "フジテレビ『オレたちひょうきん族』でレギュラー共演。",
      {
        evidence_type: "broadcast_record",
        start_date: "1981",
        end_date: "1989",
      }
    ),
  ],
  competitionResults: [
    result("M-1グランプリ", 2001, "nakagawake", 1),
    result("M-1グランプリ", 2007, "sandwichman", 1),
    result("M-1グランプリ", 2008, "nonstyle", 1),
    result("M-1グランプリ", 2008, "audrey", 2),
    result("M-1グランプリ", 2008, "knights", 3),
    result("M-1グランプリ", 2016, "wagyu", 2),
    result("M-1グランプリ", 2017, "wagyu", 2),
    result("M-1グランプリ", 2018, "shimofuri", 1),
    result("M-1グランプリ", 2018, "wagyu", 2),
    result("キングオブコント", 2009, "tokyo03", 1),
  ],
}
