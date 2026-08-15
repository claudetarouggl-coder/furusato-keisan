"use strict";
// 楽天アフィリエイト（専用楽天アカウント、2026-08-15）
// 楽天市場の検索リンクはリンクID固定・pc=パラメータ差し替えで構築可能（curlで302遷移を検証済み、KNOWLEDGE.md参照）
const LINK_ID = "56939e6e.b614e71e.56939e6f.e56659e4";
const UT = "eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9";

function searchLink(keyword) {
  const pc = encodeURIComponent(`https://search.rakuten.co.jp/search/mall/${keyword}/`);
  return `https://hb.afl.rakuten.co.jp/hgc/${LINK_ID}/?pc=${pc}&link_type=text&ut=${UT}`;
}

// 楽天ふるさと納税の人気ジャンル
const GOODS = [
  { label: "肉（牛肉・豚肉・鶏肉）", keyword: "ふるさと納税 肉", note: "還元率・満足度の定番ジャンル" },
  { label: "米・無洗米", keyword: "ふるさと納税 米", note: "日常使いで確実に消費できる" },
  { label: "うなぎ", keyword: "ふるさと納税 うなぎ", note: "自分では買いにくいご褒美枠" },
  { label: "ホタテ・海鮮", keyword: "ふるさと納税 ホタテ", note: "冷凍で小分け、使い勝手が良い" },
  { label: "ティッシュ・日用品", keyword: "ふるさと納税 ティッシュ", note: "かさばる消耗品は送料込みが強い" },
  { label: "フルーツ", keyword: "ふるさと納税 フルーツ", note: "旬の時期に届く定期便も人気" },
].map(g => ({ ...g, url: searchLink(g.keyword) }));

module.exports = { GOODS, searchLink };
