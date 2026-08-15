"use strict";
// ふるさと納税 控除上限額の簡易計算
// 前提（サイト上にも明記）:
//   - 収入は給与のみ（年末調整のみの給与所得者を想定）
//   - 社会保険料は給与収入の14.6%で概算（協会けんぽ+厚生年金+雇用保険の代表値）
//   - 給与所得控除・基礎控除は令和7年度税制改正後の値（基礎控除の一時加算は見込まない=控えめ）
//   - iDeCo・医療費控除・住宅ローン控除などその他の控除はなし
//   - 表示は千円未満切捨て。あくまで目安であり、正確な上限は源泉徴収票ベースで要確認
// <client>
// 給与所得控除（令和7年改正: 最低保障65万円）
function salaryDeduction(s) {
  if (s <= 1900000) return 650000;
  if (s <= 3600000) return s * 0.3 + 80000;
  if (s <= 6600000) return s * 0.2 + 440000;
  if (s <= 8500000) return s * 0.1 + 1100000;
  return 1950000;
}
// 所得税の限界税率
function incomeTaxRate(taxable) {
  if (taxable <= 1950000) return 0.05;
  if (taxable <= 3300000) return 0.10;
  if (taxable <= 6950000) return 0.20;
  if (taxable <= 9000000) return 0.23;
  if (taxable <= 18000000) return 0.33;
  if (taxable <= 40000000) return 0.40;
  return 0.45;
}
// 家族構成ごとの人的控除（基礎控除以外）: res=住民税, nat=所得税
// 高校生=一般扶養(33/38万), 大学生=特定扶養(45/63万), 中学生以下は扶養控除対象外
var FAMILY = {
  single:  { label: "独身または共働き", short: "独身・共働き", res: 0, nat: 0 },
  couple:  { label: "夫婦（配偶者を扶養）", short: "夫婦", res: 330000, nat: 380000 },
  dual1:   { label: "共働き＋子1人（高校生）", short: "共働き＋高1人", res: 330000, nat: 380000 },
  couple1: { label: "夫婦＋子1人（高校生）", short: "夫婦＋高1人", res: 660000, nat: 760000 },
  dual2:   { label: "共働き＋子2人（大学生と高校生）", short: "共働き＋大高", res: 780000, nat: 1010000 },
  couple2: { label: "夫婦＋子2人（大学生と高校生）", short: "夫婦＋大高", res: 1110000, nat: 1390000 },
};
var FAMILY_KEYS = ["single", "couple", "dual1", "couple1", "dual2", "couple2"];
var SOCIAL_RATE = 0.146;

// 控除上限額の目安（円、千円未満切捨て）。課税所得ゼロ以下は0
function furusatoLimit(salary, familyKey) {
  var f = FAMILY[familyKey];
  var income = salary - salaryDeduction(salary);
  var social = salary * SOCIAL_RATE;
  var taxableRes = income - social - 430000 - f.res;
  if (taxableRes <= 0) return 0;
  var shotokuwari = taxableRes * 0.10 - 2500; // 住民税所得割（調整控除2,500円を概算控除）
  if (shotokuwari <= 0) return 0;
  var taxableNat = Math.max(income - social - 580000 - f.nat, 0);
  var t = incomeTaxRate(taxableNat);
  var limit = (shotokuwari * 0.2) / (0.9 - t * 1.021) + 2000;
  return Math.floor(limit / 1000) * 1000;
}
// 住民税の課税所得（円）から直接計算する版。確定申告をする個人事業主など向け
function limitFromTaxable(taxableResYen) {
  var shotokuwari = taxableResYen * 0.10 - 2500;
  if (shotokuwari <= 0) return 0;
  var taxableNat = Math.max(taxableResYen - 150000, 0); // 所得税は基礎控除が住民税より15万円多い分を調整
  var t = incomeTaxRate(taxableNat);
  var limit = (shotokuwari * 0.2) / (0.9 - t * 1.021) + 2000;
  return Math.floor(limit / 1000) * 1000;
}
// </client>

module.exports = { salaryDeduction, incomeTaxRate, FAMILY, FAMILY_KEYS, SOCIAL_RATE, furusatoLimit, limitFromTaxable };

// 自己検証: 総務省・大手シミュレータの公表目安との照合（±12%）+ 単調性
if (require.main === module) {
  const assert = require("assert");
  const near = (salary, key, expected, tol = 0.12) => {
    const got = furusatoLimit(salary, key);
    assert.ok(Math.abs(got - expected) <= expected * tol,
      `${salary / 10000}万 ${key}: expected ~${expected}, got ${got}`);
  };
  // 総務省の目安表・楽天シミュレータ公表値のアンカー
  near(3000000, "single", 28000);
  near(4000000, "single", 42000);
  near(4000000, "couple", 33000);
  near(5000000, "single", 61000);
  near(5000000, "couple", 49000);
  near(6000000, "single", 77000);
  near(7000000, "single", 108000);
  near(7000000, "couple1", 78000, 0.15);
  near(8000000, "single", 129000);
  near(10000000, "single", 177000);
  // 単調性: 年収が増えれば上限は減らない / 控除が増えれば上限は増えない
  for (const key of FAMILY_KEYS) {
    let prev = -1;
    for (let s = 1000000; s <= 30000000; s += 100000) {
      const v = furusatoLimit(s, key);
      assert.ok(v >= prev, `monotonic ${key} at ${s}: ${prev} -> ${v}`);
      prev = v;
    }
  }
  for (let s = 2000000; s <= 20000000; s += 500000) {
    assert.ok(furusatoLimit(s, "single") >= furusatoLimit(s, "couple"), `single>=couple at ${s}`);
    assert.ok(furusatoLimit(s, "couple") >= furusatoLimit(s, "couple1"), `couple>=couple1 at ${s}`);
    assert.ok(furusatoLimit(s, "couple1") >= furusatoLimit(s, "couple2"), `couple1>=couple2 at ${s}`);
  }
  // ゼロ境界: 低収入では0円になる
  assert.strictEqual(furusatoLimit(1000000, "couple2"), 0);
  // limitFromTaxable: 給与所得者（500万・独身）の住民税課税所得を逆算して furusatoLimit と一致するか
  {
    const salary = 5000000, f = FAMILY.single;
    const income = salary - salaryDeduction(salary);
    const social = salary * SOCIAL_RATE;
    const taxableRes = income - social - 430000 - f.res;
    const got = limitFromTaxable(taxableRes);
    const expected = furusatoLimit(salary, "single");
    assert.ok(Math.abs(got - expected) <= 1000,
      `limitFromTaxable mismatch: got ${got}, expected ~${expected}`);
  }
  // limitFromTaxable: 単調性（住民税課税所得100万〜3000万）
  {
    let prev = -1;
    for (let tv = 1000000; tv <= 30000000; tv += 100000) {
      const v = limitFromTaxable(tv);
      assert.ok(v >= prev, `limitFromTaxable monotonic at ${tv}: ${prev} -> ${v}`);
      prev = v;
    }
  }
  console.log("tax.js self-check OK");
}
