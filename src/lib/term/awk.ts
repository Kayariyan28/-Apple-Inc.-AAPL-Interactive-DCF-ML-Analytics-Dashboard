/**
 * A real awk subset for the desk. BEGIN/END, patterns, fields, arrays,
 * arithmetic, if/for/while, printf, and the usual string/math builtins.
 * Quotes are required around the program in the shell: hist | awk '{print $1}'.
 */

export type AwkOpts = {
  fs?: string;
  vars?: Record<string, string | number>;
};

type TokKind =
  | "num"
  | "str"
  | "re"
  | "id"
  | "op"
  | "lp"
  | "rp"
  | "lb"
  | "rb"
  | "lbr"
  | "rbr"
  | "comma"
  | "semi"
  | "dollar"
  | "eof";

type Tok = { kind: TokKind; v: string; p: number };

const KW = new Set([
  "BEGIN",
  "END",
  "if",
  "else",
  "while",
  "for",
  "in",
  "print",
  "printf",
  "next",
  "exit",
  "break",
  "continue",
  "delete",
  "function",
  "return",
]);

const TWO = ["==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "%=", "^=", "++", "--", "||", "&&", "!~"];

function lex(src: string): Tok[] {
  const t: Tok[] = [];
  let i = 0;
  let canRe = true;
  const push = (kind: TokKind, v: string, p: number) => {
    t.push({ kind, v, p });
    canRe = kind === "op" || kind === "lp" || kind === "lbr" || kind === "comma" || kind === "semi" || kind === "dollar";
  };
  while (i < src.length) {
    const c = src[i]!;
    if (c === "#") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "\n" || c === ";") {
      push("semi", c, i);
      i++;
      canRe = true;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "/" && canRe) {
      const p = i;
      i++;
      let v = "";
      while (i < src.length && src[i] !== "/") {
        if (src[i] === "\\" && src[i + 1]) {
          v += src[i + 1];
          i += 2;
          continue;
        }
        v += src[i];
        i++;
      }
      i++;
      push("re", v, p);
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      const p = i;
      i++;
      let v = "";
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\" && src[i + 1]) {
          const n = src[i + 1];
          v += n === "n" ? "\n" : n === "t" ? "\t" : n;
          i += 2;
          continue;
        }
        v += src[i];
        i++;
      }
      i++;
      push("str", v, p);
      continue;
    }
    if (c === "$") {
      push("dollar", "$", i);
      i++;
      continue;
    }
    if (/[0-9.]/.test(c) && !(c === "." && !(src[i + 1] && /[0-9]/.test(src[i + 1]!)))) {
      const p = i;
      let v = "";
      while (i < src.length) {
        const ch = src[i]!;
        if (/[0-9.]/.test(ch)) {
          v += ch;
          i++;
          continue;
        }
        if ((ch === "e" || ch === "E") && i + 1 < src.length) {
          v += ch;
          i++;
          if (src[i] === "+" || src[i] === "-") {
            v += src[i];
            i++;
          }
          continue;
        }
        break;
      }
      if (v === "." || v === "") {
        push("op", ".", p);
      } else {
        push("num", v, p);
      }
      continue;
    }
    const two = src.slice(i, i + 2);
    if (TWO.includes(two)) {
      push("op", two, i);
      i += 2;
      continue;
    }
    if (c === "(") {
      push("lp", c, i);
      i++;
      continue;
    }
    if (c === ")") {
      push("rp", c, i);
      i++;
      continue;
    }
    if (c === "[") {
      push("lb", c, i);
      i++;
      continue;
    }
    if (c === "]") {
      push("rb", c, i);
      i++;
      continue;
    }
    if (c === "{") {
      push("lbr", c, i);
      i++;
      canRe = true;
      continue;
    }
    if (c === "}") {
      push("rbr", c, i);
      i++;
      continue;
    }
    if (c === ",") {
      push("comma", c, i);
      i++;
      continue;
    }
    if ("+-*/%=<>!~^?:".includes(c)) {
      push("op", c, i);
      i++;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const p = i;
      let v = "";
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i]!)) {
        v += src[i];
        i++;
      }
      push("id", v, p);
      continue;
    }
    throw new Error(`awk: unexpected '${c}' at ${i}`);
  }
  t.push({ kind: "eof", v: "", p: src.length });
  return t;
}

