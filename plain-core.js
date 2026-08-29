const PLAIN_VERSION = "0.6.2";

/* ============================================================
   Plain — core language
   set/change · sealed actions · value semantics · sort_up/sort_down
   ============================================================ */

const MAX_DEPTH = 300;

const KEYWORDS = new Set([
  "set","change","to","show","if","else","end","for","each","in","repeat","times",
  "while","make","give","is","not","and","or","true","false","nothing",
  "more","less","than","at","most","least","stop"
]);

// Names removed in v0.2, kept so the error can teach the replacement.
const RETIRED = { sort: ["sort_up", "sort_down"] };

class PlainError extends Error {
  constructor(message, tok, extra) {
    super(message);
    this.plain = true;
    this.line = tok ? tok.line : 1;
    this.col = tok ? tok.col : 1;
    this.len = tok ? Math.max(1, String(tok.text).length) : 1;
    this.hint = (extra && extra.hint) || null;
    this.fix = (extra && extra.fix) || null;
  }
}

/* ---------- tokeniser ---------- */

function tokenise(src) {
  const toks = [];
  let i = 0, line = 1, col = 1;
  const push = (type, text, l, c) => toks.push({ type, text, line: l, col: c });
  const isDigit = ch => ch >= "0" && ch <= "9";

  while (i < src.length) {
    const ch = src[i];

    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { push("newline", "\n", line, col); i++; line++; col = 1; continue; }
    if (ch === " " || ch === "\t") { i++; col++; continue; }
    if (ch === "#") { while (i < src.length && src[i] !== "\n") i++; continue; }

    if (isDigit(ch)) {
      const startCol = col; let text = "";
      while (i < src.length && (isDigit(src[i]) || src[i] === ".")) { text += src[i]; i++; col++; }
      if ((text.match(/\./g) || []).length > 1)
        throw new PlainError(`"${text}" is not a number I can read.`, { line, col: startCol, text });
      push("number", text, line, startCol);
      continue;
    }

    if (ch === '"') {
      const startCol = col, startLine = line;
      let value = "", raw = '"';
      i++; col++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === "\n")
          throw new PlainError("This text was never closed with a second quote mark.",
            { line: startLine, col: startCol, text: '"' },
            { hint: 'Every piece of text needs a quote mark at each end, like "hello".' });
        if (src[i] === "\\" && i + 1 < src.length) {
          const n = src[i + 1];
          value += n === "n" ? "\n" : n === "t" ? "\t" : n;
          raw += src[i] + n; i += 2; col += 2; continue;
        }
        value += src[i]; raw += src[i]; i++; col++;
      }
      if (i >= src.length)
        throw new PlainError("This text was never closed with a second quote mark.",
          { line: startLine, col: startCol, text: '"' },
          { hint: 'Every piece of text needs a quote mark at each end, like "hello".' });
      i++; col++; raw += '"';
      toks.push({ type: "text", text: raw, value, line: startLine, col: startCol });
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const startCol = col; let text = "";
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) { text += src[i]; i++; col++; }
      push(KEYWORDS.has(text) ? "keyword" : "name", text, line, startCol);
      continue;
    }

    const two = src.substr(i, 2);
    if (two === "==" || two === ">=" || two === "<=" || two === "!=") {
      push("symbol", two, line, col); i += 2; col += 2; continue;
    }
    if ("+-*/%()[]{},.:=<>".includes(ch)) {
      push("symbol", ch, line, col); i++; col++; continue;
    }

    throw new PlainError(`I don't recognise the character "${ch}".`, { line, col, text: ch });
  }
  push("end-of-file", "end of the program", line, col);
  return toks;
}

/* ---------- parser ---------- */

class Parser {
  constructor(toks) { this.toks = toks; this.pos = 0; this.blockDepth = 0; this.blockLog = []; }

  peek(o = 0) { return this.toks[Math.min(this.pos + o, this.toks.length - 1)]; }
  next() { return this.toks[this.pos++]; }
  skipBlank() { while (this.peek().type === "newline") this.pos++; }

  is(text, o = 0) {
    const t = this.peek(o);
    return (t.type === "keyword" || t.type === "symbol") && t.text === text;
  }

  expectAlone(text, what) {
    const tok = this.expect(text, what);
    if (this.peek().type !== "newline" && this.peek().type !== "end-of-file")
      throw new PlainError(`"${text}" needs a line of its own.`, tok,
        { hint: `Put ${describeToken(this.peek())} on the next line.` });
    return tok;
  }

  expect(text, what) {
    if (this.is(text)) return this.next();
    const t = this.peek();
    throw new PlainError(`I expected ${what} here, but found ${describeToken(t)}.`, t);
  }

  endOfStatement() {
    if (this.peek().type === "newline" || this.peek().type === "end-of-file") return;
    const t = this.peek();
    throw new PlainError(`I didn't expect ${describeToken(t)} here.`, t,
      { hint: "Each instruction goes on its own line." });
  }

  parseProgram() {
    const body = [];
    this.skipBlank();
    while (this.peek().type !== "end-of-file") {
      body.push(this.parseStatement());
      this.skipBlank();
    }
    return { kind: "block", body };
  }

  parseBlock(closers, opener) {
    const body = [];
    this.blockDepth++;
    const entry = { opener, closedOn: null };
    this.blockLog.push(entry);
    this.skipBlank();
    while (true) {
      const t = this.peek();
      if (t.type === "end-of-file") {
        // Say which "end" closed what, so a missing one in a nest is findable.
        const opened = this.blockLog.length;
        const closed = this.blockLog.filter(b => b.closedOn !== null).length;
        const lastClosed = [...this.blockLog].reverse().find(b => b.closedOn !== null);
        let hint = `Add "end" on its own line to close the "${opener.text}" that starts on line ${opener.line}.`;
        if (opened > 1) {
          hint = `${opened} blocks were opened and only ${closed} "end"${closed === 1 ? " was" : "s were"} found.`;
          if (lastClosed)
            hint += ` The "end" on line ${lastClosed.closedOn} closed the "${lastClosed.opener.text}" from line ${lastClosed.opener.line}.`;
          hint += ` Every "make", "if", "for", "while" and "repeat" needs one of its own.`;
        }
        throw new PlainError(`This "${opener.text}" from line ${opener.line} was never closed.`, opener, { hint });
      }
      if (t.type === "keyword" && closers.includes(t.text)) break;
      body.push(this.parseStatement());
      this.skipBlank();
    }
    this.blockDepth--;
    entry.closedOn = this.peek().line;
    return { kind: "block", body };
  }

  parseStatement() {
    const t = this.peek();

    if (t.type === "keyword") {
      switch (t.text) {
        case "set": return this.parseAssign("set");
        case "change": return this.parseAssign("change");
        case "show": return this.parseShow();
        case "if": return this.parseIf();
        case "for": return this.parseFor();
        case "while": return this.parseWhile();
        case "repeat": return this.parseRepeat();
        case "make": return this.parseMake();
        case "give": return this.parseGive();
        case "stop": { this.next(); this.endOfStatement(); return { kind: "stop", tok: t }; }
        case "end":
          throw new PlainError(`This "end" doesn't close anything.`, t,
            { hint: `Every "end" needs a matching "if", "for", "while", "repeat" or "make" above it.` });
      }
    }

    if (t.type === "name" && this.is("=", 1)) {
      const rest = this.sourceAfterEquals();
      throw new PlainError(`Plain has no "=".`, t, {
        hint: `Use "set ${t.text} to ..." to create it, or "change ${t.text} to ..." if it already exists.`,
        fix: { line: t.line, col: t.col, len: this.lengthToEndOfLine(t), replacement: `set ${t.text} to ${rest}` }
      });
    }

    const expr = this.parseExpression();
    this.endOfStatement();
    if (expr.kind === "call") { expr.wholeStatement = true; return { kind: "expression-statement", expr, tok: t }; }
    throw new PlainError(`This line doesn't do anything.`, t,
      { hint: `Did you mean to start it with "show", "set" or "change"?` });
  }

  sourceAfterEquals() {
    let j = this.pos + 2, parts = [];
    while (j < this.toks.length && this.toks[j].type !== "newline" && this.toks[j].type !== "end-of-file") {
      parts.push(this.toks[j].text); j++;
    }
    return parts.join(" ");
  }

