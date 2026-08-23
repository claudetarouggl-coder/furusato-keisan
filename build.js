"use strict";
// ふるさと納税 控除上限額シミュレーター 静的サイトジェネレータ
// 生成物: docs/ 以下に index.html + 年収別25ページ + ガイド3ページ + sitemap.xml + 404.html
const fs = require("fs");
const path = require("path");
const { FAMILY, FAMILY_KEYS, furusatoLimit, limitFromTaxable, SOCIAL_RATE } = require("./lib/tax");
const { GOODS, GENRES } = require("./lib/affiliates");

const BASE = "https://claudetarouggl-coder.github.io/furusato-keisan/";
// 姉妹サイト相互リンク（自サイトは除外）
const RELATED_SITES = [
  ["https://claudetarouggl-coder.github.io/kyou-no-taiyo/", "きょうの太陽"],
  ["https://claudetarouggl-coder.github.io/hinode-calendar/", "日の出・日の入りカレンダー"],
  ["https://claudetarouggl-coder.github.io/furusato-keisan/", "ふるさと納税 上限額計算"],
  ["https://claudetarouggl-coder.github.io/nenrei-hayami/", "年齢早見表"],
  ["https://claudetarouggl-coder.github.io/rokuyo-calendar/", "六曜カレンダー"],
  ["https://claudetarouggl-coder.github.io/tester-match/", "テスターマッチ"],
  ["https://claudetarouggl-coder.github.io/houji-hayami/", "法事・回忌早見表"],
  ["https://claudetarouggl-coder.github.io/pet-nenrei/", "犬・猫の年齢換算"],
  ["https://claudetarouggl-coder.github.io/nemuri-keisan/", "睡眠サイクル計算"],
];
const RELATED_NAV = `<p class="related">姉妹サイト: ${RELATED_SITES.filter(([u]) => u !== BASE)
  .map(([u, n]) => `<a href="${u}" rel="noopener">${n}</a>`).join("・")}</p>`;
const GA_ID = "G-XLZ1ENDZ0Q";
const OUT = path.join(__dirname, "docs");

const jstNow = new Date(Date.now() + 540 * 60000);
const TODAY = { y: jstNow.getUTCFullYear(), m: jstNow.getUTCMonth() + 1, d: jstNow.getUTCDate() };
const TODAY_STR = `${TODAY.y}-${String(TODAY.m).padStart(2, "0")}-${String(TODAY.d).padStart(2, "0")}`;

// 年収ラインナップ（万円）: 300〜1000は50刻み、1100〜2000は100刻み
const INCOMES = [];
for (let s = 300; s <= 1000; s += 50) INCOMES.push(s);
for (let s = 1100; s <= 2000; s += 100) INCOMES.push(s);