type Node =
  | { t: "num"; n: number }
  | { t: "str"; s: string }
  | { t: "re"; s: string }
  | { t: "id"; s: string }
  | { t: "field"; e: Node }
  | { t: "bin"; op: string; a: Node; b: Node }
  | { t: "un"; op: string; a: Node }
  | { t: "post"; op: string; a: Node }
  | { t: "assign"; op: string; a: Node; b: Node }
  | { t: "tern"; c: Node; a: Node; b: Node }
  | { t: "call"; name: string; args: Node[] }
  | { t: "index"; a: Node; k: Node }
  | { t: "list"; xs: Node[] };

type Stmt =
  | { t: "block"; xs: Stmt[] }
  | { t: "expr"; e: Node }
  | { t: "print"; xs: Node[]; printf: boolean }
  | { t: "if"; c: Node; a: Stmt; b?: Stmt }
  | { t: "while"; c: Node; a: Stmt }
  | { t: "for"; init?: Node; c?: Node; step?: Node; a: Stmt }
  | { t: "forin"; k: string; arr: string; a: Stmt }
  | { t: "next" }
  | { t: "exit"; e?: Node }
  | { t: "break" }
  | { t: "continue" }
  | { t: "delete"; a: Node };

type Rule = { pat: Node | "BEGIN" | "END" | null; body: Stmt };