  lengthToEndOfLine(startTok) {
    let j = this.pos, last = startTok;
    while (j < this.toks.length && this.toks[j].type !== "newline" && this.toks[j].type !== "end-of-file") {
      last = this.toks[j]; j++;
    }
    return (last.col + String(last.text).length) - startTok.col;
  }

  parseAssign(word) {
    const kw = this.next();
    const nameTok = this.peek();
    if (nameTok.type !== "name")
      throw new PlainError(`After "${word}" I need a name, but found ${describeToken(nameTok)}.`, nameTok,
        { hint: `Names start with a letter, like: ${word} total to 0` });
    this.next();
    let target = { kind: "name", name: nameTok.text, tok: nameTok };
    while (this.is(".") || this.is("[")) {
      if (this.is(".")) {
        this.next();
        const f = this.peek();
        if (f.type !== "name") throw new PlainError(`After "." I need a field name.`, f);
        this.next();
        target = { kind: "field", object: target, field: f.text, tok: f };
      } else {
        const open = this.next();
        const idx = this.parseExpression();
        this.expect("]", 'a closing "]"');
        target = { kind: "index", object: target, index: idx, tok: open };
      }
    }
    if (word === "set" && target.kind !== "name")
      throw new PlainError(`"set" creates a whole new name, so it can't have a "." or "[" after it.`, target.tok,
        { hint: `To alter part of something that already exists, use "change".` });
    if (!this.is("to")) {
      const t = this.peek();
      throw new PlainError(`After "${word} ${nameTok.text}" I need the word "to".`, t,
        { hint: `For example: ${word} ${nameTok.text} to 10` });
    }
    this.next();
    const value = this.parseExpression();
    if (value.kind === "call") value.wholeStatement = true;
    this.endOfStatement();
    return { kind: word, target, value, tok: kw, nameTok };
  }

  parseShow() {
    const kw = this.next();
    const parts = [this.parseExpression()];
    while (this.is(",")) { this.next(); parts.push(this.parseExpression()); }
    this.endOfStatement();
    return { kind: "show", parts, tok: kw };
  }

  parseIf() {
    const kw = this.next();
    const test = this.parseExpression();
    const then = this.parseBlock(["else", "end"], kw);
    let otherwise = null;
    if (this.is("else")) {
      const elseTok = this.next();
      if (!this.is("if") && this.peek().type !== "newline" && this.peek().type !== "end-of-file")
        throw new PlainError(`"else" needs a line of its own.`, elseTok,
          { hint: `Put ${describeToken(this.peek())} on the next line. Since Plain ignores indentation, keeping "else" alone is what makes the shape of a program readable.` });
      if (this.is("if")) {
        otherwise = { kind: "block", body: [this.parseIf()] };
        return { kind: "if", test, then, otherwise, tok: kw };
      }
      otherwise = this.parseBlock(["end"], kw);
    }
    this.expectAlone("end", 'the word "end"');
    return { kind: "if", test, then, otherwise, tok: kw };
  }

  parseFor() {
    const kw = this.next();
    this.expect("each", 'the word "each"');
    const nameTok = this.peek();
    if (nameTok.type !== "name")
      throw new PlainError(`After "for each" I need a name for one item.`, nameTok,
        { hint: `For example: for each item in shopping` });
    this.next();
    this.expect("in", 'the word "in"');
    const list = this.parseExpression();
    const body = this.parseBlock(["end"], kw);
    this.expectAlone("end", 'the word "end"');
    return { kind: "for", name: nameTok.text, nameTok, list, body, tok: kw };
  }

  parseWhile() {
    const kw = this.next();
    const test = this.parseExpression();
    const body = this.parseBlock(["end"], kw);
    this.expectAlone("end", 'the word "end"');
    return { kind: "while", test, body, tok: kw };
  }

  parseRepeat() {
    const kw = this.next();
    const count = this.parseExpression();
    this.expect("times", 'the word "times"');
    const body = this.parseBlock(["end"], kw);
    this.expectAlone("end", 'the word "end"');
    return { kind: "repeat", count, body, tok: kw };
  }

  parseMake() {
    const kw = this.next();
    if (this.blockDepth > 0)
      throw new PlainError(`Actions can only be made at the top level of a program.`, kw,
        { hint: `Move this "make" above the block it's inside. Actions can call each other, so nothing is lost.` });
    const nameTok = this.peek();
    if (nameTok.type !== "name")
      throw new PlainError(`After "make" I need a name for the action.`, nameTok,
        { hint: `For example: make double(n)` });
    this.next();
    this.expect("(", 'an opening "("');
    const params = [], paramToks = [];
    if (!this.is(")")) {
      while (true) {
        const p = this.peek();
        if (p.type !== "name") throw new PlainError(`I need a name for this input.`, p);
        this.next();
        if (params.includes(p.text))
          throw new PlainError(`This action already has an input called "${p.text}".`, p,
            { hint: `Each input needs its own name.` });
        params.push(p.text); paramToks.push(p);
        if (this.is(",")) { this.next(); continue; }
        break;
      }
    }
    this.expect(")", 'a closing ")"');
    const body = this.parseBlock(["end"], kw);
    this.expectAlone("end", 'the word "end"');
    return { kind: "make", name: nameTok.text, nameTok, params, paramToks, body, tok: kw };
  }

  parseGive() {
    const kw = this.next();
    let value = null;
    if (this.peek().type !== "newline" && this.peek().type !== "end-of-file") value = this.parseExpression();
    this.endOfStatement();
    return { kind: "give", value, tok: kw };
  }

  /* expressions */

  parseExpression() { return this.parseOr(); }

  parseOr() {
    let left = this.parseAnd();
    while (this.is("or")) { const op = this.next(); left = { kind: "logic", op: "or", left, right: this.parseAnd(), tok: op }; }
    return left;
  }

  parseAnd() {
    let left = this.parseComparison();
    while (this.is("and")) { const op = this.next(); left = { kind: "logic", op: "and", left, right: this.parseComparison(), tok: op }; }
    return left;
  }

  parseComparison() {
    let left = this.parseSum();
    while (this.is("is")) {
      const op = this.next();
      let kind;
      if (this.is("not")) { this.next(); kind = "is not"; }
      else if (this.is("more")) { this.next(); this.expect("than", 'the word "than"'); kind = "more"; }
      else if (this.is("less")) { this.next(); this.expect("than", 'the word "than"'); kind = "less"; }
      else if (this.is("at")) {
        this.next();
        if (this.is("least")) { this.next(); kind = "at least"; }
        else if (this.is("most")) { this.next(); kind = "at most"; }
        else throw new PlainError(`After "is at" I expect "least" or "most".`, this.peek());
      } else kind = "is";
      left = { kind: "compare", op: kind, left, right: this.parseSum(), tok: op };
    }
    if (this.is("<") || this.is(">") || this.is("==") || this.is(">=") || this.is("<=")) {
      const t = this.peek();
      const word = { "<": "is less than", ">": "is more than", "==": "is", ">=": "is at least", "<=": "is at most" }[t.text];
      throw new PlainError(`Plain writes comparisons in words.`, t,
        { hint: `Use "${word}" instead of "${t.text}".`,
          fix: { line: t.line, col: t.col, len: t.text.length, replacement: word } });
    }
    return left;
  }

  // The literal source between two tokens on one line, used to offer a rewrite.
  textBetween(open, close) {
    const parts = [];
    for (const tk of this.toks) {
      if (tk.line !== open.line) continue;
      if (tk.col <= open.col || tk.col >= close.col) continue;
      parts.push(tk.type === "text" ? tk.text : tk.text);
    }
    return parts.join("").replace(/,/g, ", ").replace(/\s+/g, " ").trim();
  }

  parseSum() {
    let left = this.parseProduct();
    while (this.is("+") || this.is("-")) {
      const op = this.next();
      left = { kind: "arith", op: op.text, left, right: this.parseProduct(), tok: op };
    }
    return left;
  }

  parseProduct() {
    let left = this.parseUnary();
    while (this.is("*") || this.is("/") || this.is("%")) {
      const op = this.next();
      left = { kind: "arith", op: op.text, left, right: this.parseUnary(), tok: op };
    }
    return left;
  }

