"use strict";
// ふるさと納税 控除上限額シミュレーター 静的サイトジェネレータ
// 生成物: docs/ 以下に index.html + 年収別25ページ + ガイド3ページ + sitemap.xml + 404.html
const fs = require("fs");
const path = require("path");
const { FAMILY, FAMILY_KEYS, furusatoLimit, limitFromTaxable, SOCIAL_RATE } = require("./lib/tax");
const { GOODS, GENRES } = require("./lib/affiliates");

const BASE = "https://claudetarouggl-coder.github.io/furusato-keisan/";
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
<a href="${rel(depth, "guide/rakuten/")}">楽天ふるさと納税のやり方</a>
<a href="${rel(depth, "guide/schedule/")}">ふるさと納税はいつまで？期限まとめ</a>
<a href="${rel(depth, "guide/onestop/")}">ワンストップ特例とは</a>
<a href="${rel(depth, "guide/onestop-online/")}">ワンストップのオンライン申請</a>
<a href="${rel(depth, "guide/shikumi/")}">上限額の仕組みと計算式</a>
<a href="${rel(depth, "guide/demerit/")}">デメリット・向かない人</a></div>`;

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
const expected = 1 + INCOMES.length + 6 + GENRES.length; // guides: rakuten/schedule/onestop/onestop-online/shikumi/demerit
if (emittedUrls.length !== expected) throw new Error(`page count ${emittedUrls.length} != ${expected}`);
if (!emittedUrls.every(u => u.startsWith(BASE))) throw new Error("URL outside BASE");
console.log(`OK: ${emittedUrls.length} pages + 404 + sitemap generated for ${TODAY_STR}`);