class Parser {
  ts: Tok[];
  i = 0;
  constructor(ts: Tok[]) {
    this.ts = ts;
  }
  peek(): Tok {
    return this.ts[this.i] ?? this.ts[this.ts.length - 1]!;
  }
  get p() {
    return this.peek();
  }
  eat(kind?: TokKind, v?: string) {
    const t = this.p;
    if (kind && t.kind !== kind) throw new Error(`awk: expected ${kind}, got ${t.kind} '${t.v}'`);
    if (v && t.v !== v) throw new Error(`awk: expected '${v}', got '${t.v}'`);
    this.i++;
    return t;
  }
  skipSemi() {
    while (this.p.kind === "semi") this.i++;
  }
  parseProgram(): Rule[] {
    const rules: Rule[] = [];
    this.skipSemi();
    while (this.p.kind !== "eof") {
      if (this.p.kind === "id" && (this.p.v === "BEGIN" || this.p.v === "END")) {
        const which = this.eat("id").v as "BEGIN" | "END";
        this.skipSemi();
        rules.push({ pat: which, body: this.parseBlockOrStmt() });
      } else if (this.p.kind === "lbr") {
        rules.push({ pat: null, body: this.parseBlock() });
      } else {
        const pat = this.parseExpr(0);
        this.skipSemi();
        const body = this.peek().kind === "lbr" ? this.parseBlock() : { t: "print" as const, xs: [], printf: false };
        rules.push({ pat, body });
      }
      this.skipSemi();
    }
    return rules;
  }
  parseBlockOrStmt(): Stmt {
    if (this.p.kind === "lbr") return this.parseBlock();
    return this.parseStmt();
  }
  parseBlock(): Stmt {
    this.eat("lbr");
    const xs: Stmt[] = [];
    this.skipSemi();
    while (this.p.kind !== "rbr" && this.p.kind !== "eof") {
      xs.push(this.parseStmt());
      this.skipSemi();
    }
    this.eat("rbr");
    return { t: "block", xs };
  }
  parseStmt(): Stmt {
    this.skipSemi();
    const t = this.p;
    if (t.kind === "lbr") return this.parseBlock();
    if (t.kind === "id" && t.v === "if") {
      this.eat("id");
      this.eat("lp");
      const c = this.parseExpr(0);
      this.eat("rp");
      const a = this.parseStmt();
      this.skipSemi();
      let b: Stmt | undefined;
      if (this.p.kind === "id" && this.p.v === "else") {
        this.eat("id");
        b = this.parseStmt();
      }
      return { t: "if", c, a, b };
    }
    if (t.kind === "id" && t.v === "while") {
      this.eat("id");
      this.eat("lp");
      const c = this.parseExpr(0);
      this.eat("rp");
      return { t: "while", c, a: this.parseStmt() };
    }
    if (t.kind === "id" && t.v === "for") {
      this.eat("id");
      this.eat("lp");
      if (this.p.kind === "id" && this.ts[this.i + 1]?.kind === "id" && this.ts[this.i + 1]?.v === "in") {
        const k = this.eat("id").v;
        this.eat("id", "in");
        const arr = this.eat("id").v;
        this.eat("rp");
        return { t: "forin", k, arr, a: this.parseStmt() };
      }
      let init: Node | undefined;
      let c: Node | undefined;
      let step: Node | undefined;
      if (this.p.kind !== "semi") init = this.parseExpr(0);
      this.eat("semi");
      if (this.p.kind !== "semi") c = this.parseExpr(0);
      this.eat("semi");
      if (this.p.kind !== "rp") step = this.parseExpr(0);
      this.eat("rp");
      return { t: "for", init, c, step, a: this.parseStmt() };
    }
    if (t.kind === "id" && t.v === "print") {
      this.eat("id");
      const xs = this.p.kind === "semi" || this.p.kind === "rbr" || this.p.kind === "eof" ? [] : this.parseList();
      return { t: "print", xs, printf: false };
    }
    if (t.kind === "id" && t.v === "printf") {
      this.eat("id");
      return { t: "print", xs: this.parseList(), printf: true };
    }
    if (t.kind === "id" && t.v === "next") {
      this.eat("id");
      return { t: "next" };
    }
    if (t.kind === "id" && t.v === "exit") {
      this.eat("id");
      const e = this.p.kind === "semi" || this.p.kind === "rbr" || this.p.kind === "eof" ? undefined : this.parseExpr(0);
      return { t: "exit", e };
    }
    if (t.kind === "id" && t.v === "break") {
      this.eat("id");
      return { t: "break" };
    }
    if (t.kind === "id" && t.v === "continue") {
      this.eat("id");
      return { t: "continue" };
    }
    if (t.kind === "id" && t.v === "delete") {
      this.eat("id");
      return { t: "delete", a: this.parseExpr(0) };
    }
    return { t: "expr", e: this.parseExpr(0) };
  }
  parseList(): Node[] {
    const xs = [this.parseExpr(0)];
    while (this.p.kind === "comma") {
      this.eat("comma");
      xs.push(this.parseExpr(0));
    }
    return xs;
  }
  parseExpr(min: number): Node {
    let left = this.parseNud();
    for (;;) {
      const bp = this.lbp(this.p);
      if (bp === 0 || bp < min) break;
      left = this.parseLed(left);
    }
    return left;
  }
  lbp(t: Tok): number {
    if (t.kind === "op") {
      switch (t.v) {
        case "=":
        case "+=":
        case "-=":
        case "*=":
        case "/=":
        case "%=":
        case "^=":
          return 10;
        case "?":
          return 20;
        case "||":
          return 30;
        case "&&":
          return 40;
        case "in":
          return 50;
        case "~":
        case "!~":
          return 60;
        case "==":
        case "!=":
        case "<":
        case ">":
        case "<=":
        case ">=":
          return 70;
        case "+":
        case "-":
          return 90;
        case "*":
        case "/":
        case "%":
          return 100;
        case "^":
          return 120;
        case "++":
        case "--":
          return 130;
        default:
          return 0;
      }
    }
    if (t.kind === "id" && t.v === "in") return 50;
    if (t.kind === "lb") return 140;
    if (t.kind === "num" || t.kind === "str" || t.kind === "id" || t.kind === "dollar" || t.kind === "lp" || t.kind === "re") {
      return 80;
    }
    return 0;
  }
  parseNud(): Node {
    const t = this.p;
    if (t.kind === "num") {
      this.eat("num");
      return { t: "num", n: Number(t.v) };
    }
    if (t.kind === "str") {
      this.eat("str");
      return { t: "str", s: t.v };
    }
    if (t.kind === "re") {
      this.eat("re");
      return { t: "re", s: t.v };
    }
    if (t.kind === "dollar") {
      this.eat("dollar");
      return { t: "field", e: this.parseExpr(140) };
    }
    if (t.kind === "op" && (t.v === "+" || t.v === "-" || t.v === "!" || t.v === "++" || t.v === "--")) {
      this.eat("op");
      return { t: "un", op: t.v, a: this.parseExpr(110) };
    }
    if (t.kind === "lp") {
      this.eat("lp");
      const e = this.parseExpr(0);
      this.eat("rp");
      return e;
    }
    if (t.kind === "id") {
      const name = this.eat("id").v;
      if (this.peek().kind === "lp" && !KW.has(name)) {
        this.eat("lp");
        const args: Node[] = [];
        if (this.peek().kind !== "rp") {
          args.push(this.parseExpr(0));
          while (this.peek().kind === "comma") {
            this.eat("comma");
            args.push(this.parseExpr(0));
          }
        }
        this.eat("rp");
        return { t: "call", name, args };
      }
      return { t: "id", s: name };
    }
    throw new Error(`awk: unexpected '${t.v}' in expression`);
  }
  parseLed(left: Node): Node {
    const t = this.p;
    if (t.kind === "lb") {
      this.eat("lb");
      const k = this.parseExpr(0);
      this.eat("rb");
      return { t: "index", a: left, k };
    }
    if (t.kind === "op" && (t.v === "++" || t.v === "--")) {
      this.eat("op");
      return { t: "post", op: t.v, a: left };
    }
    if (t.kind === "op" && t.v === "?") {
      this.eat("op");
      const a = this.parseExpr(0);
      this.eat("op", ":");
      const b = this.parseExpr(20);
      return { t: "tern", c: left, a, b };
    }
    if (t.kind === "id" && t.v === "in") {
      this.eat("id");
      const b = this.parseExpr(50);
      return { t: "bin", op: "in", a: left, b };
    }
    if (t.kind === "op") {
      const op = t.v;
      const bp = this.lbp(t);
      this.eat("op");
      if (["=", "+=", "-=", "*=", "/=", "%=", "^="].includes(op)) {
        const b = this.parseExpr(bp);
        return { t: "assign", op, a: left, b };
      }
      const rightAssoc = op === "^";
      const b = this.parseExpr(rightAssoc ? bp : bp + 1);
      return { t: "bin", op, a: left, b };
    }
    // concat
    const b = this.parseExpr(81);
    return { t: "bin", op: " ", a: left, b };
  }
}