  parseUnary() {
    if (this.is("not")) { const op = this.next(); return { kind: "not", value: this.parseUnary(), tok: op }; }
    if (this.is("-")) { const op = this.next(); return { kind: "negate", value: this.parseUnary(), tok: op }; }
    return this.parsePostfix();
  }

  parsePostfix() {
    let node = this.parsePrimary();
    while (true) {
      if (this.is("(")) {
        const open = this.next();
        const args = [];
        if (!this.is(")")) {
          while (true) { args.push(this.parseExpression()); if (this.is(",")) { this.next(); continue; } break; }
        }
        this.expect(")", 'a closing ")"');
        node = { kind: "call", callee: node, args, tok: node.tok || open };
      } else if (this.is(".")) {
        this.next();
        const f = this.peek();
        if (f.type !== "name") throw new PlainError(`After "." I need a field name.`, f);
        this.next();
        node = { kind: "field", object: node, field: f.text, tok: f };
      } else if (this.is("[")) {
        const open = this.next();
        const idx = this.parseExpression();
        this.expect("]", 'a closing "]"');
        node = { kind: "index", object: node, index: idx, tok: open };
      } else break;
    }
    return node;
  }

  parsePrimary() {
    const t = this.peek();

    if (t.type === "number") { this.next(); return { kind: "literal", value: Number(t.text), tok: t }; }
    if (t.type === "text") { this.next(); return { kind: "literal", value: t.value, tok: t }; }
    if (t.type === "name") { this.next(); return { kind: "name", name: t.text, tok: t }; }

    if (this.is("true")) { this.next(); return { kind: "literal", value: true, tok: t }; }
    if (this.is("false")) { this.next(); return { kind: "literal", value: false, tok: t }; }
    if (this.is("nothing")) { this.next(); return { kind: "literal", value: null, tok: t }; }

    if (this.is("(")) {
      const open = this.next();
      const e = this.parseExpression();
      if (this.is(",")) {
        let j = this.pos;
        let depth = 0, close = null;
        while (j < this.toks.length) {
          const tk = this.toks[j];
          if (tk.type === "newline" || tk.type === "end-of-file") break;
          if (tk.text === "(" || tk.text === "[") depth++;
          if (tk.text === ")" && depth === 0) { close = tk; break; }
          if (tk.text === ")" || tk.text === "]") depth--;
          j++;
        }
        throw new PlainError(`Lists are written with square brackets, not round ones.`, open, {
          hint: `Round brackets group a calculation, like (2 + 3) * 4. To make a list, use [ ].`,
          fix: close ? { line: open.line, col: open.col, len: (close.col + 1) - open.col,
                         replacement: "[" + this.textBetween(open, close) + "]" } : null
        });
      }
      this.expect(")", 'a closing ")"');
      return e;
    }

    if (this.is("[")) {
      const open = this.next();
      const items = [];
      this.skipBlank();
      if (!this.is("]")) {
        while (true) {
          this.skipBlank();
          items.push(this.parseExpression());
          this.skipBlank();
          if (this.is(",")) { this.next(); this.skipBlank(); if (this.is("]")) break; continue; }
          break;
        }
      }
      this.expect("]", 'a closing "]"');
      return { kind: "list", items, tok: open };
    }

    if (this.is("{")) {
      const open = this.next();
      const fields = [];
      this.skipBlank();
      if (!this.is("}")) {
        while (true) {
          this.skipBlank();
          const k = this.peek();
          if (k.type !== "name" && k.type !== "text")
            throw new PlainError(`A record field needs a name before the ":".`, k,
              { hint: `For example: {name: "Ada", age: 36}` });
          this.next();
          this.expect(":", 'a ":"');
          fields.push({ key: k.type === "text" ? k.value : k.text, value: this.parseExpression() });
          this.skipBlank();
          if (this.is(",")) { this.next(); this.skipBlank(); if (this.is("}")) break; continue; }
          break;
        }
      }
      this.expect("}", 'a closing "}"');
      return { kind: "record", fields, tok: open };
    }

    throw new PlainError(`I didn't expect ${describeToken(t)} here.`, t);
  }
}

function describeToken(t) {
  if (t.type === "end-of-file") return "the end of the program";
  if (t.type === "newline") return "the end of the line";
  if (t.type === "text") return `the text ${t.text}`;
  if (t.type === "number") return `the number ${t.text}`;
  return `"${t.text}"`;
}

/* ---------- values ---------- */

function fmtNumber(n) {
  if (!isFinite(n)) return n > 0 ? "infinity" : "-infinity";
  const r = Math.round(n * 1e10) / 1e10;
  return Object.is(r, -0) ? "0" : String(r);
}

function isRecord(v) { return v !== null && typeof v === "object" && v.__record === true; }
function makeRecord(map) { return { __record: true, fields: map }; }
function isAction(v) { return v !== null && typeof v === "object" && v.__action === true; }

function toDisplay(v) {
  if (v === null) return "nothing";
  if (typeof v === "string") return v;
  if (typeof v === "number") return fmtNumber(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return "[" + v.map(toNested).join(", ") + "]";
  if (isRecord(v)) return "{" + Object.entries(v.fields).map(([k, x]) => `${k}: ${toNested(x)}`).join(", ") + "}";
  if (isAction(v)) return `the action ${v.name}`;
  return String(v);
}
function toNested(v) { return typeof v === "string" ? JSON.stringify(v) : toDisplay(v); }

function describeValue(v) {
  if (v === null) return "nothing";
  if (typeof v === "string") return `the text ${JSON.stringify(v)}`;
  if (typeof v === "number") return `the number ${fmtNumber(v)}`;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return `a list of ${v.length} item${v.length === 1 ? "" : "s"}`;
  if (isRecord(v)) return "a record";
  if (isAction(v)) return `the action ${v.name}`;
  return String(v);
}

function typeWord(v) {
  if (v === null) return "nothing";
  if (typeof v === "string") return "text";
  if (typeof v === "number") return "a number";
  if (typeof v === "boolean") return "a true/false value";
  if (Array.isArray(v)) return "a list";
  if (isRecord(v)) return "a record";
  if (isAction(v)) return "an action";
  return "a value";
}

function sameValue(a, b) {
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => sameValue(x, b[i]));
  if (isRecord(a) && isRecord(b)) {
    const ka = Object.keys(a.fields), kb = Object.keys(b.fields);
    return ka.length === kb.length && ka.every(k => k in b.fields && sameValue(a.fields[k], b.fields[k]));
  }
  return a === b;
}

// Every binding takes a copy, so two names can never share one list or record.
function copyValue(v) {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(copyValue);
  if (isRecord(v)) {
    const out = {};
    for (const k of Object.keys(v.fields)) out[k] = copyValue(v.fields[k]);
    return makeRecord(out);
  }
  return v;                       // actions are definitions, not data
}

// Ordering for text: capitals and accents ignored, with an exact tiebreak
// so the result is still a total order.
let baseCollator = null, exactCollator = null;
function compareText(a, b) {
  if (!baseCollator) {
    try {
      baseCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
      exactCollator = new Intl.Collator(undefined, { sensitivity: "variant", numeric: true });
    } catch (e) {
      baseCollator = { compare: (x, y) => (x.toLowerCase() < y.toLowerCase() ? -1 : x.toLowerCase() > y.toLowerCase() ? 1 : 0) };
      exactCollator = { compare: (x, y) => (x < y ? -1 : x > y ? 1 : 0) };
    }
  }
  const c = baseCollator.compare(a, b);
  return c !== 0 ? c : exactCollator.compare(a, b);
}

function roundAwayFromZero(x) { return x < 0 ? -Math.round(-x) : Math.round(x); }

function roundTo(n, places) {
  const f = Math.pow(10, places);
  const scaled = Number((n * f).toPrecision(15));
  return roundAwayFromZero(scaled) / f;
}

/* ---------- scope ---------- */

