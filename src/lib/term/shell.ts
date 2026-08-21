/** Small POSIX-flavored preprocessor: fors, functions, $vars, pipes, && ||, if/then/fi, case. */

import { parseAwkArgs, runAwk } from "./awk";

export function expandVars(s: string, env: Record<string, string>): string {
  let out = "";
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (quote === "'") {
      if (c === "'") quote = null;
      out += c;
      continue;
    }
    if (c === "'" && quote !== '"') {
      quote = "'";
      out += c;
      continue;
    }
    if (c === '"') {
      quote = quote === '"' ? null : '"';
      out += c;
      continue;
    }
    if (c === "$") {
      if (s[i + 1] === "{") {
        const end = s.indexOf("}", i + 2);
        if (end > 0) {
          const k = s.slice(i + 2, end);
          out += env[k] ?? env[k.toLowerCase()] ?? "";
          i = end;
          continue;
        }
      } else {
        const m = s.slice(i + 1).match(/^[A-Za-z_][A-Za-z0-9_]*/);
        if (m) {
          const k = m[0];
          if (Object.prototype.hasOwnProperty.call(env, k) || Object.prototype.hasOwnProperty.call(env, k.toLowerCase())) {
            out += env[k] ?? env[k.toLowerCase()] ?? "";
            i += k.length;
            continue;
          }
          out += "$" + k;
          i += k.length;
          continue;
        }
      }
    }
    out += c;
  }
  return out;
}

export function extractFunctions(src: string): { src: string; fns: Record<string, string> } {
  const fns: Record<string, string> = {};
  const next = src.replace(/(\w+)\s*\(\)\s*\{([\s\S]*?)\}/g, (_, name: string, body: string) => {
    fns[name] = body.trim();
    return `\n`;
  });
  return { src: next, fns };
}

export function unrollFor(src: string): string {
  return src.replace(/for\s+(\w+)\s+in\s+([^;\n]+)\s*;?\s*do\s+([\s\S]*?)\s*done/gi, (_, name: string, list: string, body: string) => {
    const items = list.trim().split(/\s+/).filter(Boolean);
    return items
      .map((item) =>
        body
          .trim()
          .replace(new RegExp(`\\$\\{${name}\\}|\\$${name}\\b`, "g"), item)
          .trim(),
      )
      .join("\n");
  });
}

export function evalTest(expr: string, env: Record<string, string> = {}): boolean {
  const cleaned = expandVars(expr, env)
    .replace(/^\[+/, "")
    .replace(/\]+$/, "")
    .replace(/^test\s+/i, "")
    .trim();
  if (!cleaned) return false;
  const parts = cleaned.split(/\s+/);
  if (parts[0] === "-n") return Boolean(parts[1]);
  if (parts[0] === "-z") return !parts[1];
  if (parts.length >= 3) {
    const aRaw = parts[0]!;
    const op = parts[1]!;
    const bRaw = parts[2]!;
    const a = Number(aRaw);
    const b = Number(bRaw);
    switch (op) {
      case "-gt":
        return a > b;
      case "-ge":
        return a >= b;
      case "-lt":
        return a < b;
      case "-le":
        return a <= b;
      case "-eq":
        return a === b;
      case "-ne":
        return a !== b;
      case "=":
      case "==":
        return aRaw === bRaw;
      case "!=":
        return aRaw !== bRaw;
      default:
        return Boolean(cleaned);
    }
  }
  if (parts[0] === "true") return true;
  if (parts[0] === "false") return false;
  const n = Number(cleaned);
  if (Number.isFinite(n)) return n !== 0;
  return Boolean(cleaned);
}

export function unrollIf(src: string, env: Record<string, string>): string {
  const withElse = /if\s+([\s\S]+?);?\s*then\s+([\s\S]*?)\s+else\s+([\s\S]*?)\s*fi/gi;
  const thenOnly = /if\s+([\s\S]+?);?\s*then\s+([\s\S]*?)\s*fi/gi;
  const first = src.replace(withElse, (_, cond: string, thenB: string, elseB: string) =>
    (evalTest(cond, env) ? thenB : elseB).trim(),
  );
  return first.replace(thenOnly, (_, cond: string, thenB: string) => (evalTest(cond, env) ? thenB : "").trim());
}