interface Arr {
  [k: string]: Val;
}
type Val = number | string | Arr;

type Flow = "next" | "exit" | "break" | "continue" | null;

class Vm {
  vars: Record<string, Val> = {};
  fields: string[] = [""];
  nf = 0;
  fs: string;
  ofs = " ";
  ofmt = "%.6g";
  lines: string[] = [];
  buf = "";
  rng = 0.5;
  exited = false;
  constructor(fs: string, vars: Record<string, string | number>) {
    this.fs = fs;
    this.vars.FS = fs;
    this.vars.OFS = " ";
    this.vars.ORS = "\n";
    this.vars.NR = 0;
    this.vars.FNR = 0;
    this.vars.NF = 0;
    this.vars.FILENAME = "-";
    this.vars.RSTART = 0;
    this.vars.RLENGTH = 0;
    for (const [k, v] of Object.entries(vars)) this.vars[k] = v;
  }
  setLine(line: string, nr: number) {
    this.fields = splitFields(line, String(this.vars.FS ?? this.fs));
    this.nf = Math.max(0, this.fields.length - 1);
    this.vars.NF = this.nf;
    this.vars.NR = nr;
    this.vars.FNR = nr;
    this.vars["$0"] = this.fields[0] ?? "";
  }
  rebuild0() {
    const parts = this.fields.slice(1);
    this.fields[0] = parts.join(String(this.vars.OFS ?? this.ofs));
  }
  emit(s: string) {
    this.buf += s;
    const parts = this.buf.split("\n");
    this.buf = parts.pop() ?? "";
    for (const p of parts) this.lines.push(p);
  }
  flush() {
    if (this.buf.length) {
      this.lines.push(this.buf);
      this.buf = "";
    }
  }
  num(v: Val): number {
    if (typeof v === "number") return v;
    if (typeof v === "object") return 0;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  str(v: Val): string {
    if (typeof v === "string") return v;
    if (typeof v === "number") return fmtNum(v, this.ofmt);
    return "";
  }
  truth(v: Val): boolean {
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return v !== "" && v !== "0";
    return true;
  }
  getId(name: string): Val {
    if (name === "NF") return this.nf;
    if (name === "NR" || name === "FNR") return this.num(this.vars[name] ?? 0);
    return this.vars[name] ?? "";
  }
  setTarget(node: Node, value: Val): Val {
    if (node.t === "id") {
      this.vars[node.s] = value;
      if (node.s === "FS") this.fs = String(value);
      if (node.s === "OFS") this.ofs = String(value);
      return value;
    }
    if (node.t === "field") {
      const i = Math.trunc(this.num(this.eval(node.e)));
      if (i === 0) {
        this.setLine(this.str(value), this.num(this.vars.NR));
      } else {
        while (this.fields.length <= i) this.fields.push("");
        this.fields[i] = this.str(value);
        this.nf = Math.max(this.nf, i);
        this.vars.NF = this.nf;
        this.rebuild0();
      }
      return value;
    }
    if (node.t === "index") {
      const arr = this.ensureArr(node.a);
      arr[this.str(this.eval(node.k))] = value;
      return value;
    }
    throw new Error("awk: invalid assignment target");
  }
  ensureArr(node: Node): Arr {
    if (node.t === "id") {
      const cur = this.vars[node.s];
      if (cur && typeof cur === "object") return cur;
      const a: Arr = {};
      this.vars[node.s] = a;
      return a;
    }
    if (node.t === "index") {
      const parent = this.ensureArr(node.a);
      const k = this.str(this.eval(node.k));
      const cur = parent[k];
      if (cur && typeof cur === "object") return cur;
      const a: Arr = {};
      parent[k] = a;
      return a;
    }
    throw new Error("awk: not an array");
  }
  eval(node: Node): Val {
    switch (node.t) {
      case "num":
        return node.n;
      case "str":
        return node.s;
      case "re":
        return node.s;
      case "id":
        return this.getId(node.s);
      case "field": {
        const i = Math.trunc(this.num(this.eval(node.e)));
        if (i === 0) return this.fields[0] ?? "";
        return this.fields[i] ?? "";
      }
      case "un": {
        if (node.op === "!") return this.truth(this.eval(node.a)) ? 0 : 1;
        if (node.op === "+") return this.num(this.eval(node.a));
        if (node.op === "-") return -this.num(this.eval(node.a));
        if (node.op === "++" || node.op === "--") {
          const cur = this.num(this.eval(node.a));
          const next = node.op === "++" ? cur + 1 : cur - 1;
          this.setTarget(node.a, next);
          return next;
        }
        return 0;
      }
      case "post": {
        const cur = this.num(this.eval(node.a));
        this.setTarget(node.a, node.op === "++" ? cur + 1 : cur - 1);
        return cur;
      }
      case "assign": {
        const right = this.eval(node.b);
        if (node.op === "=") return this.setTarget(node.a, right);
        const left = this.num(this.eval(node.a));
        const r = this.num(right);
        let n = left;
        if (node.op === "+=") n = left + r;
        else if (node.op === "-=") n = left - r;
        else if (node.op === "*=") n = left * r;
        else if (node.op === "/=") n = r === 0 ? 0 : left / r;
        else if (node.op === "%=") n = r === 0 ? 0 : left % r;
        else if (node.op === "^=") n = left ** r;
        return this.setTarget(node.a, n);
      }
      case "tern":
        return this.truth(this.eval(node.c)) ? this.eval(node.a) : this.eval(node.b);
      case "index": {
        const a = this.eval(node.a);
        if (typeof a !== "object") return "";
        return a[this.str(this.eval(node.k))] ?? "";
      }
      case "call":
        return this.call(node.name, node.args);
      case "list":
        return this.eval(node.xs[0]!);
      case "bin":
        return this.bin(node.op, node.a, node.b);
      default:
        return 0;
    }
  }
  bin(op: string, a: Node, b: Node): Val {
    if (op === "&&") return this.truth(this.eval(a)) && this.truth(this.eval(b)) ? 1 : 0;
    if (op === "||") return this.truth(this.eval(a)) || this.truth(this.eval(b)) ? 1 : 0;
    if (op === "in") {
      const arr = this.eval(b);
      if (typeof arr !== "object") return 0;
      return this.str(this.eval(a)) in arr ? 1 : 0;
    }
    const av = this.eval(a);
    const bv = this.eval(b);
    if (op === " ") return this.str(av) + this.str(bv);
    if (op === "~" || op === "!~") {
      const ok = new RegExp(this.str(bv)).test(this.str(av));
      return (op === "~" ? ok : !ok) ? 1 : 0;
    }
    if (op === "+" || op === "-" || op === "*" || op === "/" || op === "%" || op === "^") {
      const x = this.num(av);
      const y = this.num(bv);
      if (op === "+") return x + y;
      if (op === "-") return x - y;
      if (op === "*") return x * y;
      if (op === "/") return y === 0 ? 0 : x / y;
      if (op === "%") return y === 0 ? 0 : x % y;
      return x ** y;
    }
    const bothNum = (typeof av === "number" || isNumeric(av)) && (typeof bv === "number" || isNumeric(bv));
    if (bothNum) {
      const x = this.num(av);
      const y = this.num(bv);
      if (op === "==") return x === y ? 1 : 0;
      if (op === "!=") return x !== y ? 1 : 0;
      if (op === "<") return x < y ? 1 : 0;
      if (op === ">") return x > y ? 1 : 0;
      if (op === "<=") return x <= y ? 1 : 0;
      if (op === ">=") return x >= y ? 1 : 0;
    }
    const xs = this.str(av);
    const ys = this.str(bv);
    if (op === "==") return xs === ys ? 1 : 0;
    if (op === "!=") return xs !== ys ? 1 : 0;
    if (op === "<") return xs < ys ? 1 : 0;
    if (op === ">") return xs > ys ? 1 : 0;
    if (op === "<=") return xs <= ys ? 1 : 0;
    if (op === ">=") return xs >= ys ? 1 : 0;
    return 0;
  }
  call(name: string, args: Node[]): Val {
    const A = (...i: number[]) => args[i[0]!] !== undefined ? this.eval(args[i[0]!]) : "";
    switch (name) {
      case "length":
        return this.str(args.length ? this.eval(args[0]!) : (this.fields[0] ?? "")).length;
      case "substr": {
        const s = this.str(A(0));
        const i = Math.max(1, Math.trunc(this.num(A(1)))) - 1;
        const n = args[2] != null ? Math.trunc(this.num(this.eval(args[2]))) : s.length;
        return s.slice(i, i + n);
      }
      case "index":
        return this.str(A(0)).indexOf(this.str(A(1))) + 1;
      case "tolower":
        return this.str(A(0)).toLowerCase();
      case "toupper":
        return this.str(A(0)).toUpperCase();
      case "int":
        return Math.trunc(this.num(A(0)));
      case "sqrt":
        return Math.sqrt(Math.max(0, this.num(A(0))));
      case "log":
        return Math.log(this.num(A(0)));
      case "exp":
        return Math.exp(this.num(A(0)));
      case "sin":
        return Math.sin(this.num(A(0)));
      case "cos":
        return Math.cos(this.num(A(0)));
      case "atan2":
        return Math.atan2(this.num(A(0)), this.num(args[1] ? this.eval(args[1]) : 0));
      case "rand":
        this.rng = (this.rng * 9301 + 49297) % 233280;
        return this.rng / 233280;
      case "srand": {
        const s = args.length ? this.num(A(0)) : Date.now();
        this.rng = s % 233280;
        return s;
      }
      case "sprintf": {
        const fmt = this.str(A(0));
        return sprintf(fmt, args.slice(1).map((x) => this.eval(x)));
      }
      case "split": {
        const s = this.str(A(0));
        const fs = args[2] != null ? this.str(this.eval(args[2])) : String(this.vars.FS ?? this.fs);
        const parts = splitFields(s, fs).slice(1);
        if (args[1]?.t === "id") {
          const arr: Arr = {};
          parts.forEach((p, i) => {
            arr[String(i + 1)] = p;
          });
          this.vars[args[1].s] = arr;
        }
        return parts.length;
      }
      case "sub":
      case "gsub": {
        const re = new RegExp(this.str(A(0)), name === "gsub" ? "g" : "");
        const repl = this.str(args[1] ? this.eval(args[1]) : "");
        const target = args[2];
        const src = target ? this.str(this.eval(target)) : (this.fields[0] ?? "");
        const next = src.replace(re, repl);
        const n = name === "gsub" ? (src.match(new RegExp(re.source, "g")) ?? []).length : re.test(src) ? 1 : 0;
        if (target) this.setTarget(target, next);
        else this.setLine(next, this.num(this.vars.NR));
        return n;
      }
      case "match": {
        const s = this.str(A(0));
        const re = new RegExp(this.str(args[1] ? this.eval(args[1]) : ""));
        const m = s.match(re);
        this.vars.RSTART = m ? (m.index ?? 0) + 1 : 0;
        this.vars.RLENGTH = m ? m[0].length : -1;
        return this.vars.RSTART;
      }
      default:
        throw new Error(`awk: unknown function ${name}()`);
    }
  }
  exec(stmt: Stmt): Flow {
    switch (stmt.t) {
      case "block": {
        for (const s of stmt.xs) {
          const f = this.exec(s);
          if (f) return f;
        }
        return null;
      }
      case "expr":
        this.eval(stmt.e);
        return null;
      case "print": {
        if (stmt.printf) {
          const fmt = this.str(this.eval(stmt.xs[0] ?? { t: "str", s: "" }));
          const rest = stmt.xs.slice(1).map((x) => this.eval(x));
          this.emit(sprintf(fmt, rest));
        } else if (!stmt.xs.length) {
          this.emit((this.fields[0] ?? "") + "\n");
        } else {
          const bits = stmt.xs.map((x) => this.str(this.eval(x)));
          this.emit(bits.join(String(this.vars.OFS ?? this.ofs)) + "\n");
        }
        return null;
      }
      case "if":
        return this.truth(this.eval(stmt.c)) ? this.exec(stmt.a) : stmt.b ? this.exec(stmt.b) : null;
      case "while": {
        let guard = 0;
        while (this.truth(this.eval(stmt.c)) && guard++ < 100000) {
          const f = this.exec(stmt.a);
          if (f === "break") break;
          if (f === "continue") continue;
          if (f) return f;
        }
        return null;
      }
      case "for": {
        if (stmt.init) this.eval(stmt.init);
        let guard = 0;
        while ((stmt.c ? this.truth(this.eval(stmt.c)) : true) && guard++ < 100000) {
          const f = this.exec(stmt.a);
          if (f === "break") break;
          if (f === "exit" || f === "next") return f;
          if (stmt.step) this.eval(stmt.step);
        }
        return null;
      }
      case "forin": {
        const arr = this.vars[stmt.arr];
        if (typeof arr !== "object") return null;
        for (const k of Object.keys(arr)) {
          this.vars[stmt.k] = k;
          const f = this.exec(stmt.a);
          if (f === "break") break;
          if (f === "exit" || f === "next") return f;
        }
        return null;
      }
      case "next":
        return "next";
      case "exit":
        this.exited = true;
        return "exit";
      case "break":
        return "break";
      case "continue":
        return "continue";
      case "delete": {
        if (stmt.a.t === "index") {
          const arr = this.ensureArr(stmt.a.a);
          delete arr[this.str(this.eval(stmt.a.k))];
        } else if (stmt.a.t === "id") {
          delete this.vars[stmt.a.s];
        }
        return null;
      }
      default:
        return null;
    }
  }
  matchPat(pat: Node | null, line: string): boolean {
    if (!pat) return true;
    if (pat.t === "re") return new RegExp(pat.s).test(line);
    return this.truth(this.eval(pat));
  }
}

function splitFields(line: string, fs: string): string[] {
  if (fs === " " || fs === "") {
    const parts = line.trim() === "" ? [] : line.trim().split(/\s+/);
    return [line, ...parts];
  }
  let re: RegExp;
  try {
    re = fs.length === 1 ? new RegExp(escapeRe(fs)) : new RegExp(fs);
  } catch {
    re = new RegExp(escapeRe(fs));
  }
  return [line, ...line.split(re)];
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isNumeric(v: Val): boolean {
  if (typeof v !== "string") return false;
  if (v.trim() === "") return false;
  return Number.isFinite(Number(v));
}

function fmtNum(n: number, _ofmt: string) {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  const s = n.toPrecision(6);
  return s.replace(/\.?0+e/, "e").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function sprintf(fmt: string, args: Val[]): string {
  let i = 0;
  return fmt.replace(/%([-0]*)(\d+)?(?:\.(\d+))?([sdifgxX%])/g, (_, _flags, _w, prec, spec: string) => {
    if (spec === "%") return "%";
    const a = args[i++];
    const n = typeof a === "number" ? a : parseFloat(String(a ?? "0")) || 0;
    switch (spec) {
      case "s":
        return String(a ?? "");
      case "d":
      case "i":
        return String(Math.trunc(n));
      case "f":
        return n.toFixed(prec != null ? Number(prec) : 6);
      case "g":
        return fmtNum(n, "%.6g");
      case "x":
        return (Math.trunc(n) >>> 0).toString(16);
      case "X":
        return (Math.trunc(n) >>> 0).toString(16).toUpperCase();
      default:
        return String(a ?? "");
    }
  });
}

export function runAwk(program: string, input: string[], opts: AwkOpts = {}): string[] {
  const src = program.trim();
  if (!src) throw new Error("awk: empty program. Quote it: awk '{print $1}'");
  const rules = new Parser(lex(src)).parseProgram();
  const vm = new Vm(opts.fs ?? " ", opts.vars ?? {});
  const begins = rules.filter((r) => r.pat === "BEGIN");
  const ends = rules.filter((r) => r.pat === "END");
  const mid = rules.filter((r) => r.pat !== "BEGIN" && r.pat !== "END");
  for (const r of begins) {
    const f = vm.exec(r.body);
    if (f === "exit") {
      vm.flush();
      return vm.lines;
    }
  }
  let nr = 0;
  for (const line of input) {
    nr += 1;
    vm.setLine(line, nr);
    for (const r of mid) {
      if (!vm.matchPat(typeof r.pat === "string" ? null : r.pat, line)) continue;
      const f = vm.exec(r.body);
      if (f === "next") break;
      if (f === "exit") {
        vm.flush();
        for (const e of ends) vm.exec(e.body);
        vm.flush();
        return vm.lines;
      }
    }
  }
  for (const r of ends) vm.exec(r.body);
  vm.flush();
  return vm.lines;
}

export function parseAwkArgs(args: string[]): { program: string; fs: string; vars: Record<string, string | number> } {
  let fs = " ";
  const vars: Record<string, string | number> = {};
  let i = 0;
  while (i < args.length) {
    const a = args[i]!;
    if (a === "-F") {
      fs = args[i + 1] ?? " ";
      i += 2;
      continue;
    }
    if (a.startsWith("-F") && a.length > 2) {
      fs = a.slice(2);
      i += 1;
      continue;
    }
    if (a === "-v") {
      const spec = args[i + 1] ?? "";
      const eq = spec.indexOf("=");
      if (eq > 0) {
        const val = spec.slice(eq + 1);
        const n = Number(val);
        vars[spec.slice(0, eq)] = Number.isFinite(n) && val.trim() !== "" ? n : val;
      }
      i += 2;
      continue;
    }
    break;
  }
  return { program: args.slice(i).join(" "), fs, vars };
}