class Scope {
  constructor(parent, kind) { this.vars = new Map(); this.parent = parent || null; this.kind = kind || "block"; }
  has(n) { return this.vars.has(n) || (this.parent ? this.parent.has(n) : false); }
  get(n) { return this.vars.has(n) ? this.vars.get(n) : (this.parent ? this.parent.get(n) : undefined); }
  setExisting(n, v) {
    if (this.vars.has(n)) { this.vars.set(n, v); return true; }
    return this.parent ? this.parent.setExisting(n, v) : false;
  }
  define(n, v) { this.vars.set(n, v); }
  userNames(acc = new Set()) {
    if (this.kind !== "builtin") {
      for (const k of this.vars.keys()) acc.add(k);
      if (this.parent) this.parent.userNames(acc);
    }
    return acc;
  }
  allNames(acc = new Set()) {
    for (const k of this.vars.keys()) acc.add(k);
    if (this.parent) this.parent.allNames(acc);
    return acc;
  }
}

function distance(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

function nearest(target, names) {
  let best = null, bestD = Infinity;
  for (const n of names) {
    const d = distance(target.toLowerCase(), n.toLowerCase());
    if (d < bestD) { bestD = d; best = n; }
  }
  const limit = target.length <= 4 ? 1 : 2;
  return bestD <= limit ? best : null;
}

// Names the user wrote themselves are suggested before built-ins.
function suggestName(target, scope) {
  return nearest(target, [...scope.userNames()]) || nearest(target, [...scope.allNames()]);
}

/* ---------- finding where a vanished name was created ---------- */

function findCreationSite(node, name, enclosing) {
  if (!node || typeof node !== "object") return null;

  if (node.kind === "block") {
    for (const st of node.body) {
      const found = findCreationSite(st, name, enclosing);
      if (found) return found;
    }
    return null;
  }

  if (node.kind === "set" && node.target && node.target.kind === "name" && node.target.name === name)
    return enclosing ? { blockTok: enclosing, setTok: node.nameTok } : null;

  if (node.kind === "make" && node.name === name)
    return enclosing ? { blockTok: enclosing, setTok: node.nameTok, madeWith: "make" } : { madeWith: "make", topLevel: true };

  if (node.kind === "for" && node.name === name && enclosing !== null)
    return { blockTok: node.tok, setTok: node.nameTok, loopVar: true };

  const opens = ["if", "for", "while", "repeat", "make"];
  const inner = opens.includes(node.kind) ? node.tok : enclosing;

  if (node.kind === "for") {
    const found = findCreationSite(node.body, name, node.tok);
    if (found) return found;
    // the loop's own name also vanishes at "end"
    if (node.name === name) return { blockTok: node.tok, setTok: node.nameTok, loopVar: true };
    return null;
  }

  for (const key of ["body", "then", "otherwise"]) {
    const found = findCreationSite(node[key], name, inner);
    if (found) return found;
  }
  return null;
}

function insideAction(scope) {
  for (let s = scope; s; s = s.parent) if (s.kind === "global") return false;
  return true;
}

/* ---------- signals ---------- */

class GiveSignal { constructor(value) { this.value = value; } }
class StopSignal { }

/* ---------- interpreter ---------- */

class Interpreter {
  constructor(onShow) {
    this.onShow = onShow;
    this.steps = 0;
    this.started = Date.now();
    this.builtins = new Scope(null, "builtin");
    installBuiltins(this.builtins, this);
    this.globals = new Scope(this.builtins, "global");
    this.program = null;
    this.depth = 0;
    this.fromAsk = new Set();
  }

  tick(tok) {
    this.steps++;
    if (this.steps > 4000000)
      throw new PlainError("This program was still running after four million steps, so I stopped it.", tok,
        { hint: "A loop is probably never reaching its stopping point. Check that its test can become false." });
    if ((this.steps & 1023) === 0 && Date.now() - this.started > 5000)
      throw new PlainError("This program ran for more than five seconds, so I stopped it.", tok,
        { hint: "A loop is probably never reaching its stopping point. Check that its test can become false." });
  }

  async run(program) { this.program = program; await this.execBlock(program, this.globals); }

  async execBlock(block, scope) { for (const st of block.body) await this.exec(st, scope); }

  /* declaring a new name */
  declare(scope, name, value, tok, what) {
    if (scope.has(name)) {
      const isBuiltin = this.builtins.has(name) && !scope.userNames().has(name);
      throw new PlainError(
        isBuiltin
          ? `"${name}" is already the name of a built-in action.`
          : `"${name}" already exists.`,
        tok,
        isBuiltin
          ? { hint: `Pick a different name, or you won't be able to use ${name}() any more.` }
          : {
              hint: `To give it a new value, use "change ${name} to ...".`,
              fix: what === "set" ? { line: tok.line, col: tok.col - 4, len: 3, replacement: "change" } : null
            });
    }
    scope.define(name, value);
  }

  async exec(node, scope) {
    this.tick(node.tok);
    switch (node.kind) {
      case "set": {
        const value = copyValue(await this.eval(node.value, scope));
        this.declare(scope, node.target.name, value, node.nameTok, "set");
        this.noteAskOrigin(node);
        return;
      }
      case "change": return await this.execChange(node, scope);
      case "show": {
        const shown = await Promise.all(node.parts.map(p => this.eval(p, scope)));
        this.onShow(shown.map(toDisplay).join(" "));
        return;
      }
      case "if": {
        if (await this.condition(node.test, scope, "if")) await this.execBlock(node.then, new Scope(scope));
        else if (node.otherwise) await this.execBlock(node.otherwise, new Scope(scope));
        return;
      }
      case "while": {
        while (await this.condition(node.test, scope, "while")) {
          this.tick(node.tok);
          try { await this.execBlock(node.body, new Scope(scope)); }
          catch (e) { if (e instanceof StopSignal) break; throw e; }
        }
        return;
      }
      case "repeat": {
        const n = await this.eval(node.count, scope);
        if (typeof n !== "number")
          throw new PlainError(`"repeat" needs a number of times, but got ${describeValue(n)}.`, node.tok);
        if (Math.floor(n) !== n)
          throw new PlainError(`"repeat" needs a whole number of times, but got ${fmtNumber(n)}.`, node.tok,
            { hint: `Use round(${fmtNumber(n)}) for ${fmtNumber(roundAwayFromZero(n))} times, or write the whole number you meant.` });
        for (let i = 0; i < n; i++) {
          this.tick(node.tok);
          try { await this.execBlock(node.body, new Scope(scope)); }
          catch (e) { if (e instanceof StopSignal) break; throw e; }
        }
        return;
      }
      case "for": {
        const list = await this.eval(node.list, scope);
        let items;
        if (Array.isArray(list)) items = list.slice();
        else if (typeof list === "string") items = list.split("");
        else throw new PlainError(`"for each" needs a list to go through, but got ${describeValue(list)}.`, node.tok,
          { hint: isRecord(list) ? `To go through a record, use: for each field in keys(...)` : null });
        if (scope.has(node.name))
          throw new PlainError(`"${node.name}" already exists, so it can't also be the loop's name.`, node.nameTok,
            { hint: `Pick a different name for each item.` });
        for (const item of items) {
          this.tick(node.tok);
          const inner = new Scope(scope);
          inner.define(node.name, copyValue(item));
          try { await this.execBlock(node.body, inner); }
          catch (e) { if (e instanceof StopSignal) break; throw e; }
        }
        return;
      }
      case "make": {
        this.declare(scope, node.name,
          { __action: true, name: node.name, params: node.params, body: node.body }, node.nameTok, "make");
        return;
      }
      case "give": throw new GiveSignal(node.value ? await this.eval(node.value, scope) : null);
      case "stop": throw new StopSignal();
      case "expression-statement": await this.eval(node.expr, scope); return;
      default: throw new PlainError("I don't know how to run this line.", node.tok);
    }
  }

  async condition(node, scope, word) {
    const v = await this.eval(node, scope);
    if (typeof v !== "boolean") {
      let hint = `${word === "if" ? "An" : "A"} "${word}" needs a true/false test.`;
      if (typeof v === "number") hint += ` Try comparing it, like: ... is more than 0`;
      else if (typeof v === "string") hint += ` Try comparing it, like: ... is "yes"`;
      else if (Array.isArray(v)) hint += ` Try: count(...) is more than 0`;
      throw new PlainError(`This test gave ${describeValue(v)} instead of true or false.`, node.tok, { hint });
    }
    return v;
  }

  // Remembers which names hold an answer from "ask", so the error can say so.
  noteAskOrigin(node) {
    if (node.target && node.target.kind === "name") {
      const v = node.value;
      const isAsk = v && v.kind === "call" && v.callee && v.callee.kind === "name" && v.callee.name === "ask";
      if (isAsk) this.fromAsk.add(node.target.name); else this.fromAsk.delete(node.target.name);
    }
  }

  askOrigin(node) {
    return node && node.kind === "name" && this.fromAsk.has(node.name) ? node.name : null;
  }

  async execChange(node, scope) {
    const value = copyValue(await this.eval(node.value, scope));
    const t = node.target;

    if (t.kind === "name") {
      if (!scope.setExisting(t.name, value)) this.unknownName(t.name, node.nameTok, scope, true);
      return;
    }
    if (t.kind === "field") {
      const obj = await this.eval(t.object, scope);
      if (!isRecord(obj)) throw new PlainError(`I can only change a field on a record, but this is ${typeWord(obj)}.`, t.tok);
      if (!(t.field in obj.fields)) {
        const keys = Object.keys(obj.fields);
        const guess = nearest(t.field, keys);
        throw new PlainError(`This record has no field called "${t.field}", so there's nothing to change.`, t.tok, {
          hint: keys.length
            ? `It has: ${keys.join(", ")}. A record's fields are fixed when you create it.`
            : `It has no fields at all. A record's fields are fixed when you create it.`,
          fix: guess ? { line: t.tok.line, col: t.tok.col, len: t.field.length, replacement: guess } : null
        });
      }
      obj.fields[t.field] = value;
      return;
    }
    if (t.kind === "index") {
      const obj = await this.eval(t.object, scope);
      const idx = await this.eval(t.index, scope);
      // A record looked up by name is the one place a new entry may appear:
      // you had to type the quotes, so it is a deliberate act.
      if (isRecord(obj)) {
        if (typeof idx !== "string")
          throw new PlainError(`A record is looked up by a name in quotes, but got ${describeValue(idx)}.`, t.tok,
            { hint: `For example: change counts["apples"] to 1` });
        obj.fields[idx] = value;
        return;
      }
      if (!Array.isArray(obj)) throw new PlainError(`I can only change an item on a list or a record, but this is ${typeWord(obj)}.`, t.tok);
      if (typeof idx === "string")
        throw new PlainError(`A list is looked up by position, but got the text ${JSON.stringify(idx)}.`, t.tok,
          { hint: `Lists count 1, 2, 3. Only records are looked up by name.` });
      this.checkIndex(obj, idx, t.tok);
      obj[Math.floor(idx) - 1] = value;
      return;
    }
    throw new PlainError("I can't change that.", node.tok);
  }

  /* the one error everyone meets */
  unknownName(name, tok, scope, changing) {
    if (insideAction(scope) && this.globals.vars.has(name))
      throw new PlainError(`"${name}" exists outside this action, but actions can't see outside names.`, tok,
        { hint: isAction(this.globals.vars.get(name))
            ? `Pass it in as an input if this action needs it.`
            : `Pass it in instead, so the action's first line shows everything it uses.` });

    if (RETIRED[name]) {
      const [a, b] = RETIRED[name];
      throw new PlainError(`"${name}" no longer exists on its own, because it never said which way round.`, tok,
        { hint: `Use "${a}" for smallest first, or "${b}" for largest first.`,
          fix: { line: tok.line, col: tok.col, len: name.length, replacement: a } });
    }

    const site = this.program ? findCreationSite(this.program, name, null) : null;
    if (site && site.topLevel) {
      throw new PlainError(`I don't know what "${name}" is yet.`, tok,
        { hint: `There's an action called "${name}" further down. Actions have to be made before the line that uses them.` });
    }
    if (site) {
      throw new PlainError(`"${name}" only exists inside the "${site.blockTok.text}" on line ${site.blockTok.line}.`, tok,
        { hint: site.loopVar
            ? `A loop's name only lasts for the loop. To keep something, create it before: set kept to nothing, then "change kept to ${name}" inside.`
            : site.madeWith === "make"
              ? `Actions made inside a block are forgotten at its "end". Move the "make" to the top level.`
              : `Names made inside a block are forgotten at its "end". Create it before the block instead: set ${name} to nothing` });
    }

    const guess = suggestName(name, scope);
    throw new PlainError(
      changing ? `There's nothing called "${name}" to change.` : `I don't know what "${name}" is.`,
      tok,
      {
        hint: guess ? `There is something called "${guess}". Did you mean that?`
                    : `Create it first with: set ${name} to ...`,
        fix: guess ? { line: tok.line, col: tok.col, len: name.length, replacement: guess } : null
      });
  }

  checkIndex(list, idx, tok) {
    if (typeof idx !== "number")
      throw new PlainError(`A list position must be a number, but got ${describeValue(idx)}.`, tok);
    if (Math.floor(idx) !== idx)
      throw new PlainError(`A list position must be a whole number, but got ${fmtNumber(idx)}.`, tok,
        { hint: `Positions count 1, 2, 3 and so on. Use round(...) if this came from a calculation.` });
    const i = Math.floor(idx);
    if (i < 1 || i > list.length)
      throw new PlainError(
        list.length === 0
          ? `You asked for item ${fmtNumber(idx)}, but this list is empty.`
          : `You asked for item ${fmtNumber(idx)}, but this list only has ${list.length}.`,
        tok, { hint: `Items are numbered from 1${list.length ? ` to ${list.length}` : ""}.` });
  }

  async eval(node, scope) {
    this.tick(node.tok);
    switch (node.kind) {
      case "literal": return node.value;

      case "name": {
        if (scope.has(node.name)) return scope.get(node.name);
        // sealed actions may still call other actions defined at the top level
        if (insideAction(scope) && this.globals.vars.has(node.name)) {
          const outer = this.globals.vars.get(node.name);
          if (isAction(outer)) return outer;
          throw new PlainError(`"${node.name}" exists outside this action, but actions can't see outside names.`, node.tok,
            { hint: `Pass it in instead, so the action's first line shows everything it uses.` });
        }
        this.unknownName(node.name, node.tok, scope, false);
      }

      case "list": return await Promise.all(node.items.map(i => this.eval(i, scope)));

      case "record": {
        const map = {};
        for (const f of node.fields) map[f.key] = await this.eval(f.value, scope);
        return makeRecord(map);
      }

      case "field": {
        const obj = await this.eval(node.object, scope);
        if (isRecord(obj)) {
          if (!(node.field in obj.fields)) {
            const keys = Object.keys(obj.fields);
            const guess = nearest(node.field, keys);
            throw new PlainError(`This record has no field called "${node.field}".`, node.tok, {
              hint: keys.length ? `It has: ${keys.join(", ")}.` : `It has no fields at all.`,
              fix: guess ? { line: node.tok.line, col: node.tok.col, len: node.field.length, replacement: guess } : null
            });
          }
          return obj.fields[node.field];
        }
        throw new PlainError(`I can only read fields from a record, but this is ${typeWord(obj)}.`, node.tok);
      }

      case "index": {
        const obj = await this.eval(node.object, scope);
        const idx = await this.eval(node.index, scope);
        if (isRecord(obj)) {
          if (typeof idx !== "string")
            throw new PlainError(`A record is looked up by a name in quotes, but got ${describeValue(idx)}.`, node.tok,
              { hint: `For example: counts["apples"]` });
          if (!(idx in obj.fields))
            throw new PlainError(`This record has nothing under "${idx}".`, node.tok,
              { hint: `Check first with has(...), or set it with change ...["${idx}"] to something.` });
          return obj.fields[idx];
        }
        if (Array.isArray(obj)) {
          if (typeof idx === "string")
            throw new PlainError(`A list is looked up by position, but got the text ${JSON.stringify(idx)}.`, node.tok,
              { hint: `Lists count 1, 2, 3. Only records are looked up by name.` });
          this.checkIndex(obj, idx, node.tok); return obj[Math.floor(idx) - 1];
        }
        if (typeof obj === "string") {
          if (typeof idx !== "number") throw new PlainError(`A position must be a number.`, node.tok);
          if (Math.floor(idx) !== idx)
            throw new PlainError(`A letter position must be a whole number, but got ${fmtNumber(idx)}.`, node.tok,
              { hint: `Letters are numbered 1, 2, 3 and so on.` });
          const i = Math.floor(idx);
          if (i < 1 || i > obj.length)
            throw new PlainError(`You asked for letter ${fmtNumber(idx)}, but this text has ${obj.length}.`, node.tok,
              { hint: "Letters are numbered from 1." });
          return obj[i - 1];
        }
        throw new PlainError(`I can only take a position from a list or text, but this is ${typeWord(obj)}.`, node.tok);
      }

      case "call": {
        const callee = await this.eval(node.callee, scope);
        if (isAction(callee) && callee.effect && !node.wholeStatement) {
          throw new PlainError(`"${callee.name}" reaches outside the program, so it needs a line of its own.`, node.tok,
            { hint: `Write "set something to ${callee.name}(...)" on its own line first, then use that name here.` });
        }
        const args = await Promise.all(node.args.map(a => this.eval(a, scope)));
        return await this.callValue(callee, args, node);
      }

      case "not": {
        const v = await this.eval(node.value, scope);
        if (typeof v !== "boolean")
          throw new PlainError(`"not" needs a true/false value, but got ${describeValue(v)}.`, node.tok);
        return !v;
      }

      case "negate": {
        const v = await this.eval(node.value, scope);
        if (typeof v !== "number")
          throw new PlainError(`I can only make numbers negative, but this is ${typeWord(v)}.`, node.tok);
        return -v;
      }

      case "logic": {
        const l = await this.eval(node.left, scope);
        if (typeof l !== "boolean")
          throw new PlainError(`"${node.op}" needs true/false on the left, but got ${describeValue(l)}.`, node.tok);
        if (node.op === "and" && !l) return false;
        if (node.op === "or" && l) return true;
        const r = await this.eval(node.right, scope);
        if (typeof r !== "boolean")
          throw new PlainError(`"${node.op}" needs true/false on the right, but got ${describeValue(r)}.`, node.tok);
        return r;
      }

      case "compare": {
        const l = await this.eval(node.left, scope);
        const r = await this.eval(node.right, scope);
        if (node.op === "is") return sameValue(l, r);
        if (node.op === "is not") return !sameValue(l, r);
        if (typeof l === "string" && typeof r === "string") {
          const c = compareText(l, r);
          return node.op === "more" ? c > 0 : node.op === "less" ? c < 0 : node.op === "at least" ? c >= 0 : c <= 0;
        }
        if (typeof l !== "number" || typeof r !== "number")
          throw new PlainError(`I can only compare sizes of numbers or text, but got ${describeValue(l)} and ${describeValue(r)}.`, node.tok,
            { hint: `To check they match exactly, use "is".` });
        switch (node.op) {
          case "more": return l > r;
          case "less": return l < r;
          case "at least": return l >= r;
          case "at most": return l <= r;
        }
      }

      case "arith": return await this.arith(node, scope);
      default: throw new PlainError("I don't understand this expression.", node.tok);
    }
  }

  async arith(node, scope) {
    const l = await this.eval(node.left, scope);
    const r = await this.eval(node.right, scope);
    const op = node.op;

    if (op === "+") {
      if (typeof l === "number" && typeof r === "number") return l + r;
      if (typeof l === "string" || typeof r === "string") {
        if (l === null || r === null)
          throw new PlainError(`I can't join text with nothing.`, node.tok, { hint: "One side has no value yet." });
        if (Array.isArray(l) || Array.isArray(r) || isRecord(l) || isRecord(r))
          throw new PlainError(`I can't join text with ${typeWord(Array.isArray(l) || isRecord(l) ? l : r)}.`, node.tok,
            { hint: `Use text(...) if you really want it as text.` });
        return toDisplay(l) + toDisplay(r);
      }
      if (Array.isArray(l) && Array.isArray(r)) return l.concat(r);
      throw new PlainError(`I can't add ${typeWord(l)} to ${typeWord(r)}.`, node.tok);
    }

    if (typeof l !== "number" || typeof r !== "number") {
      const word = { "-": "subtract", "*": "multiply", "/": "divide", "%": "take the remainder of" }[op];
      const asked = this.askOrigin(node.left) || this.askOrigin(node.right);
      throw new PlainError(`I can only ${word} numbers, but got ${describeValue(l)} and ${describeValue(r)}.`, node.tok,
        { hint: asked
            ? `"${asked}" holds text, because that is what "ask" gives back. Wrap it in number(${asked}) to do sums with it.`
            : (typeof l === "string" || typeof r === "string" ? `Use number(...) to turn text into a number.` : null) });
    }
    if ((op === "/" || op === "%") && r === 0)
      throw new PlainError("Dividing by zero doesn't give a number.", node.tok,
        { hint: "Check the value on the right of the / before you divide." });

    switch (op) {
      case "-": return l - r;
      case "*": return l * r;
      case "/": return l / r;
      case "%": return l % r;
    }
  }

  async callValue(callee, args, node) {
    if (isAction(callee)) {
      if (callee.effect && this.depth > 0)
        throw new PlainError(`"${callee.name}" can't be used inside an action.`, node.tok,
          { hint: `Read or fetch at the top level of your program, then pass the value in. That keeps every action free of surprises.` });
      if (callee.native) return await callee.native(args, node, this);
      if (args.length !== callee.params.length)
        throw new PlainError(
          `"${callee.name}" needs ${callee.params.length} value${callee.params.length === 1 ? "" : "s"}, but got ${args.length}.`,
          node.tok, { hint: callee.params.length ? `It expects: ${callee.params.join(", ")}` : `It expects nothing at all.` });
      // sealed: an action sees its inputs and the built-ins, nothing else
      const inner = new Scope(this.builtins, "action");
      callee.params.forEach((p, i) => inner.define(p, copyValue(args[i])));
      this.depth++;
      if (this.depth > MAX_DEPTH) {
        this.depth--;
        throw new PlainError(
          `"${callee.name}" has called itself ${MAX_DEPTH} times without finishing.`, node.tok,
          { hint: `Every path through an action must eventually reach a "give" that doesn't call it again. Check the test that's meant to stop it.` });
      }
      try { await this.execBlock(callee.body, inner); }
      catch (e) { if (e instanceof GiveSignal) return e.value; throw e; }
      finally { this.depth--; }
      return null;
    }
    throw new PlainError(`${describeValue(callee)} is not something I can run.`, node.tok,
      { hint: `Only actions made with "make" can be called with ().` });
  }
}

/* ---------- builtins ---------- */

function native(name, params, fn) { return { __action: true, native: fn, name, params }; }

// A kernel action reaches outside the program. These are registered only where
// there is something to reach: a computer, or a browser that can ask the person.
function effect(name, params, fn) { return { __action: true, native: fn, name, params, effect: true }; }

function need(args, n, name, node) {
  if (args.length !== n)
    throw new PlainError(`"${name}" needs ${n} value${n === 1 ? "" : "s"}, but got ${args.length}.`, node.tok);
}
function needRange(args, lo, hi, name, node) {
  if (args.length < lo || args.length > hi)
    throw new PlainError(`"${name}" needs ${lo} or ${hi} values, but got ${args.length}.`, node.tok);
}
function expectList(v, name, node) {
  if (!Array.isArray(v)) throw new PlainError(`"${name}" needs a list, but got ${describeValue(v)}.`, node.tok);
  return v;
}
function padTo(text, width, name, node, onLeft) {
  if (typeof width !== "number" || Math.floor(width) !== width || width < 0)
    throw new PlainError(`"${name}" needs a whole width of 0 or more, but got ${describeValue(width)}.`, node.tok,
      { hint: `For example: ${name}("apple", 12)` });
  if (text.length >= width) return text;           // never lose what you were given
  const spaces = " ".repeat(width - text.length);
  return onLeft ? spaces + text : text + spaces;
}

function expectText(v, name, node) {
  if (typeof v !== "string") throw new PlainError(`"${name}" needs text, but got ${describeValue(v)}.`, node.tok);
  return v;
}

function sortList(list, field, down, name, node) {
  const copy = list.slice();
  let pick = x => x;

  if (field !== undefined) {
    if (typeof field !== "string")
      throw new PlainError(`"${name}" needs the field name as text, like ${name}(people, "born").`, node.tok);
    for (const item of copy) {
      if (!isRecord(item))
        throw new PlainError(`"${name}" was given a field name, so every item must be a record, but found ${describeValue(item)}.`, node.tok);
      if (!(field in item.fields)) {
        const keys = Object.keys(item.fields);
        const guess = nearest(field, keys);
        throw new PlainError(`These records have no field called "${field}".`, node.tok, {
          hint: keys.length ? `They have: ${keys.join(", ")}.` : `They have no fields at all.`,
          fix: guess ? { line: node.tok.line, find: '"' + field + '"', replacement: '"' + guess + '"' } : null
        });
      }
    }
    pick = x => x.fields[field];
  }

  const vals = copy.map(pick);
  const allNum = vals.every(x => typeof x === "number");
  const allTxt = vals.every(x => typeof x === "string");
  if (!allNum && !allTxt)
    throw new PlainError(
      field !== undefined
        ? `"${name}" needs every "${field}" to be all numbers or all text.`
        : `"${name}" needs a list of all numbers or all text.`,
      node.tok);

  copy.sort((x, y) => {
    const a = pick(x), b = pick(y);
    return allNum ? a - b : compareText(a, b);
  });
  return down ? copy.reverse() : copy;
}

function installBuiltins(scope, interp) {
  const def = (name, params, fn) => scope.define(name, native(name, params, fn));

  def("count", ["thing"], (a, n) => {
    need(a, 1, "count", n);
    const v = a[0];
    if (Array.isArray(v) || typeof v === "string") return v.length;
    if (isRecord(v)) return Object.keys(v.fields).length;
    throw new PlainError(`"count" works on a list, text or record, but got ${describeValue(v)}.`, n.tok);
  });

  def("add", ["list", "item"], (a, n) => {
    need(a, 2, "add", n);
    return expectList(a[0], "add", n).concat([a[1]]);
  });

  def("remove", ["list", "position"], (a, n) => {
    need(a, 2, "remove", n);
    const list = expectList(a[0], "remove", n);
    interp.checkIndex(list, a[1], n.tok);
    const copy = list.slice();
    copy.splice(Math.floor(a[1]) - 1, 1);
    return copy;
  });

  def("first", ["list"], (a, n) => {
    need(a, 1, "first", n);
    const l = expectList(a[0], "first", n);
    if (l.length === 0) throw new PlainError(`"first" needs a list with at least one item, but this one is empty.`, n.tok);
    return l[0];
  });

  def("last", ["list"], (a, n) => {
    need(a, 1, "last", n);
    const l = expectList(a[0], "last", n);
    if (l.length === 0) throw new PlainError(`"last" needs a list with at least one item, but this one is empty.`, n.tok);
    return l[l.length - 1];
  });

  def("reverse", ["list"], (a, n) => {
    need(a, 1, "reverse", n);
    if (typeof a[0] === "string") return a[0].split("").reverse().join("");
    return expectList(a[0], "reverse", n).slice().reverse();
  });

  def("has", ["collection", "item"], (a, n) => {
    need(a, 2, "has", n);
    if (Array.isArray(a[0])) return a[0].some(x => sameValue(x, a[1]));
    if (typeof a[0] === "string") return a[0].includes(String(a[1]));
    if (isRecord(a[0])) return String(a[1]) in a[0].fields;
    throw new PlainError(`"has" works on a list, text or record.`, n.tok);
  });

  def("sum", ["list"], (a, n) => {
    need(a, 1, "sum", n);
    let t = 0;
    for (const x of expectList(a[0], "sum", n)) {
      if (typeof x !== "number")
        throw new PlainError(`"sum" needs every item to be a number, but found ${describeValue(x)}.`, n.tok);
      t += x;
    }
    return t;
  });

  def("sort_up", ["list", "field"], (a, n) => {
    needRange(a, 1, 2, "sort_up", n);
    return sortList(expectList(a[0], "sort_up", n), a[1], false, "sort_up", n);
  });

  def("sort_down", ["list", "field"], (a, n) => {
    needRange(a, 1, 2, "sort_down", n);
    return sortList(expectList(a[0], "sort_down", n), a[1], true, "sort_down", n);
  });

  def("join", ["list", "separator"], (a, n) => {
    need(a, 2, "join", n);
    const l = expectList(a[0], "join", n);
    if (Array.isArray(a[1]))
      throw new PlainError(`"join" turns one list into text, using a separator.`, n.tok,
        { hint: `To combine two lists into one, use a + b instead.` });
    if (l.length === 1 && Array.isArray(l[0]))
      throw new PlainError(`"join" was given a list holding one other list, so there is nothing to put a separator between.`, n.tok,
        { hint: `Square brackets build a new list. If you already have one, hand it over without them.` });
    expectText(a[1], "join", n);
    return l.map(toDisplay).join(a[1]);
  });

  def("split", ["text", "separator"], (a, n) => {
    need(a, 2, "split", n);
    expectText(a[0], "split", n); expectText(a[1], "split", n);
    return a[0].split(a[1]);
  });

  def("upper", ["text"], (a, n) => { need(a, 1, "upper", n); return expectText(a[0], "upper", n).toUpperCase(); });
  def("lower", ["text"], (a, n) => { need(a, 1, "lower", n); return expectText(a[0], "lower", n).toLowerCase(); });
  def("trim", ["text"], (a, n) => { need(a, 1, "trim", n); return expectText(a[0], "trim", n).trim(); });

  def("round", ["number", "places"], (a, n) => {
    needRange(a, 1, 2, "round", n);
    if (typeof a[0] !== "number") throw new PlainError(`"round" needs a number, but got ${describeValue(a[0])}.`, n.tok);
    if (a.length === 1) return roundAwayFromZero(a[0]);
    if (typeof a[1] !== "number" || a[1] < 0 || Math.floor(a[1]) !== a[1])
      throw new PlainError(`The places for "round" must be a whole number of 0 or more, but got ${describeValue(a[1])}.`, n.tok,
        { hint: `For example: round(17.12345, 2) gives 17.12` });
    return roundTo(a[0], a[1]);
  });

  def("random", ["lowest", "highest"], (a, n) => {
    need(a, 2, "random", n);
    if (typeof a[0] !== "number" || typeof a[1] !== "number")
      throw new PlainError(`"random" needs two numbers.`, n.tok);
    for (const x of a) if (Math.floor(x) !== x)
      throw new PlainError(`"random" needs whole numbers, but got ${fmtNumber(x)}.`, n.tok,
        { hint: `random(1, 6) gives a whole number from 1 to 6.` });
    const lo = Math.ceil(Math.min(a[0], a[1])), hi = Math.floor(Math.max(a[0], a[1]));
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  });

  def("text", ["value"], (a, n) => { need(a, 1, "text", n); return toDisplay(a[0]); });

  def("number", ["text"], (a, n) => {
    need(a, 1, "number", n);
    if (typeof a[0] === "number") return a[0];
    expectText(a[0], "number", n);
    const v = Number(a[0].trim());
    if (a[0].trim() === "" || isNaN(v))
      throw new PlainError(`"${a[0]}" can't be read as a number.`, n.tok,
        { hint: `Text like "12" works; text like "twelve" does not.` });
    return v;
  });

  def("slice", ["thing", "from", "to"], (a, n) => {
    need(a, 3, "slice", n);
    const [thing, from, to] = a;
    if (!Array.isArray(thing) && typeof thing !== "string")
      throw new PlainError(`"slice" works on a list or text, but got ${describeValue(thing)}.`, n.tok);
    for (const x of [from, to]) {
      if (typeof x !== "number")
        throw new PlainError(`"slice" needs whole numbers for the two positions, but got ${describeValue(x)}.`, n.tok);
      if (Math.floor(x) !== x)
        throw new PlainError(`"slice" needs whole positions, but got ${fmtNumber(x)}.`, n.tok,
          { hint: `Positions count 1, 2, 3. For example: slice("hello", 2, 4) gives "ell".` });
    }
    if (from < 1)
      throw new PlainError(`"slice" starts counting at 1, but was asked to start at ${fmtNumber(from)}.`, n.tok);
    const last = Math.min(to, thing.length);
    if (from > thing.length || last < from) return Array.isArray(thing) ? [] : "";
    return thing.slice(from - 1, last);
  });

  def("replace", ["text", "old", "new"], (a, n) => {
    need(a, 3, "replace", n);
    for (const x of a) expectText(x, "replace", n);
    if (a[1] === "")
      throw new PlainError(`"replace" needs something to look for, but was given empty text.`, n.tok);
    return a[0].split(a[1]).join(a[2]);
  });

  def("find", ["text", "part"], (a, n) => {
    need(a, 2, "find", n);
    expectText(a[0], "find", n); expectText(a[1], "find", n);
    if (a[1] === "")
      throw new PlainError(`"find" needs something to look for, but was given empty text.`, n.tok);
    const at = a[0].indexOf(a[1]);
    return at === -1 ? null : at + 1;
  });

  def("align_left", ["value", "width"], (a, n) => {
    need(a, 2, "align_left", n);
    return padTo(toDisplay(a[0]), a[1], "align_left", n, false);
  });

  def("align_right", ["value", "width"], (a, n) => {
    need(a, 2, "align_right", n);
    return padTo(toDisplay(a[0]), a[1], "align_right", n, true);
  });

  def("decimals", ["number", "places"], (a, n) => {
    need(a, 2, "decimals", n);
    if (typeof a[0] !== "number")
      throw new PlainError(`"decimals" needs a number, but got ${describeValue(a[0])}.`, n.tok);
    if (typeof a[1] !== "number" || Math.floor(a[1]) !== a[1] || a[1] < 0 || a[1] > 15)
      throw new PlainError(`"decimals" needs a whole number of places from 0 to 15, but got ${describeValue(a[1])}.`, n.tok,
        { hint: `For example: decimals(17.1, 2) gives "17.10".` });
    return roundTo(a[0], a[1]).toFixed(a[1]);
  });

  def("numbers", ["from", "to"], (a, n) => {
    need(a, 2, "numbers", n);
    for (const x of a) {
      if (typeof x !== "number")
        throw new PlainError(`"numbers" needs two numbers, but got ${describeValue(x)}.`, n.tok);
      if (Math.floor(x) !== x)
        throw new PlainError(`"numbers" needs whole numbers, but got ${fmtNumber(x)}.`, n.tok,
          { hint: `For example: numbers(1, 10)` });
    }
    const [from, to] = a;
    if (to < from) return [];
    if (to - from + 1 > 1000000)
      throw new PlainError(`"numbers" was asked for ${fmtNumber(to - from + 1)} of them, which is more than a million.`, n.tok,
        { hint: `Use a "while" loop if you really need to count that far.` });
    const out = [];
    for (let i = from; i <= to; i++) out.push(i);
    return out;
  });

  def("keys", ["record"], (a, n) => {
    need(a, 1, "keys", n);
    if (!isRecord(a[0])) throw new PlainError(`"keys" needs a record, but got ${describeValue(a[0])}.`, n.tok);
    return Object.keys(a[0].fields);
  });
}

function momentRecord(makeRecord) {
  const d = new Date();
  const two = n => String(n).padStart(2, "0");
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return makeRecord({
    date:    `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`,
    time:    `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`,
    year:    d.getFullYear(),
    month:   d.getMonth() + 1,
    day:     d.getDate(),
    hour:    d.getHours(),
    minute:  d.getMinutes(),
    second:  d.getSeconds(),
    weekday: days[d.getDay()],
  });
}

/* ---------- the kernel ----------
   read, write and get are the only actions that reach outside the program.
   They are registered by whoever starts the interpreter, so a page with no
   file system simply doesn't have them, and says so plainly.            */

function installKernel(scope, host) {
  const def = (name, params, fn) => scope.define(name, effect(name, params, fn));

  // Whoever starts the interpreter must supply all five. Saying so here beats
  // letting an internal error escape halfway through someone's program.
  for (const needed of ["read", "write", "get", "ask", "now"]) {
    if (typeof host[needed] !== "function")
      throw new Error(`This copy of Plain was started without a way to "${needed}". All five of read, write, get, ask and now are required.`);
  }

  def("read", ["name"], async (a, n) => {
    need(a, 1, "read", n);
    expectText(a[0], "read", n);
    const content = await host.read(a[0], n);
    // A PDF, image or spreadsheet read as text is meaningless, so say so
    // rather than handing back a page of nonsense.
    const sample = content.slice(0, 4096);
    if (sample.includes("\u0000") || /\uFFFD/.test(sample))
      throw new PlainError(`"${a[0]}" isn't a text file, so there's nothing readable in it.`, n.tok,
        { hint: `Plain reads text: .txt, .csv, .json and the like. Things such as PDFs, images and spreadsheets need to be exported to text first.` });
    return content;
  });

  def("write", ["name", "text"], async (a, n) => {
    need(a, 2, "write", n);
    expectText(a[0], "write", n);
    if (typeof a[1] !== "string")
      throw new PlainError(`"write" needs text to write, but got ${describeValue(a[1])}.`, n.tok,
        { hint: `Use join(...) to turn a list into text, or text(...) for a single value.` });
    return await host.write(a[0], a[1], n);
  });

  def("ask", ["question"], async (a, n) => {
    need(a, 1, "ask", n);
    expectText(a[0], "ask", n);
    const answer = await host.ask(a[0], n);
    if (typeof answer !== "string")
      throw new PlainError(`"ask" expected an answer in text.`, n.tok);
    return answer;
  });

  def("now", [], async (a, n) => {
    need(a, 0, "now", n);
    return await host.now(n);
  });

  def("get", ["address"], async (a, n) => {
    need(a, 1, "get", n);
    expectText(a[0], "get", n);
    if (!/^https?:\/\//i.test(a[0]))
      throw new PlainError(`"get" needs a web address starting with https://, but got ${JSON.stringify(a[0])}.`, n.tok);
    return await host.get(a[0], n);
  });
}

// Used when there is no kernel at all, so the message explains rather than puzzles.
function installAbsentKernel(scope, why) {
  for (const name of ["read", "write", "get", "ask", "now"]) {
    scope.define(name, effect(name, ["..."], (a, n) => {
      throw new PlainError(`"${name}" needs somewhere to reach, and there isn't one here.`, n.tok, { hint: why });
    }));
  }
}

/* ---------- entry point ---------- */

async function run(source, host) {
  const output = [];
  try {
    const program = new Parser(tokenise(source)).parseProgram();
    const interp = new Interpreter(line => {
      output.push(line);
      if (output.length > 2000) throw new PlainError("This program showed more than 2000 lines, so I stopped it.", null);
    });
    if (host) installKernel(interp.builtins, host);
    else installAbsentKernel(interp.builtins,
      "Plain is running somewhere with no files and no network. Run it on your computer, or in the playground use the version that can ask you for a file.");
    await interp.run(program);
    return { output, error: null };
  } catch (e) {
    if (e instanceof GiveSignal)
      return { output, error: { line: 1, col: 1, len: 1, message: `"give" only works inside an action made with "make".`, hint: null, fix: null } };
    if (e instanceof StopSignal)
      return { output, error: { line: 1, col: 1, len: 1, message: `"stop" only works inside a loop.`, hint: null, fix: null } };
    if (e && e.plain)
      return { output, error: { line: e.line, col: e.col, len: e.len, message: e.message, hint: e.hint, fix: e.fix } };
    if (e instanceof RangeError || /call stack|too much recursion|stack size/i.test(String(e && e.message)))
      return { output, error: { line: 1, col: 1, len: 1,
        message: "This program nested too deeply and had to be stopped.",
        hint: "An action is calling itself, or calls are nested further than Plain can follow.", fix: null } };
    return { output, error: { line: 1, col: 1, len: 1, message: "Something went wrong inside Plain: " + e.message, hint: null, fix: null } };
  }
}

if (typeof module !== "undefined") module.exports = { run, PLAIN_VERSION, makeRecord, momentRecord };