export function unrollCase(src: string, env: Record<string, string>): string {
  return src.replace(/case\s+(\S+)\s+in\s+([\s\S]*?)\s*esac/gi, (_, word: string, body: string) => {
    const value = expandVars(word, env);
    const arms = body.split(";;").map((a) => a.trim()).filter(Boolean);
    for (const arm of arms) {
      const m = arm.match(/^([^)]+)\)\s*([\s\S]*)$/);
      if (!m) continue;
      const pat = m[1]!.trim();
      const cmds = m[2]!.trim();
      if (pat === "*" || pat === value || globMatch(pat, value)) return cmds;
    }
    return "";
  });
}

function globMatch(pat: string, value: string): boolean {
  const re = new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
  return re.test(value);
}

export function splitPipes(raw: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (quote) {
      if (ch === quote) quote = null;
      cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === "|" && raw[i + 1] !== "|") {
      const t = cur.trim();
      if (t) out.push(t);
      cur = "";
      continue;
    }
    cur += ch;
  }
  const t = cur.trim();
  if (t) out.push(t);
  return out;
}

export function splitAndOr(raw: string): { op: "start" | "and" | "or"; text: string }[] {
  const out: { op: "start" | "and" | "or"; text: string }[] = [];
  let cur = "";
  let quote: string | null = null;
  let op: "start" | "and" | "or" = "start";
  const push = () => {
    const t = cur.trim();
    if (t) out.push({ op, text: t });
    cur = "";
  };
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (quote) {
      if (ch === quote) quote = null;
      cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === "&" && raw[i + 1] === "&") {
      push();
      op = "and";
      i++;
      continue;
    }
    if (ch === "|" && raw[i + 1] === "|") {
      push();
      op = "or";
      i++;
      continue;
    }
    cur += ch;
  }
  push();
  return out.length ? out : [{ op: "start", text: raw.trim() }];
}

export const FILTERS = new Set(["grep", "awk", "head", "tail", "wc", "sort", "cut", "uniq", "tr", "sed", "tee"]);

export function runFilter(cmd: string, args: string[], stdin: string[]): string[] {
  const lines = stdin;
  switch (cmd) {
    case "grep": {
      const invert = args.includes("-v");
      const rest = args.filter((a) => a !== "-v" && a !== "-i" && a !== "-E");
      const pat = rest[0] ?? "";
      const re = new RegExp(pat, args.includes("-i") ? "i" : "");
      return lines.filter((l) => (invert ? !re.test(l) : re.test(l)));
    }
    case "head": {
      const n = Number(args.find((a) => /^\d+$/.test(a)) ?? args[args.indexOf("-n") + 1] ?? 10);
      return lines.slice(0, Number.isFinite(n) ? n : 10);
    }
    case "tail": {
      const n = Number(args.find((a) => /^\d+$/.test(a)) ?? args[args.indexOf("-n") + 1] ?? 10);
      return lines.slice(-(Number.isFinite(n) ? n : 10));
    }
    case "wc":
      if (args.includes("-l") || !args.length) return [String(lines.length)];
      return [`${lines.length} ${lines.join(" ").length}`];
    case "sort": {
      const next = [...lines];
      next.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      if (args.includes("-r")) next.reverse();
      return next;
    }
    case "uniq":
      return lines.filter((l, i) => l !== lines[i - 1]);
    case "cut": {
      const f = args.find((a) => a.startsWith("-f"));
      const idx = Number((f ?? "-f1").replace("-f", "").replace("=", "")) - 1;
      return lines.map((l) => l.trim().split(/\s+/)[Math.max(0, idx)] ?? "");
    }
    case "tr": {
      const a = args[0] ?? "";
      const b = args[1] ?? "";
      return lines.map((l) => l.split(a).join(b));
    }
    case "sed": {
      const expr = args.join(" ");
      const m = expr.match(/s\/([^/]+)\/([^/]*)\/([gip]*)/);
      if (!m) return lines;
      const re = new RegExp(m[1]!, m[3]!.includes("g") ? "g" : "");
      return lines.map((l) => l.replace(re, m[2]!));
    }
    case "tee":
      return lines;
    case "awk": {
      const { program, fs, vars } = parseAwkArgs(args);
      return runAwk(program, lines, { fs, vars });
    }
    default:
      return lines;
  }
}

export function preprocess(src: string, env: Record<string, string>): { body: string; fns: Record<string, string> } {
  const { src: stripped, fns } = extractFunctions(src);
  const unrolled = unrollFor(stripped);
  const expanded = expandVars(unrolled, env);
  const iffed = unrollIf(expanded, env);
  const cased = unrollCase(iffed, env);
  return { body: cased, fns };
}
