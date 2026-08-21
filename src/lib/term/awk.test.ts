import assert from "node:assert/strict";
import test from "node:test";
import { parseAwkArgs, runAwk } from "./awk.ts";

const HIST = [
  "year  revenue  netIncome  gm  services  eps  price  opIncome",
  "2018  265.6  59.53  38.3  37.19  2.98  39.5  70.9",
  "2019  260.17  55.26  37.8  46.29  3.28  73.4  63.93",
  "2024  391.04  93.74  46.2  96.17  6.08  254.5  123.22",
  "2025  416.16  112.01  46.9  109.16  7.4  285.9  133.05",
];

test("print fields", () => {
  const out = runAwk("{print $1, $2}", ["a  10", "b  20"]);
  assert.deepEqual(out, ["a 10", "b 20"]);
});

test("sum with BEGIN/END", () => {
  const out = runAwk("NR>1 {s+=$2} END {print s}", HIST);
  assert.equal(Number(out[0]), 265.6 + 260.17 + 391.04 + 416.16);
});

test("regex pattern", () => {
  const out = runAwk("/2025/ {print $1, $2}", HIST);
  assert.deepEqual(out, ["2025 416.16"]);
});

test("yoy printf", () => {
  const out = runAwk('NR>1 {if(p) printf "%s %.1f\\n", $1, 100*($2-p)/p; p=$2}', HIST);
  assert.equal(out[0]!.startsWith("2019 "), true);
  assert.equal(out.at(-1)!.startsWith("2025 "), true);
});

test("arrays and for-in", () => {
  const out = runAwk("{a[$1]=$2} END {print a[\"2025\"]}", HIST);
  assert.equal(out[0], "416.16");
});

test("if else and NF", () => {
  const out = runAwk("{if (NF>=2) print NF; else print 0}", ["one two three", "x"]);
  assert.deepEqual(out, ["3", "0"]);
});

test("-F comma and parseAwkArgs", () => {
  const { program, fs } = parseAwkArgs(["-F,", "{print $2}"]);
  assert.equal(fs, ",");
  const out = runAwk(program, ["a,b,c"], { fs });
  assert.deepEqual(out, ["b"]);
});

test("length substr int", () => {
  const out = runAwk('{print length($1), substr($1,1,2), int($2)}', ["Apple 12.9"]);
  assert.deepEqual(out, ["5 Ap 12"]);
});

test("pattern without block prints the line", () => {
  const out = runAwk("NR==2", ["a", "b", "c"]);
  assert.deepEqual(out, ["b"]);
});

test("next skips later rules", () => {
  const out = runAwk("NR==1 {next} {print $1}", ["skip", "keep"]);
  assert.deepEqual(out, ["keep"]);
});