const yen = n => n.toLocaleString("ja-JP") + "円";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const emittedUrls = [];
const linkTargets = new Set();
const canonical = p => BASE + p;
function rel(depth, target) {
  linkTargets.add(target);
  return target ? "../".repeat(depth) + target : (depth ? "../".repeat(depth) : "./");
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,sans-serif;color:#26332b;background:#f4f8f5;line-height:1.7}
main{max-width:860px;margin:0 auto;padding:1rem}
header.site{background:linear-gradient(135deg,#1d6b4f,#2e9e74);padding:1.2rem 1rem .9rem;text-align:center}
header.site a{color:#fff;text-decoration:none;font-weight:bold;font-size:1.05rem}
h1{font-size:1.35rem;margin:.8rem 0 .3rem}
h2{font-size:1.1rem;margin:1.6rem 0 .5rem;border-left:4px solid #2e9e74;padding-left:.5rem}
nav.bc{font-size:.8rem;color:#6b7a70;margin:.5rem 0}
nav.bc a{color:#1d6b4f}
.sim,.cards,.feature,.faq,.note{background:#fff;border:1px solid #d8e5dc;border-radius:10px;padding:1rem;margin:.8rem 0}
.sim label{display:block;font-size:.85rem;color:#4a5a50;margin:.6rem 0 .2rem}
.sim input,.sim select{font-size:1.1rem;padding:.45rem .6rem;border:1px solid #b9cec0;border-radius:8px;width:100%;max-width:320px;background:#fff}
.sim .result{margin-top:1rem;padding:1rem;background:#eef7f1;border-radius:8px;text-align:center}
.sim .result .vl{font-size:2rem;font-weight:bold;color:#1d6b4f}
.sim .result .lb{font-size:.8rem;color:#4a5a50}
.cards{display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;text-align:center}
.cards .f .lb{font-size:.75rem;color:#6b7a70}
.cards .f .vl{font-size:1.45rem;font-weight:bold;color:#1d6b4f}
.tbl{overflow-x:auto;background:#fff;border:1px solid #d8e5dc;border-radius:10px;margin:.8rem 0}
table{border-collapse:collapse;width:100%;font-size:.85rem;white-space:nowrap}
th,td{padding:.4rem .6rem;text-align:right;border-bottom:1px solid #e8f0ea}
th{background:#eef5f0;font-weight:600;text-align:center}
td:first-child,th:first-child{text-align:left}
.faq dt{font-weight:600;margin-top:.6rem}.faq dd{margin-left:0;color:#4a5a50}
.links{display:flex;flex-wrap:wrap;gap:.5rem;margin:.6rem 0}
.links a{background:#fff;border:1px solid #d8e5dc;border-radius:999px;padding:.3rem .8rem;font-size:.85rem;text-decoration:none;color:#1d6b4f}
a{color:#1d6b4f}
.goods li{margin:.35rem 0 .35rem 1.2em}
footer{margin:2rem 0 1rem;color:#6b7a70;font-size:.75rem;text-align:center;line-height:1.9}
.note{font-size:.85rem;color:#4a5a50}
`.trim();

function shell({ path: pagePath, depth, title, desc, h1, breadcrumbs, body, extraHead = "", extraScript = "" }) {
  const canon = canonical(pagePath);
  emittedUrls.push(canon);
  const gtag = GA_ID ? `
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>` : "";
  const bcJson = breadcrumbs.length ? `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem", position: i + 1, name: b.name, item: canonical(b.path),
    })),
  })}</script>` : "";
  const bcNav = breadcrumbs.length > 1 ? `<nav class="bc">${breadcrumbs.map((b, i) =>
    i === breadcrumbs.length - 1 ? esc(b.name) : `<a href="${rel(depth, b.path)}">${esc(b.name)}</a>`).join(" › ")}</nav>` : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎁</text></svg>">${gtag}
${bcJson}${extraHead}
<style>${CSS}</style>
</head>
<body>
<header class="site"><a href="${rel(depth, "")}">ふるさと納税 上限額かんたん計算</a></header>
<main>
${bcNav}
<h1>${esc(h1)}</h1>
${body}
<footer>
掲載額は給与収入のみ・社会保険料を収入の${(SOCIAL_RATE * 100).toFixed(1)}%とした概算の目安です（千円未満切捨て）。<br>
iDeCo・医療費控除・住宅ローン控除などがある場合は上限が変わります。正確な金額は源泉徴収票をもとに<a href="https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/furusato/mechanism/deduction.html" rel="noopener">総務省の資料</a>やお住まいの自治体でご確認ください。
${RELATED_NAV}
</footer>
</main>
${extraScript}
</body>
</html>`;
}

function writePage(relPath, html) {
  const file = path.join(OUT, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function affiliateBlock() {
  const items = GOODS.map(g =>
    `<li><a href="${esc(g.url)}" rel="sponsored noopener" target="_blank">${esc(g.label)}</a> — ${esc(g.note)}</li>`).join("\n");
  return `<section class="note goods"><h2>楽天ふるさと納税で人気の返礼品ジャンル<small>（広告を含みます）</small></h2>
<p>楽天ふるさと納税は寄付にも楽天ポイントが付き、実質自己負担2,000円がポイントで相殺できるのが強みです。</p>
<ul>${items}</ul></section>`;
}

const assumptionsNote = (withTaxableMode) => `<section class="note"><h2>計算の前提</h2>
<ul style="margin-left:1.2em">
<li>「年収から計算」モードでは、収入は給与のみ（年末調整のみの給与所得者を想定）</li>
<li>社会保険料は給与収入の${(SOCIAL_RATE * 100).toFixed(1)}%で概算</li>
<li>給与所得控除・基礎控除は令和7年度税制改正後の金額で計算</li>
<li>iDeCo・医療費控除・住宅ローン控除・生命保険料控除などは考慮していません（ある場合、実際の上限はこれより下がります）</li>
<li>「高校生」は16〜18歳（一般扶養控除）、「大学生」は19〜22歳（特定扶養控除）を指します。中学生以下のお子さんは扶養控除の対象外のため上限額に影響しません</li>
${withTaxableMode ? `<li>「課税所得から計算」モードでは、入力した住民税の課税所得をそのまま使うため、上記の年収・社会保険料・家族構成に関する前提は適用されません（所得税率のみ課税所得から概算）</li>` : ""}
</ul></section>`;

const guideLinks = depth => `<h2>あわせて読む</h2><div class="links">
<a href="${rel(depth, "guide/nenmatsu/")}">12月駆け込み完全ガイド</a>
<a href="${rel(depth, "guide/rakuten/")}">楽天ふるさと納税のやり方</a>
<a href="${rel(depth, "guide/schedule/")}">ふるさと納税はいつまで？期限まとめ</a>
<a href="${rel(depth, "guide/onestop/")}">ワンストップ特例とは</a>
<a href="${rel(depth, "guide/onestop-online/")}">ワンストップのオンライン申請</a>
<a href="${rel(depth, "guide/kakutei-shinkoku/")}">確定申告のやり方</a>
<a href="${rel(depth, "guide/shikumi/")}">上限額の仕組みと計算式</a>
<a href="${rel(depth, "guide/demerit/")}">デメリット・向かない人</a>
<a href="${rel(depth, "guide/jutaku-loan/")}">住宅ローン控除との併用</a>
<a href="${rel(depth, "guide/ideco/")}">iDeCoとの併用</a></div>`;

// ---- 年収別ページ ----
function buildIncomePage(man, idx) {
  const salary = man * 10000;
  const limits = FAMILY_KEYS.map(k => ({ k, f: FAMILY[k], v: furusatoLimit(salary, k) }));
  const single = limits[0].v, couple = limits[1].v;
  const rows = limits.map(({ f, v }) =>
    `<tr><td>${esc(f.label)}</td><td><strong>${yen(v)}</strong></td><td>${v > 0 ? `約${Math.floor(v / 10000)}万円分` : "—"}</td></tr>`).join("\n");
  const prev = INCOMES[idx - 1], next = INCOMES[idx + 1];
  const nearby = [prev, next].filter(Boolean).map(n =>
    `<a href="${rel(2, `nenshu/${n}/`)}">年収${n}万円の上限額</a>`).join("");

  const body = `
<div class="cards">
<div class="f"><div class="lb">独身または共働き</div><div class="vl">${yen(single)}</div></div>
<div class="f"><div class="lb">夫婦（配偶者を扶養）</div><div class="vl">${yen(couple)}</div></div>
</div>
<section class="feature"><p>年収${man}万円の場合、ふるさと納税の控除上限額の目安は<strong>独身・共働きで${yen(single)}</strong>、配偶者を扶養する夫婦で${yen(couple)}です。この金額までの寄付なら、自己負担は実質2,000円で済み、残りは所得税・住民税から控除されます。家族構成別の目安は下の表のとおりです。</p></section>
<h2>年収${man}万円の家族構成別 上限額目安</h2>
<div class="tbl"><table><thead><tr><th>家族構成</th><th>控除上限額（目安）</th><th>寄付できる額</th></tr></thead><tbody>${rows}</tbody></table></div>
${assumptionsNote(false)}
${affiliateBlock()}
<h2>返礼品をジャンルから探す</h2>
${genreNav(2, null)}
<section class="faq"><h2>よくある質問</h2><dl>
<dt>年収${man}万円で${yen(single)}を超えて寄付したらどうなりますか？</dt><dd>超えた分は控除されず、純粋な自己負担（寄付）になります。上限ぎりぎりを狙うより、少し余裕を持たせるのが安全です。</dd>
<dt>この金額は手取りですか？額面ですか？</dt><dd>額面（税金や社会保険料が引かれる前の年収）です。源泉徴収票の「支払金額」にあたります。</dd>
<dt>医療費控除や住宅ローン控除があると上限は変わりますか？</dt><dd>変わります。課税所得が下がる分、上限額も下がります。該当する方は上の目安より少なめに見積もってください。</dd>
</dl></section>
<h2>近い年収の上限額</h2><div class="links">${nearby}<a href="${rel(2, "")}">全年収の一覧表・シミュレーター</a></div>
${guideLinks(2)}`;

  writePage(`nenshu/${man}/index.html`, shell({
    path: `nenshu/${man}/`, depth: 2,
    title: `年収${man}万円のふるさと納税 上限額はいくら？【目安一覧】`,
    desc: `年収${man}万円のふるさと納税の控除上限額の目安は、独身・共働きで${yen(single)}、夫婦（配偶者を扶養）で${yen(couple)}。共働き＋子ありなど6つの家族構成別に一覧掲載。自己負担2,000円で寄付できる金額がすぐわかります。`,
    h1: `年収${man}万円のふるさと納税 控除上限額`,
    breadcrumbs: [{ name: "ホーム", path: "" }, { name: `年収${man}万円`, path: `nenshu/${man}/` }],
    body,
  }));
}

// ---- ガイドページ ----
function buildGuide(slug, title, descText, h1, bodyHtml) {
  writePage(`guide/${slug}/index.html`, shell({
    path: `guide/${slug}/`, depth: 2,
    title, desc: descText, h1,
    breadcrumbs: [{ name: "ホーム", path: "" }, { name: h1, path: `guide/${slug}/` }],
    body: bodyHtml,
  }));
}

function buildGuides() {
  buildGuide("nenmatsu",
    `【${TODAY.y}年】ふるさと納税 12月駆け込み完全ガイド`,
    `ふるさと納税を12月に駆け込みで済ませる人向けの完全ガイド。上限額の確認から決済完了・ワンストップ特例の申請・確定申告までのタイムラインと、駆け込みでよくある失敗パターンをまとめました。`,
    "12月駆け込み完全ガイド", `
<section class="feature"><p>ふるさと納税は<strong>${TODAY.y}年12月31日までに決済が完了した分</strong>が当年分の寄付として扱われます。12月に入ってから慌てて手続きする「駆け込み」は、上限額の見積もりミスや決済タイミングのミスが起きやすい時期です。まずは<a href="${rel(2, "")}">上限額シミュレーター</a>で今年の目安を確認し、余裕を持ったスケジュールで進めましょう。</p></section>
<h2>12月の駆け込みタイムライン</h2>
<div class="tbl"><table><thead><tr><th>時期</th><th>やること</th></tr></thead><tbody>
<tr><td>〜12月中旬</td><td>上限額の確認・返礼品選び</td></tr>
<tr><td>12月下旬</td><td>決済方法と完了タイミングの確認、申込みを済ませる</td></tr>
<tr><td><strong>12月31日 23:59</strong></td><td>決済完了の期限（これを過ぎると翌年分の寄付になります）</td></tr>
<tr><td>翌年<strong>1月10日必着</strong></td><td>ワンストップ特例の申請書提出</td></tr>
<tr><td>翌年<strong>3月15日頃</strong></td><td>確定申告の期限（ワンストップを使わない・間に合わなかった場合）</td></tr>
</tbody></table></div>
<section class="note"><p>3月15日が土日祝にあたる年は期限が数日ずれることがあります。正確な日付はその年の国税庁の発表でご確認ください。</p></section>
<h2>駆け込みでよくある失敗パターン</h2>
<ul style="margin-left:1.2em">
<li><strong>上限額の見積もりミス</strong> — 前年の年収のまま計算してしまい、今年の上限を超えて寄付してしまうケースです。ボーナスや転職で年収が変わった年は特に注意が必要です。<a href="${rel(2, "")}">シミュレーター</a>で今年の年収に近い金額を入力し、少し控えめに寄付するのが安全とされています。</li>
<li><strong>決済が年をまたぐ</strong> — クレジットカード払いは申込み完了の時点で寄付が確定する場合が多い一方、コンビニ払い・ペイジー・銀行振込などは支払い完了のタイミングが遅れることがあり、年内扱いにならないリスクがあります。年末はクレジットカード決済を選ぶのが確実とされています。</li>
<li><strong>ワンストップ特例の書類の出し忘れ</strong> — 年末にまとめて何件も寄付すると、申請書の管理が追いつかなくなりがちです。届いた申請書はすぐに記入し、翌年1月10日必着で返送しましょう。間に合わなくても確定申告をすれば同じ控除を受けられます。</li>
<li><strong>住所変更の手続き漏れ</strong> — 年末年始に引っ越しをした場合、ワンストップ特例の申請書を提出済みでも「申請事項変更届出書」の提出が別途必要になることがあります。該当する方は寄付先の自治体に確認しましょう。</li>
</ul>
${affiliateBlock()}
<section class="note"><p>今年の上限額がまだ不安な方は、寄付を確定する前にもう一度<a href="${rel(2, "")}">上限額シミュレーター</a>で確認しておくと安心です。上限を超えた分は控除されず自己負担になるため、駆け込みほど慎重な見積もりが大切です。</p></section>
<section class="faq"><h2>よくある質問</h2><dl>
<dt>12月31日に申し込めば必ず間に合いますか？</dt><dd>決済が23:59までに完了すれば当年分として扱われるのが基本ですが、年末はアクセスが集中しやすく、通信エラーなどで決済完了が年を越してしまう可能性もあります。余裕を持って12月中旬までに済ませるのが安全とされています。</dd>
<dt>支払い方法によって扱いは変わりますか？</dt><dd>クレジットカード払いは申込み完了のタイミングで寄付が確定するケースが多い一方、コンビニ払いや銀行振込などは入金確認のタイミングが基準になることがあります。詳しい扱いは寄付先の自治体や利用サイトのヘルプでご確認ください。</dd>
<dt>ワンストップ特例の申請書が1月10日に間に合いませんでした。</dt><dd>その場合でも控除がゼロになるわけではありません。翌年3月15日頃までに確定申告をすれば、同じ内容の控除を受けられます。</dd>
<dt>年末に上限額を計算するとき、何を基準にすればいいですか？</dt><dd>その年（1月〜12月）の収入見込みが基準です。ボーナスの確定額や年末調整前の給与明細を参考にし、金額が確定していない場合は少し控えめに見積もるのが無難とされています。</dd>
<dt>楽天ふるさと納税で12月に申し込む場合の注意点はありますか？</dt><dd>楽天ふるさと納税も他のポータルサイトと同様、12月31日23:59までの決済完了が基準とされています。自治体によっては12月31日より前に受付を締め切ることもあるため、申込み前に返礼品ページの受付期限を確認しておくと安心です。</dd>
</dl></section>
<section class="note"><p>${TODAY.y}年8月時点の情報です。期限や手続きの詳細は年ごとに変更される場合があるため、寄付前に総務省や寄付先自治体、利用するふるさと納税サイトの公式情報を必ずご確認ください。</p></section>
${guideLinks(2)}`);

  buildGuide("schedule",
    `【${TODAY.y}年】ふるさと納税はいつまで？期限と年末スケジュール`,
    `ふるさと納税の期限は12月31日の決済完了分まで。ワンストップ特例の申請書は翌年1月10日必着、確定申告は翌年3月15日まで。年末に慌てないためのスケジュールをまとめました。`,
    "ふるさと納税はいつまで？期限まとめ", `
<section class="feature"><p>${TODAY.y}年分のふるさと納税として控除を受けるには、<strong>${TODAY.y}年12月31日までに決済まで完了</strong>している必要があります。「申し込んだ日」ではなく「決済（支払い）が完了した日」が基準です。年末は自治体側の受付停止や決済の混雑もあるため、余裕を持って12月中旬までに済ませるのが安全です。</p></section>
<h2>期限の一覧</h2>
<div class="tbl"><table><thead><tr><th>手続き</th><th>期限</th></tr></thead><tbody>
<tr><td>寄付（決済完了）</td><td><strong>12月31日 23:59まで</strong></td></tr>
<tr><td>ワンストップ特例の申請書提出</td><td>翌年<strong>1月10日必着</strong></td></tr>
<tr><td>確定申告（ワンストップを使わない場合）</td><td>翌年<strong>3月15日まで</strong></td></tr>
</tbody></table></div>
<h2>年末駆け込みの注意点</h2>
<ul style="margin-left:1.2em">
<li><strong>クレジットカード決済が確実</strong>。銀行振込や納付書払いは自治体の入金確認日が基準になることがあり、年内扱いにならないリスクがあります</li>
<li>12月31日は寄付サイトが混雑します。エラーで年を越すと翌年分の寄付になります</li>
<li>ワンストップ特例の申請書は寄付のたびに必要です。年末の寄付は申請書の到着→返送が1月10日に間に合わない場合、オンライン申請対応の自治体を選ぶか確定申告に切り替えます</li>
<li>上限額はその年の1月〜12月の収入で決まります。年収が確定していない時点では少し控えめに寄付するのが安全です</li>
</ul>
${affiliateBlock()}
<section class="faq"><h2>よくある質問</h2><dl>
<dt>12月31日に申し込めば間に合いますか？</dt><dd>クレジットカード決済が当日中に完了すれば間に合います。ただし混雑やエラーのリスクがあるため、余裕を持つことをおすすめします。</dd>
<dt>ワンストップの申請書が1月10日に間に合いませんでした。</dt><dd>控除が受けられなくなるわけではありません。確定申告（翌年3月15日まで）をすれば同じ控除を受けられます。</dd>
<dt>今年の上限額がまだわかりません。</dt><dd>昨年の源泉徴収票の支払金額をもとに<a href="${rel(2, "")}">シミュレーター</a>で目安を出し、少し控えめに寄付するのが定石です。</dd>
</dl></section>
${guideLinks(2)}`);

  buildGuide("onestop",
    "ワンストップ特例とは？条件・申請方法・確定申告との違い",
    `ふるさと納税のワンストップ特例は、確定申告なしで控除が受けられる制度。条件は「寄付先が5自治体以内」「もともと確定申告が不要な給与所得者」。申請書の書き方と期限、確定申告との違いを解説します。`,
    "ワンストップ特例とは", `
<section class="feature"><p>ワンストップ特例は、<strong>確定申告をしなくても</strong>ふるさと納税の控除が受けられる制度です。寄付のたびに申請書を寄付先の自治体へ送るだけで、翌年度の住民税から全額控除されます。年末調整だけで税金の手続きが終わる会社員のための仕組みです。</p></section>
<h2>使える条件（2つとも必要）</h2>
<ul style="margin-left:1.2em">
<li>1年間の寄付先が<strong>5自治体以内</strong>（同じ自治体への複数回の寄付は1自治体と数えます）</li>
<li>もともと確定申告が不要な給与所得者（年収2,000万円以下・副業所得20万円以下など）</li>
</ul>
<h2>申請の流れ</h2>
<div class="tbl"><table><thead><tr><th>ステップ</th><th>内容</th></tr></thead><tbody>
<tr><td>1. 寄付時</td><td>申込フォームで「ワンストップ特例を利用する」にチェック</td></tr>
<tr><td>2. 書類到着</td><td>自治体から申請書（寄附金税額控除に係る申告特例申請書）が届く</td></tr>
<tr><td>3. 返送</td><td>マイナンバー確認書類の写しを添えて<strong>翌年1月10日必着</strong>で返送。オンライン申請対応の自治体ならスマホで完結</td></tr>
<tr><td>4. 控除</td><td>翌年6月からの住民税が自動的に安くなる（決定通知書で確認可能）</td></tr>
</tbody></table></div>
<h2>確定申告との違い</h2>
<div class="tbl"><table><thead><tr><th></th><th>ワンストップ特例</th><th>確定申告</th></tr></thead><tbody>
<tr><td>控除先</td><td>住民税のみ</td><td>所得税＋住民税</td></tr>
<tr><td>控除の合計額</td><td colspan="2" style="text-align:center">同じ</td></tr>
<tr><td>手続き</td><td>寄付ごとに申請書</td><td>年1回まとめて</td></tr>
<tr><td>医療費控除等との併用</td><td>不可（確定申告すると無効）</td><td>可</td></tr>
</tbody></table></div>
<section class="faq"><h2>よくある質問</h2><dl>
<dt>ワンストップを申請した後に確定申告が必要になりました。</dt><dd>ワンストップの申請は<strong>すべて無効</strong>になります。確定申告書にふるさと納税（寄附金控除）を必ず記載し直してください。記載を忘れると控除がゼロになります。</dd>
<dt>6自治体以上に寄付してしまいました。</dt><dd>ワンストップは使えません。確定申告をすれば全額分の控除を受けられます。</dd>
<dt>控除されたかどうかはどこで確認できますか？</dt><dd>翌年6月ごろに届く住民税決定通知書の「寄附金税額控除」欄で確認できます。</dd>
</dl></section>
${affiliateBlock()}
${guideLinks(2)}`);

  buildGuide("onestop-online",
    "ワンストップ特例のオンライン申請のやり方｜郵送不要でスマホ完結",
    `ワンストップ特例は、マイナンバーカードがあれば紙の申請書を郵送せずスマホだけで申請できる自治体が増えています。必要なもの、申請の流れ、注意点をまとめました。`,
    "ワンストップ特例のオンライン申請", `
<section class="feature"><p>多くの自治体で、紙の申請書を郵送せずスマホだけでワンストップ特例を申請できるようになりました。マイナンバーカードが必須です。</p></section>
<h2>必要なもの</h2>
<ul style="margin-left:1.2em">
<li>マイナンバーカード（署名用電子証明書のパスワード＝英数字6〜16桁が有効なもの）</li>
<li>マイナンバーカード読み取り対応スマホ</li>
<li>寄付時の受付番号やメール</li>
</ul>
<h2>代表的なオンライン申請サービス</h2>
<div class="tbl"><table><thead><tr><th>主なサービス</th><th>備考</th></tr></thead><tbody>
<tr><td>自治体マイページ</td><td>寄付履歴の確認と申請をまとめて行えるタイプ</td></tr>
<tr><td>IAM（アイアム）</td><td>スマホアプリでマイナンバーカードを読み取って申請</td></tr>
<tr><td>e-NISC</td><td>対応自治体の申請フォームへ直接アクセスして申請</td></tr>
</tbody></table></div>
<p>寄付先自治体がどれに対応しているかは、寄付後の案内メールや自治体サイトで確認してください。</p>
<h2>申請の流れ</h2>
<ul style="margin-left:1.2em">
<li>対応サービスにアクセス</li>
<li>寄付情報の確認（受付番号など）</li>
<li>マイナンバーカードをスマホで読み取り</li>
<li>署名用パスワード入力</li>
<li>完了（申請書の郵送不要）</li>
</ul>
<h2>注意点</h2>
<ul style="margin-left:1.2em">
<li>期限は紙と同じ翌年1月10日</li>
<li>署名用パスワードを5回間違えるとロックされ市区町村窓口で再設定</li>
<li>対応していない自治体は従来どおり郵送</li>
<li>引っ越したら翌年1月10日までに変更届（オンライン申請済みでも住所変更は要手続き）</li>
</ul>
<section class="faq"><h2>よくある質問</h2><dl>
<dt>全部の自治体でオンライン申請できますか？</dt><dd>できません。対応状況は自治体ごとに確認してください。</dd>
<dt>マイナンバーカードがない場合は？</dt><dd>従来の紙の申請書＋本人確認書類の写しで郵送してください。</dd>
<dt>オンライン申請したか忘れました。</dt><dd>各サービスのマイページで申請履歴を確認できます。</dd>
</dl></section>
${guideLinks(2)}`);

  buildGuide("kakutei-shinkoku",
    "ふるさと納税の確定申告のやり方【いつ・必要書類・e-Tax】",
    "ふるさと納税で確定申告が必要なのはどんな人か、いつ・何を準備すればいいかを解説。寄附金受領証明書（電子データ可）や源泉徴収票などの必要書類、e-Taxでの申告手順、ワンストップ特例との違いをまとめました。",
    "ふるさと納税の確定申告のやり方", `
<section class="feature"><p>ふるさと納税の控除は、<a href="${rel(2, "guide/onestop/")}">ワンストップ特例</a>を使わない（使えない）場合、確定申告で申告します。ここでは確定申告が必要になる人の条件、申告の時期、必要書類、e-Taxでの申告の流れを順番に解説します。</p></section>
<h2>確定申告が必要な人</h2>
<ul style="margin-left:1.2em">
<li><strong>1年間の寄付先が6自治体以上</strong>ある人（ワンストップ特例は5自治体以内が条件のため使えません）</li>
<li>ワンストップ特例の<strong>申請書を出し忘れた・翌年1月10日必着に間に合わなかった</strong>人</li>
<li><strong>医療費控除や住宅ローン控除の初年度</strong>など、そもそも確定申告をする給与所得者</li>
</ul>
<section class="note"><p>3つ目のケースが最大の落とし穴です。医療費控除などのために確定申告をする場合、<strong>ワンストップ特例の申請書をすでに提出していてもその申請は自動的に無効になり</strong>、確定申告書の寄附金控除欄に<strong>その年の寄付を全件含め直す</strong>必要があります。書き忘れると、ワンストップ特例分も含めて控除がゼロになります。詳しくは<a href="${rel(2, "guide/onestop/")}">ワンストップ特例とは</a>もあわせてご確認ください。</p></section>
<h2>申告の時期</h2>
<div class="tbl"><table><thead><tr><th>ケース</th><th>期間</th></tr></thead><tbody>
<tr><td>通常の確定申告（事業所得がある人・納税額がある人など）</td><td>原則、寄付をした年の<strong>翌年2月16日〜3月15日</strong></td></tr>
<tr><td>還付申告のみ（給与所得者がふるさと納税や医療費控除の還付だけを受ける場合）</td><td>2月16日を待たず、<strong>翌年1月1日から5年間</strong>いつでも提出可能</td></tr>
</tbody></table></div>
<section class="note"><p>3月15日が土日祝にあたる年は期限が数日ずれることがあります。正確な日付はその年の<a href="https://www.nta.go.jp/taxes/shiraberu/shinkoku/tokushu/index.htm" rel="noopener">国税庁の確定申告特集ページ</a>でご確認ください。すでに申告書を提出していて寄附金控除の記載を忘れたことに後から気づいた場合は、5年以内の「更正の請求」で訂正できます。</p></section>
<h2>必要書類</h2>
<div class="tbl"><table><thead><tr><th>書類</th><th>入手方法</th></tr></thead><tbody>
<tr><td>寄附金受領証明書、または寄附金控除に関する証明書（電子データ）</td><td>寄付先自治体から郵送されるか、利用したふるさと納税サイトのマイページからXML形式でダウンロード（楽天ふるさと納税など多くのサイトが対応）</td></tr>
<tr><td>源泉徴収票</td><td>勤務先から発行。e-Taxならスマホのカメラで読み取って入力することも可能</td></tr>
<tr><td>マイナンバーが分かるもの</td><td>マイナンバーカードなど</td></tr>
<tr><td>還付金の受取口座</td><td>申告者本人名義の口座番号</td></tr>
</tbody></table></div>
<section class="note"><p>電子データ（XML形式）の証明書はそのまま印刷しても書類としては使えません。書面で提出する場合は国税庁の「QRコード付証明書等作成システム」で読み込んで印刷するか、e-Taxで電子データのまま添付・送信します。紙の証明書（原本）が届いている場合は、それを添付すれば電子データは不要です。</p></section>
<h2>e-Taxで申告する流れ</h2>
<div class="tbl"><table><thead><tr><th>ステップ</th><th>内容</th></tr></thead><tbody>
<tr><td>1. 準備</td><td>マイナンバーカードと、利用者証明用電子証明書のパスワード（数字4桁）を用意。マイナンバーカード読み取り対応のスマホがあると手続きが早い</td></tr>
<tr><td>2. アクセス</td><td>国税庁「<a href="https://www.keisan.nta.go.jp/kyoutu/ky/sm/top" rel="noopener">確定申告書等作成コーナー</a>」にスマホまたはPCでアクセスし、マイナンバーカードでログイン</td></tr>
<tr><td>3. 収入の入力</td><td>源泉徴収票をカメラで読み取るか、金額を手入力</td></tr>
<tr><td>4. 寄附金控除の入力</td><td>「寄附金控除」の欄で「ふるさと納税（都道府県、市区町村に対する寄附金）」を選択。証明書のXMLデータを読み込めば金額が自動反映される</td></tr>
<tr><td>5. 還付先口座の入力</td><td>還付金を受け取る本人名義の口座を入力</td></tr>
<tr><td>6. 送信</td><td>e-Taxで送信すれば完了。書面提出を選ぶ場合は印刷して証明書を添付し税務署へ郵送・持参</td></tr>
</tbody></table></div>
<h2>ワンストップ特例と確定申告、控除される税金の違い</h2>
<p><a href="${rel(2, "guide/onestop/")}">ワンストップ特例</a>は控除の全額が翌年度の<strong>住民税</strong>から差し引かれるのに対し、確定申告では控除が2つに分かれます。（寄付額－2,000円）のうち所得税率に応じた分は<strong>所得税から還付</strong>され（申告から1〜2ヶ月ほどで指定口座に振り込み）、残りは翌年度の<strong>住民税から減額</strong>されます。振込か減額かの違いだけで、<strong>控除の合計額はどちらの方法でもほぼ同じ</strong>になるよう制度上設計されています。仕組みの詳細は<a href="${rel(2, "guide/shikumi/")}">上限額の仕組みと計算式</a>で解説しています。</p>
${affiliateBlock()}
<section class="faq"><h2>よくある質問</h2><dl>
<dt>ワンストップ特例と確定申告、結局どちらが得ですか？</dt><dd>控除される合計額は原則同じです。ただし<a href="${rel(2, "guide/jutaku-loan/")}">住宅ローン控除</a>の初年度など、確定申告で他の控除と重なると住民税側の控除枠を使いきれないことがあるため注意が必要です。該当する方は上限額に余裕を持たせることをおすすめします。</dd>
<dt>確定申告を忘れたらどうなりますか？</dt><dd>そもそも確定申告をしていなかった人は、翌年1月1日から5年以内なら還付申告としていつでも提出できます。すでに申告書を提出していて寄附金控除の記載を忘れた人は、法定申告期限から5年以内の「更正の請求」で訂正できます。どちらの場合も期限内なら控除を受けられます。</dd>
<dt>ワンストップ特例の申請書をすでに出しています。確定申告することになったらどうすればいいですか？</dt><dd>その申請は自動的に無効になるため、確定申告書の寄附金控除欄に<strong>その年に寄付した全ての自治体分</strong>を記載し直してください。ワンストップ申請済みの分を除いて申告してしまうと、その分の控除が受けられなくなります。</dd>
<dt>寄附金受領証明書をなくしてしまいました。</dt><dd>寄付先の自治体、または利用したふるさと納税サイトに再発行を依頼できます。電子交付（マイナポータル連携やポータルのマイページ）に対応している場合は、証明書データをオンラインで再取得できることが多いです。</dd>
<dt>医療費控除や住宅ローン控除（初年度）と一緒に申告できますか？</dt><dd>できます。同じ確定申告書の中で、寄附金控除の欄にふるさと納税分をまとめて入力すれば、他の控除と合わせて自動計算されます。証明書類はそれぞれの控除ごとに必要です。</dd>
</dl></section>
<section class="note"><p>${TODAY.y}年8月時点の情報です。申告期間や証明書の様式・対応状況は年により変更される場合があるため、申告前に<a href="https://www.nta.go.jp/taxes/shiraberu/shinkoku/kakutei/koujyo/kifukin.htm" rel="noopener">国税庁の該当ページ</a>や税務署で最新情報をご確認ください。</p></section>
${guideLinks(2)}`);

  buildGuide("rakuten",
    "楽天ふるさと納税のやり方｜買い物と同じ5ステップ",
    "楽天ふるさと納税は通常の楽天市場の買い物と同じ手順で寄付できます。上限額の確認→返礼品選び→寄付者情報の確認→ワンストップ申請までの5ステップと、楽天ポイントで実質自己負担がゼロになる仕組みを解説します。",
    "楽天ふるさと納税のやり方", `
<section class="feature"><p>楽天ふるさと納税は、<strong>普段の楽天市場の買い物とまったく同じ画面</strong>で寄付ができます。特別な登録は不要で、楽天会員ならそのまま使えます。寄付額に対しても楽天ポイントが付くため、自己負担の2,000円がポイントで実質相殺できるのが最大の強みです。</p></section>
<h2>5ステップでできる</h2>
<div class="tbl"><table><thead><tr><th>ステップ</th><th>やること</th><th>注意点</th></tr></thead><tbody>
<tr><td>1. 上限額を調べる</td><td><a href="${rel(2, "")}">シミュレーター</a>で年収と家族構成から目安を確認</td><td>少し控えめに見積もるのが安全</td></tr>
<tr><td>2. 返礼品を選ぶ</td><td>楽天市場で「ふるさと納税」と検索、またはジャンルから探す</td><td>レビュー件数順の並べ替えが便利</td></tr>
<tr><td>3. 寄付者情報を確認</td><td>購入画面で「注文者情報＝住民票の情報」か確認</td><td><strong>住民票と違う住所・氏名では控除されません</strong></td></tr>
<tr><td>4. ワンストップ特例を選択</td><td>申込画面のチェックボックスで「利用する」を選ぶ</td><td>寄付先が5自治体以内の給与所得者のみ</td></tr>
<tr><td>5. 申請書を返送</td><td>届いた申請書を翌年1月10日必着で返送（オンライン申請可の自治体も）</td><td>忘れたら確定申告に切替</td></tr>
</tbody></table></div>
<h2>ポイントで「実質負担ゼロ」になる仕組み</h2>
<p>ふるさと納税の自己負担は2,000円ですが、楽天では寄付額も通常の買い物と同じくポイント付与の対象です。たとえば5万円の寄付で還元率4%なら2,000ポイント。<strong>自己負担分がそのまま戻ってくる</strong>計算になります。お買い物マラソンや5と0のつく日などポイントアップのタイミングを狙うと、実質プラスになることもあります。</p>
<h2>よくある失敗</h2>
<ul style="margin-left:1.2em">
<li><strong>家族のアカウントで寄付してしまう</strong> — 控除を受ける本人の楽天アカウント・本人名義の決済で寄付する必要があります</li>
<li><strong>送付先を自宅以外にして注文者情報も変えてしまう</strong> — 返礼品の送付先は変えてもよいですが、注文者情報は住民票どおりに</li>
<li><strong>年末ギリギリの銀行振込</strong> — 年内扱いにならないリスクがあります。クレジットカード決済が確実です</li>
</ul>
${affiliateBlock()}
${guideLinks(2)}`);

  buildGuide("demerit",
    "ふるさと納税のデメリット｜やらないほうがいい人の特徴",
    "ふるさと納税は節税ではなく、税金の前払いに返礼品が付く制度です。上限超過分は自己負担、手続き忘れで控除ゼロになるリスクなど、寄付前に知っておきたいデメリットと、収入が少ない人など「やらないほうがいい人」の特徴をまとめました。",
    "ふるさと納税のデメリット・やらないほうがいい人", `
<section class="feature"><p>ふるさと納税は「節税」ではありません。正しくは、翌年に払うはずの税金の一部を前払いし、その返礼として寄付先の自治体から返礼品を受け取る制度です。実質2,000円の自己負担で返礼品がもらえるため得になる人が多いのは事実ですが、仕組みを理解せずに始めると損をすることもあります。ここではデメリットと、向かない人の特徴を正直にまとめます。</p></section>
<h2>デメリット・注意点</h2>
<ul style="margin-left:1.2em">
<li>控除には上限額があり、<strong>上限を超えた分は控除されず純粋な自己負担</strong>になります</li>
<li>控除が反映されるのは翌年の税金からのため、寄付した年は<strong>手元資金が一時的に減る</strong>だけです</li>
<li>ワンストップ特例か確定申告の手続きが必要で、<strong>どちらも忘れると控除が受けられず全額自己負担</strong>になります</li>
<li>控除が正しく反映されたかは翌年6月ごろ届く<strong>住民税決定通知書を見るまで分からない</strong>ため、結果がすぐには見えません</li>
<li>返礼品の調達費用は寄付額の3割相当が上限と定められており、「豪華でお得」に見えても<strong>市場価格は寄付額そのものより低い</strong>のが実情です</li>
<li>自分が住んでいる自治体への寄付は<strong>返礼品がもらえません</strong></li>
</ul>
<h2>やらないほうがいい・慎重に検討すべき人</h2>
<ul style="margin-left:1.2em">
<li>専業主婦（夫）や学生など<strong>収入が少なく住民税をほぼ納めていない人</strong>（年収150万円以下が目安）は、控除される税金自体が少ないため寄付のメリットがほとんどありません</li>
<li>その年に<strong>退職・休職などで収入が大きく減る見込みの人</strong>は、上限額を高く見積もったまま寄付すると超過分が自己負担になりがちです</li>
<li><strong>住宅ローン控除の初年度に確定申告する人</strong>は、他の控除との兼ね合いで上限額の計算がずれることがあるため、上限に余裕を持たせるべきです</li>
<li><strong>手続きを忘れがちな人</strong>は要注意です。ワンストップ特例の申請書は翌年1月10日必着で、出し忘れると控除がゼロになります</li>
</ul>
<h2>それでも多くの人にはメリットが大きい</h2>
<p>ここまでのデメリットの多くは、上限額を守り、手続きを期限内に済ませれば避けられるものです。住民税を納めている給与所得者であれば、実質2,000円の自己負担で返礼品を受け取れる制度として活用する価値は十分あります。まずは<a href="${rel(2, "")}">上限額シミュレーター</a>で自分の上限を確認し、<a href="${rel(2, "guide/rakuten/")}">楽天ふるさと納税のやり方</a>で具体的な手順を確認するのがおすすめです。</p>
<section class="faq"><h2>よくある質問</h2><dl>
<dt>ふるさと納税は本当に得ですか？</dt><dd>上限額の範囲内で寄付し、手続き（ワンストップ特例または確定申告）を期限内に済ませれば、実質2,000円の自己負担で返礼品を受け取れるため得になる人が多いです。ただし節税ではなく税金の前払いである点は理解しておく必要があります。</dd>
<dt>いくら以上の年収ならやる意味がありますか？</dt><dd>目安として年収200万円台から数千円分の寄付枠が生まれます。当サイトの計算では年収300万円で上限額の目安は28,000円ほどです。住民税をほとんど納めていない年収なら、寄付する意味はほぼありません。</dd>
<dt>専業主婦（夫）名義で寄付できますか？</dt><dd>寄付自体はできますが、収入がなく税金を納めていない人が寄付しても控除は受けられません。控除を受けたい場合は、住民税・所得税を納めている本人（多くは配偶者）の名義とクレジットカードで寄付する必要があります。</dd>
</dl></section>
${guideLinks(2)}`);

  buildGuide("shikumi",
    "ふるさと納税の上限額はどう決まる？仕組みと計算式",
    `ふるさと納税の控除は「所得税からの控除＋住民税基本分＋住民税特例分」の3階建て。上限額は住民税所得割の20%が基準です。自己負担2,000円の意味と、上限額を決める計算式をわかりやすく解説します。`,
    "上限額の仕組みと計算式", `
<section class="feature"><p>ふるさと納税は「寄付額から2,000円を引いた全額」が税金から控除される制度ですが、控除には上限があります。上限を決めているのは<strong>住民税所得割額の20%</strong>という枠です。年収が高い（＝住民税が多い）ほど枠が広がるため、上限額は年収と家族構成で決まります。</p></section>
<h2>控除は3階建て</h2>
<div class="tbl"><table><thead><tr><th>階層</th><th>控除額</th></tr></thead><tbody>
<tr><td>① 所得税からの控除</td><td>（寄付額 − 2,000円）× 所得税率</td></tr>
<tr><td>② 住民税・基本分</td><td>（寄付額 − 2,000円）× 10%</td></tr>
<tr><td>③ 住民税・特例分</td><td>残り全部（＝ 寄付額 − 2,000円 − ① − ②）</td></tr>
</tbody></table></div>
<p>③の特例分が「住民税所得割額の20%」を超えられない、というのが上限の正体です。ここから逆算すると、上限額は次の式になります。</p>
<section class="note"><p><strong>上限額 ＝ 住民税所得割額 × 20% ÷（90% − 所得税率 × 1.021）＋ 2,000円</strong></p><p>（1.021は復興特別所得税の係数。所得税率は課税所得に応じて5%〜45%）</p></section>
<h2>なぜ家族構成で上限が変わるのか</h2>
<p>配偶者控除や扶養控除があると課税所得が減り、住民税所得割額も減ります。枠の基準が住民税なので、扶養家族が多いほど上限額は小さくなります。共働きで配偶者控除を受けていない場合は独身と同じ扱いです。また、中学生以下の子どもは扶養控除の対象外のため、上限額には影響しません。</p>
<h2>「実質2,000円」が崩れるケース</h2>
<ul style="margin-left:1.2em">
<li>上限額を超えて寄付した（超過分は全額自己負担）</li>
<li>ワンストップ特例の申請漏れ・確定申告への記載漏れ</li>
<li>住宅ローン控除などで住民税所得割が想定より少なかった</li>
</ul>
<p>迷ったら<a href="${rel(2, "")}">シミュレーター</a>で目安を確認し、少し控えめに寄付するのが安全です。</p>
${affiliateBlock()}
${guideLinks(2)}`);

  buildGuide("jutaku-loan",
    "ふるさと納税と住宅ローン控除は併用できる？影響と注意点",
    "ふるさと納税と住宅ローン控除は併用できます。ワンストップ特例を使えば住宅ローン控除への影響は原則ありません。確定申告でふるさと納税を申告する場合に注意したい住民税控除の上限との関係を解説します。",
    "住宅ローン控除との併用", `
<section class="feature"><p>結論から言うと、ふるさと納税と住宅ローン控除は<strong>併用できます</strong>。<strong>ワンストップ特例を使う場合は、住宅ローン控除への影響は原則ありません。</strong>一方、確定申告でふるさと納税を申告する場合は、人によっては控除の一部が使いきれなくなることがあります。</p></section>
<h2>ワンストップ特例を使うなら影響は原則なし</h2>
<p>ワンストップ特例で申請したふるさと納税は、所得税からは控除されず<strong>全額が翌年度の住民税から控除</strong>されます。所得控除（寄附金控除）を使わないため課税所得は変わらず、住宅ローン控除（税額控除）の計算にも影響しません。</p>
<section class="note"><p>ただし、<strong>住宅ローン控除の初年度は確定申告が必須</strong>です。この年はふるさと納税でワンストップ特例を使うことができないため、後述の確定申告の注意点があてはまります。2年目以降、年末調整だけで住宅ローン控除の手続きが完結する会社員であれば、ワンストップ特例を使うことで影響を避けられます。</p></section>
<h2>確定申告でふるさと納税を申告する場合の注意点</h2>
<p>確定申告でふるさと納税を申告すると、寄附金控除は所得控除として先に反映され、課税所得・所得税額が下がります。住宅ローン控除は税額控除で、所得税から控除しきれなかった分は住民税から控除されますが、<strong>その住民税からの控除には上限があります</strong>（前年の所得税の課税総所得金額等に応じた一定割合で、上限額が定められています）。</p>
<p>ふるさと納税の寄附金控除で先に所得税額が下がっていると、住宅ローン控除が所得税から引ききれる金額が減り、住民税に回る控除額が増えます。その増えた分がこの上限を超えると、<strong>超えた分は控除されず、住宅ローン控除の一部を使いきれない</strong>ことがあります。</p>
<h2>影響が出やすいケース</h2>
<ul style="margin-left:1.2em">
<li>住宅ローン残高が多く、住宅ローン控除額自体が大きい人</li>
<li>医療費控除や住宅ローン控除の初年度など、<strong>他の理由で確定申告が必要</strong>な人（ワンストップ特例が使えないため）</li>
<li>寄付先が6自治体以上あり、ワンストップ特例の条件（5自治体以内）を満たせない人</li>
</ul>
<h2>ワンストップ特例の可否と影響の整理</h2>
<div class="tbl"><table><thead><tr><th>ケース</th><th>住宅ローン控除への影響</th></tr></thead><tbody>
<tr><td>ワンストップ特例を利用</td><td>原則なし（住民税の控除枠を圧迫しない）</td></tr>
<tr><td>確定申告（住宅ローン控除が所得税で引ききれている人）</td><td>ほぼなし</td></tr>
<tr><td>確定申告（住宅ローン控除が所得税で引ききれていない人）</td><td>住民税控除の上限超過分が使いきれない可能性あり</td></tr>
</tbody></table></div>
<section class="note"><p>影響の有無や金額は、住宅ローン残高・年収・他の控除の有無など個々の状況によって変わります。正確な金額は<strong>税理士・税務署・お住まいの自治体</strong>にご確認ください。当サイトのシミュレーターは住宅ローン控除を考慮していないため、該当する方は表示された上限額より少し控えめに見積もることをおすすめします。</p></section>
${affiliateBlock()}
<section class="faq"><h2>よくある質問</h2><dl>
<dt>住宅ローン控除1年目でもふるさと納税はできますか？</dt><dd>できます。ただし1年目は住宅ローン控除自体の確定申告が必須のため、ふるさと納税もあわせて確定申告で申告することになります（ワンストップ特例は使えません）。</dd>
<dt>ワンストップ特例なら何も気にしなくていいですか？</dt><dd>住宅ローン控除への影響という意味では原則気にしなくて大丈夫です。ただしふるさと納税自体の上限額（寄付しすぎると自己負担になる点）は別途確認が必要です。</dd>
<dt>どのくらい影響が出るか自分で計算できますか？</dt><dd>住宅ローン控除・住民税所得割の計算が絡むため簡易な目安計算は難しく、正確な金額は税務署や税理士への確認をおすすめします。</dd>
</dl></section>
${guideLinks(2)}`);

  buildGuide("ideco",
    "ふるさと納税とiDeCoは併用できる？上限額への影響を解説",
    "ふるさと納税とiDeCoは併用できます。iDeCoの掛金は所得控除のため、課税所得が下がりふるさと納税の上限額も下がる点に注意。当サイトの課税所得モードでiDeCo拠出後の上限額を試算する方法も紹介します。",
    "iDeCoとの併用", `
<section class="feature"><p>ふるさと納税とiDeCo（個人型確定拠出年金）は<strong>併用できます</strong>。どちらも代表的な節税手段で、組み合わせて使っている人も多い制度です。ただし1点、見落としやすい注意点があります。</p></section>
<h2>iDeCoの掛金でふるさと納税の上限額が下がる</h2>
<p>iDeCoの掛金は全額が<strong>小規模企業共済等掛金控除（所得控除）</strong>の対象です。所得控除は課税所得を直接減らすため、iDeCoを始めると課税所得が下がり、その結果<strong>ふるさと納税の上限額の基準となる住民税所得割額も下がり、上限額そのものが下がります</strong>。iDeCoの節税効果自体は変わりませんが、「iDeCoを始める前と同じ感覚でふるさと納税の上限まで寄付する」と上限を超えてしまう可能性があるので注意してください。</p>
<h2>試算例：年収500万円・iDeCo月2.3万円の場合</h2>
<p>当サイトのシミュレーターと同じ計算ロジックで、年収500万円・独身または共働きのケースを試算すると次のとおりです。</p>
<div class="tbl"><table><thead><tr><th></th><th>ふるさと納税の上限額（目安）</th></tr></thead><tbody>
<tr><td>iDeCoなし</td><td>61,000円</td></tr>
<tr><td>iDeCo月2.3万円（年27.6万円）拠出</td><td>54,000円</td></tr>
<tr><td>差額</td><td>約7,000円ダウン</td></tr>
</tbody></table></div>
<p>iDeCoの年間拠出額27.6万円をそのまま住民税の課税所得から差し引いて計算した結果です。年収や家族構成、掛金額によって下がり幅は変わるため、<strong>あくまで一例の目安</strong>としてご覧ください。</p>
<h2>正確な上限額はシミュレーターの「課税所得から計算」モードで</h2>
<p>iDeCoに加入している人は、給与収入だけを入力する通常モードでは正確な上限額が出ません。<a href="${rel(2, "")}#mode-taxable">トップページのシミュレーター</a>にある<strong>「課税所得から計算」モード</strong>を使い、住民税決定通知書の課税標準額（iDeCoの掛金が反映済みの金額）をそのまま入力すれば、iDeCo拠出後の上限額の目安がわかります。</p>
<h2>それでも併用をやめる理由にはならない</h2>
<p>ふるさと納税の上限額が数千円下がるとしても、多くの場合iDeCo自体の節税効果（掛金の所得控除による所得税・住民税の軽減）の方が大きいとされています。「上限が下がるから」という理由だけでiDeCoの併用をやめる必要はなく、<strong>ふるさと納税の寄付額を、iDeCo加入後の上限に合わせて少し控えめにする</strong>のが実務的な対応です。</p>
${affiliateBlock()}
<section class="faq"><h2>よくある質問</h2><dl>
<dt>iDeCoを始めたら、いくら下がるか正確にわかりますか？</dt><dd>年収・家族構成・掛金額によって異なるため、正確には住民税決定通知書の課税標準額を使って<a href="${rel(2, "")}#mode-taxable">課税所得モード</a>で試算するのが確実です。</dd>
<dt>iDeCoとふるさと納税、どちらを優先すべきですか？</dt><dd>目的が異なるため優先順位をつける性質のものではありません。iDeCoは老後資金づくり、ふるさと納税は返礼品を伴う寄付です。上限額の計算順としては、iDeCoの掛金を先に決めてから、その後の課税所得でふるさと納税の上限を確認するとずれが生じません。</dd>
<dt>iDeCoの掛金額はいつ変更できますか？</dt><dd>年に1回、決まった時期に変更できます（制度上の詳細は加入している金融機関でご確認ください）。掛金を変更した年はふるさと納税の上限額も変わる可能性があります。</dd>
</dl></section>
${guideLinks(2)}`);
}

// ---- 返礼品ジャンル別ページ ----
const genreNav = (depth, exceptSlug) => `<div class="links">${GENRES.filter(g => g.slug !== exceptSlug).map(g =>
  `<a href="${rel(depth, `genre/${g.slug}/`)}">${g.emoji} ${esc(g.name)}</a>`).join("")}</div>`;

function buildGenrePage(g) {
  const tips = g.tips.map(t => `<li>${esc(t)}</li>`).join("\n");
  const links = g.linkData.map(l =>
    `<li><a href="${esc(l.url)}" rel="sponsored noopener" target="_blank">${esc(l.keyword)} を楽天で探す</a></li>`).join("\n");
  const body = `
<section class="feature"><p>${esc(g.intro)}</p></section>
<h2>${esc(g.name)}の返礼品選びのポイント</h2>
<ul style="margin-left:1.2em">${tips}</ul>
<section class="note goods"><h2>楽天ふるさと納税で${esc(g.name)}の返礼品を探す<small>（広告を含みます）</small></h2>
<p>楽天ふるさと納税は通常の楽天市場と同じ画面で寄付でき、楽天ポイントも付きます。レビュー件数順に並べ替えると人気の返礼品がすぐ見つかります。</p>
<ul>${links}</ul></section>
<section class="note"><p>寄付の前に、自己負担2,000円で済む上限額の確認を忘れずに。<a href="${rel(2, "")}">上限額シミュレーター</a>で年収と家族構成から10秒で計算できます。</p></section>
<h2>他のジャンルを見る</h2>${genreNav(2, g.slug)}
${guideLinks(2)}`;

  writePage(`genre/${g.slug}/index.html`, shell({
    path: `genre/${g.slug}/`, depth: 2,
    title: `ふるさと納税の${g.name}返礼品の選び方｜失敗しないポイント`,
    desc: `ふるさと納税で${g.name}の返礼品を選ぶときのポイントを解説。${g.tips[0]}。楽天ふるさと納税での探し方と、自己負担2,000円で済む上限額の確認方法もあわせて紹介します。`,
    h1: `ふるさと納税の${g.name}返礼品の選び方`,
    breadcrumbs: [{ name: "ホーム", path: "" }, { name: g.name, path: `genre/${g.slug}/` }],
    body,
  }));
}

// ---- トップページ（シミュレーター + 一覧表） ----
function buildHome() {
  const headRow = FAMILY_KEYS.map(k => `<th>${esc(FAMILY[k].short)}</th>`).join("");
  const rows = INCOMES.map(man => {
    const cells = FAMILY_KEYS.map(k => `<td>${yen(furusatoLimit(man * 10000, k))}</td>`).join("");
    return `<tr><td><a href="${rel(0, `nenshu/${man}/`)}">年収${man}万円</a></td>${cells}</tr>`;
  }).join("\n");

  const clientLib = fs.readFileSync(path.join(__dirname, "lib", "tax.js"), "utf8")
    .split("// <client>")[1].split("// </client>")[0];
  const familyOptions = FAMILY_KEYS.map(k => `<option value="${k}">${esc(FAMILY[k].label)}</option>`).join("");

  const body = `
<section class="sim">
<p>年収と家族構成を選ぶだけで、自己負担2,000円で寄付できる上限額の目安がわかります。</p>
<div class="mode">
<label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.85rem;margin-right:1.2rem"><input type="radio" name="mode" value="salary" checked>年収から計算（給与所得者）</label>
<label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.85rem"><input type="radio" name="mode" value="taxable">課税所得から計算（確定申告をする方向け）</label>
</div>
<div id="mode-salary">
<label for="salary">年収（額面・万円）</label>
<input type="number" id="salary" min="100" max="2000" step="10" value="500" inputmode="numeric">
<label for="family">家族構成</label>
<select id="family">${familyOptions}</select>
</div>
<div id="mode-taxable" style="display:none">
<label for="taxable">住民税の課税所得（万円）</label>
<input type="number" id="taxable" min="10" max="5000" step="1" value="300" inputmode="numeric">
<p class="lb" style="margin-top:.3rem">住民税決定通知書や課税明細書の「課税標準額」欄の金額です。家族構成の控除は課税所得に反映済みのため入力不要です</p>
</div>
<div class="result"><div class="lb">控除上限額の目安</div><div class="vl" id="result">—</div><div class="lb" id="result-sub"></div><div class="lb" id="result-note" style="display:none;margin-top:.4rem"></div></div>
</section>
<h2>年収別 控除上限額の早見表</h2>
<div class="tbl"><table><thead><tr><th>年収</th>${headRow}</tr></thead><tbody>${rows}</tbody></table></div>
${assumptionsNote(true)}
${affiliateBlock()}
<h2>返礼品ジャンル別の選び方</h2>
${genreNav(0, null)}
<section class="faq"><h2>よくある質問</h2><dl>
<dt>上限額を超えて寄付するとどうなりますか？</dt><dd>超えた分は控除されず自己負担になります。年収が確定する前に寄付する場合は、目安より少し控えめが安全です。</dd>
<dt>ふるさと納税はいつまでにすればいいですか？</dt><dd>その年の12月31日の決済完了分までが当年分です。詳しくは<a href="${rel(0, "guide/schedule/")}">期限まとめ</a>をご覧ください。</dd>
<dt>確定申告は必要ですか？</dt><dd>寄付先が5自治体以内の給与所得者なら<a href="${rel(0, "guide/onestop/")}">ワンストップ特例</a>で確定申告なしで控除が受けられます。</dd>
<dt>専業主婦（主夫）や年金収入でも使えますか？</dt><dd>所得税・住民税を納めていることが前提の制度です。収入がない方が寄付しても控除は受けられません（純粋な寄付になります）。</dd>
</dl></section>
${guideLinks(0)}`;

  const websiteJson = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "WebSite",
    name: "ふるさと納税 上限額かんたん計算", url: BASE,
  })}</script>`;

  const script = `<script>
${clientLib}
(function(){
  var modeRadios=document.getElementsByName("mode"),
      salaryDiv=document.getElementById("mode-salary"),taxableDiv=document.getElementById("mode-taxable"),
      s=document.getElementById("salary"),f=document.getElementById("family"),t=document.getElementById("taxable"),
      r=document.getElementById("result"),sub=document.getElementById("result-sub"),note=document.getElementById("result-note");
  function fmt(n){return n.toLocaleString("ja-JP")+"円";}
  function mode(){
    for(var i=0;i<modeRadios.length;i++) if(modeRadios[i].checked) return modeRadios[i].value;
    return "salary";
  }
  function update(){
    var man=Number(s.value);
    if(!isFinite(man)||man<50||man>2000){r.textContent="—";sub.textContent=man>2000?"年収2,000万円超は基礎控除の逓減があるため対応していません":"年収を50〜2000（万円）で入力してください";return;}
    man=Math.floor(man);
    var v=furusatoLimit(man*10000,f.value);
    r.textContent=fmt(v);
    sub.textContent=v>0?"年収"+man+"万円・"+FAMILY[f.value].label+"の場合":"この条件では控除を受けられる住民税がありません";
  }
  function updateTaxable(){
    var man=Number(t.value);
    if(!isFinite(man)||man<10||man>5000){r.textContent="—";sub.textContent="住民税の課税所得を10〜5000（万円）で入力してください";return 0;}
    man=Math.floor(man);
    var v=limitFromTaxable(man*10000);
    r.textContent=fmt(v);
    sub.textContent=v>0?"住民税の課税所得"+man+"万円の場合":"この条件では控除を受けられる住民税がありません";
    return v;
  }
  function refresh(){
    note.style.display="none";
    if(mode()==="taxable"){
      salaryDiv.style.display="none";taxableDiv.style.display="block";
      var v=updateTaxable();
      if(v>0){note.textContent="住宅ローン控除で住民税から控除を受けている場合は、実際の上限がこれより下がることがあります";note.style.display="block";}
    }else{
      salaryDiv.style.display="block";taxableDiv.style.display="none";
      update();
    }
  }
  s.addEventListener("input",refresh);f.addEventListener("change",refresh);t.addEventListener("input",refresh);
  for(var i=0;i<modeRadios.length;i++) modeRadios[i].addEventListener("change",refresh);
  refresh();
})();
</script>`;

  writePage("index.html", shell({
    path: "", depth: 0,
    title: "ふるさと納税 上限額シミュレーター｜年収別いくらまで？早見表つき",
    desc: "ふるさと納税の控除上限額を年収・家族構成、または課税所得から10秒で計算。年収300万〜2000万円の早見表つき。自己負担2,000円で寄付できる金額の目安がすぐわかります。ワンストップ特例や期限の解説も。",
    h1: "ふるさと納税 控除上限額シミュレーター",
    breadcrumbs: [],
    body,
    extraHead: websiteJson,
    extraScript: script,
  }));
}

function build404() {
  writePage("404.html", `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>ページが見つかりません</title><style>${CSS}</style></head>
<body><main style="text-align:center;padding-top:3rem"><h1>ページが見つかりません</h1><p><a href="${BASE}">ふるさと納税 上限額かんたん計算 トップへ</a></p></main></body></html>`);
}
function buildSitemap() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${emittedUrls.map(u => `  <url><loc>${u}</loc><lastmod>${TODAY_STR}</lastmod></url>`).join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(OUT, "sitemap.xml"), xml);
}

// ---- 実行 ----
fs.rmSync(OUT, { recursive: true, force: true });
INCOMES.forEach((man, i) => buildIncomePage(man, i));
buildGuides();
GENRES.forEach(buildGenrePage);
buildHome();
build404();
buildSitemap();
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

// 整合性チェック
for (const t of linkTargets) {
  const f = path.join(OUT, t, "index.html");
  if (!fs.existsSync(f)) throw new Error(`BROKEN LINK TARGET: ${t}`);
}
const expected = 1 + INCOMES.length + 10 + GENRES.length; // guides: nenmatsu/rakuten/schedule/onestop/onestop-online/kakutei-shinkoku/shikumi/demerit/jutaku-loan/ideco
if (emittedUrls.length !== expected) throw new Error(`page count ${emittedUrls.length} != ${expected}`);
if (!emittedUrls.every(u => u.startsWith(BASE))) throw new Error("URL outside BASE");
console.log(`OK: ${emittedUrls.length} pages + 404 + sitemap generated for ${TODAY_STR}`);
