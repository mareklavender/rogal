/* Checks the language still behaves as intended.
   Run with:  node test.js                                          */

const { run, PLAIN_VERSION } = require("./plain-core.js");

let passed = 0;
const failures = [];
const queue = [];

/* shows(source, expected lines) — the program runs and prints exactly this */
function shows(label, source, expected) { queue.push(async () => {
  const r = await run(source);
  if (r.error) {
    failures.push(`${label}\n    expected output, got error: ${r.error.message}`);
    return;
  }
  const got = r.output.join("\n");
  const want = expected.join("\n");
  if (got !== want) {
    failures.push(`${label}\n    expected: ${JSON.stringify(want)}\n    got:      ${JSON.stringify(got)}`);
    return;
  }
  passed++;
}); }

/* fails(source, fragment) — the program stops, and the message mentions this */
function fails(label, source, fragment) { queue.push(async () => {
  const r = await run(source);
  if (!r.error) {
    failures.push(`${label}\n    expected an error mentioning ${JSON.stringify(fragment)}, but it ran cleanly`);
    return;
  }
  const whole = r.error.message + " " + (r.error.hint || "");
  if (!whole.includes(fragment)) {
    failures.push(`${label}\n    expected a message mentioning ${JSON.stringify(fragment)}\n    got: ${r.error.message}`);
    return;
  }
  passed++;
}); }

/* ---------- values and showing ---------- */

shows("text and numbers join", `show "Total: " + 5`, ["Total: 5"]);
shows("several values on one line", `show 1, "two", true`, ["1 two true"]);
shows("numbers are tidied", `show 0.1 + 0.2`, ["0.3"]);
shows("division", `show 10 / 4`, ["2.5"]);
shows("remainder", `show 7 % 3`, ["1"]);
shows("lists print readably", `show [1, "a", true]`, [`[1, "a", true]`]);
shows("records print readably", `show {name: "Ada", age: 36}`, [`{name: "Ada", age: 36}`]);
shows("nothing prints", `set x to nothing\nshow x`, ["nothing"]);

/* ---------- set and change ---------- */

shows("set then change", `set total to 0\nchange total to 5\nshow total`, ["5"]);
fails("set twice", `set x to 1\nset x to 2`, "already exists");
fails("change what doesn't exist", `change x to 1`, "nothing called");
fails("change a near miss suggests", `set total to 0\nchange totl to 1`, "total");
fails("cannot shadow a built-in", `set count to 1`, "built-in");
fails("no equals sign", `x = 5`, `no "="`);
fails("set cannot reach inside", `set p to {a: 1}\nset p.a to 2`, "whole new name");
shows("change reaches inside", `set p to {a: 1}\nchange p.a to 2\nshow p`, ["{a: 2}"]);
shows("change a list position", `set xs to [1, 2]\nchange xs[1] to 9\nshow xs`, ["[9, 2]"]);

/* ---------- blocks and scope ---------- */

shows("accumulator across a loop",
  `set total to 0\nfor each n in [1, 2, 3]\n  change total to total + n\nend\nshow total`, ["6"]);
fails("name made in a loop is forgotten",
  `for each n in [1]\n  set found to n\nend\nshow found`, "only exists inside");
fails("name made in an if is forgotten",
  `if true\n  set x to 1\nend\nshow x`, "only exists inside");
fails("loop name is forgotten",
  `for each n in [1]\n  show n\nend\nshow n`, "only exists inside");
fails("loop name cannot clash",
  `set n to 1\nfor each n in [1]\n  show n\nend`, "already exists");

/* ---------- actions ---------- */

shows("action gives a value", `make double(n)\n  give n * 2\nend\nshow double(21)`, ["42"]);
shows("recursion",
  `make fact(n)\n  if n is at most 1\n    give 1\n  end\n  give n * fact(n - 1)\nend\nshow fact(6)`, ["720"]);
shows("an action may call another",
  `make double(n)\n  give n * 2\nend\nmake quad(n)\n  give double(double(n))\nend\nshow quad(3)`, ["12"]);
shows("inputs are reusable across actions",
  `make double(n)\n  give n * 2\nend\nmake triple(n)\n  give n * 3\nend\nshow double(4), triple(4)`, ["8 12"]);
shows("actions are values",
  `make double(n)\n  give n * 2\nend\nmake apply(fn, v)\n  give fn(v)\nend\nshow apply(double, 7)`, ["14"]);
shows("no give means nothing", `make f()\n  set x to 1\nend\nshow f()`, ["nothing"]);
fails("actions cannot see outside names",
  `set tax to 0.2\nmake total(a)\n  give a * tax\nend\nshow total(1)`, "can't see outside");
fails("actions cannot change outside names",
  `set tally to 0\nmake bump()\n  change tally to 1\nend\nbump()`, "can't see outside");

/* ---------- value semantics ---------- */

shows("a copied list is independent",
  `set a to [1, 2, 3]\nset b to a\nchange a[1] to 99\nshow a\nshow b`, ["[99, 2, 3]", "[1, 2, 3]"]);
shows("a copied record is independent",
  `set p to {n: 1}\nset q to p\nchange p.n to 9\nshow p, q`, ["{n: 9} {n: 1}"]);
shows("an action cannot alter what it is given",
  `set data to [1, 2]\nmake wreck(xs)\n  change xs[1] to 99\n  give 0\nend\nshow wreck(data)\nshow data`, ["0", "[1, 2]"]);
shows("an action cannot alter a record it is given",
  `set p to {n: 1}\nmake wreck(r)\n  change r.n to 99\n  give 0\nend\nshow wreck(p)\nshow p`, ["0", "{n: 1}"]);
shows("a loop name is a copy",
  `set people to [{n: 1}]\nfor each person in people\n  change person.n to 99\nend\nshow people`, ["[{n: 1}]"]);
shows("nested structures copy all the way down",
  `set a to {items: [1, 2]}\nset b to a\nchange a.items[1] to 9\nshow b`, ["{items: [1, 2]}"]);

/* ---------- recursion ---------- */

fails("runaway recursion is caught",
  `make bomb(n)\n  give bomb(n - 1)\nend\nshow bomb(5)`, "called itself 300 times");
shows("recursion within the limit still works",
  `make down(n)\n  if n is 0\n    give 0\n  end\n  give down(n - 1)\nend\nshow down(250)`, ["0"]);
shows("repeated calls do not accumulate depth",
  `make f(n)\n  give n\nend\nset t to 0\nrepeat 500 times\n  change t to t + f(1)\nend\nshow t`, ["500"]);

/* ---------- whole numbers ---------- */

fails("repeat needs a whole number", `repeat 2.7 times\n  show "x"\nend`, "whole number");
fails("a list position must be whole", `show [1,2,3][2.9]`, "whole number");
fails("a letter position must be whole", `show "abc"[1.5]`, "whole number");
fails("random needs whole numbers", `show random(1.5, 3)`, "whole numbers");
shows("whole numbers still work", `repeat 2 times\n  show "x"\nend`, ["x", "x"]);

/* ---------- records have a fixed shape ---------- */

fails("change cannot invent a field",
  `set p to {name: "Ada"}\nchange p.age to 36`, "nothing to change");
fails("a misspelled field is caught",
  `set p to {name: "Ada", age: 36}\nchange p.aeg to 40`, "age");

/* ---------- make at the top level ---------- */

fails("no nested make",
  `make outer()\n  make inner()\n    give 1\n  end\n  give 1\nend`, "top level");
fails("no make inside a loop",
  `for each x in [1]\n  make f()\n    give 1\n  end\nend`, "top level");
fails("an action used before it is made says so",
  `show f()\nmake f()\n  give 1\nend`, "further down");

/* ---------- join points the right way ---------- */

fails("join with two lists suggests +", `show join([1,2], [3])`, "a + b");
shows("two lists combine with +", `show [1, 2] + [3]`, ["[1, 2, 3]"]);
shows("add puts one item on the end", `show add([1, 2], [3])`, ["[1, 2, [3]]"]);
fails("wrong number of inputs",
  `make double(n)\n  give n * 2\nend\nshow double(1, 2)`, "needs 1 value");
fails("duplicate input names", `make f(a, a)\n  give a\nend`, "already has an input");

/* ---------- conditions ---------- */

shows("else if chain",
  `set s to 7\nif s is at least 9\n  show "high"\nelse if s is at least 7\n  show "mid"\nelse\n  show "low"\nend`, ["mid"]);
shows("and / or / not", `show true and false, true or false, not true`, ["false true false"]);
fails("if needs true or false", `if 5\n  show "x"\nend`, "instead of true or false");
fails("symbols are not comparisons", `set a to 1\nif a > 0\n  show "x"\nend`, "in words");

/* ---------- loops ---------- */

shows("repeat", `repeat 3 times\n  show "x"\nend`, ["x", "x", "x"]);
shows("while", `set n to 1\nwhile n is at most 3\n  show n\n  change n to n + 1\nend`, ["1", "2", "3"]);
shows("stop leaves the loop", `for each n in [1, 2, 3]\n  if n is 3\n    stop\n  end\n  show n\nend`, ["1", "2"]);
shows("for each over text", `for each letter in "ab"\n  show letter\nend`, ["a", "b"]);

/* ---------- built-in actions ---------- */

shows("count adapts", `show count([1,2]), count("abc"), count({a: 1})`, ["2 3 1"]);
shows("sum", `show sum([1, 2, 3])`, ["6"]);
shows("sort_up and sort_down", `show sort_up([3,1,2]), sort_down([3,1,2])`, ["[1, 2, 3] [3, 2, 1]"]);
shows("sorting text ignores capitals", `show sort_up(["banana", "Apple"])`, [`["Apple", "banana"]`]);
shows("sorting records by field",
  `set p to [{n: "b", v: 2}, {n: "a", v: 1}]\nshow sort_up(p, "v")`, [`[{n: "a", v: 1}, {n: "b", v: 2}]`]);
fails("sorting by a missing field",
  `set p to [{n: "a"}]\nshow sort_up(p, "nn")`, "no field called");
fails("bare sort is retired", `show sort([1])`, "sort_up");
shows("add gives a new list", `set xs to [1]\nset ys to add(xs, 2)\nshow xs, ys`, ["[1] [1, 2]"]);
shows("remove gives a new list", `set xs to [1, 2]\nshow remove(xs, 1), xs`, ["[2] [1, 2]"]);
shows("first, last, reverse", `show first([1,2]), last([1,2]), reverse([1,2])`, ["1 2 [2, 1]"]);
shows("has", `show has([1,2], 2), has("abc", "b"), has({a: 1}, "a")`, ["true true true"]);
shows("join and split", `show join([1,2], "-"), split("a,b", ",")`, [`1-2 ["a", "b"]`]);
shows("upper, lower, trim", `show upper("a"), lower("B"), trim("  c  ")`, ["A b c"]);
shows("round to places", `show round(17.12345, 2)`, ["17.12"]);
shows("round is symmetric", `show round(2.5), round(-2.5)`, ["3 -3"]);
shows("text and number convert", `show number("12") + 1, text(12) + "!"`, ["13 12!"]);
shows("keys", `show keys({a: 1, b: 2})`, [`["a", "b"]`]);

/* ---------- records looked up by name ---------- */

shows("a record can be looked up by name",
  `set counts to {apples: 2}\nshow counts["apples"]`, ["2"]);
shows("a new entry can be added by name",
  `set counts to {}\nchange counts["pears"] to 1\nshow counts`, ["{pears: 1}"]);
shows("counting words",
  `set counts to {}\nfor each word in ["a", "b", "a"]\n  if has(counts, word)\n    change counts[word] to counts[word] + 1\n  else\n    change counts[word] to 1\n  end\nend\nshow counts`, ['{a: 2, b: 1}']);
fails("reading a name that isn't there",
  `set counts to {}\nshow counts["nope"]`, "nothing under");
fails("a record needs a name, not a number",
  `set counts to {a: 1}\nshow counts[1]`, "name in quotes");
fails("a list needs a position, not a name",
  `show [1,2]["a"]`, "looked up by position");
fails("the dot is still strict",
  `set p to {name: "Ada"}\nchange p.age to 1`, "nothing to change");

/* ---------- counting ---------- */

shows("numbers makes a list", `show numbers(1, 5)`, ["[1, 2, 3, 4, 5]"]);
shows("numbers works with for each", `set t to 0\nfor each i in numbers(1, 10)\n  change t to t + i\nend\nshow t`, ["55"]);
shows("numbers backwards is empty", `show numbers(5, 1)`, ["[]"]);
fails("numbers needs whole numbers", `show numbers(1, 2.5)`, "whole numbers");
fails("numbers refuses a huge range", `show numbers(1, 9000000)`, "more than a million");

/* ---------- layout that cannot lie ---------- */

fails("else needs its own line", `if true\n  show 1\nelse show 2\nend`, "line of its own");
fails("end needs its own line", `if true\n  show 1\nend show 2`, "line of its own");
shows("else if is still allowed", `if false\n  show 1\nelse if true\n  show 2\nend`, ["2"]);

/* ---------- brackets ---------- */

fails("round brackets for a list", `set xs to (1, 2, 3)`, "square brackets");
fails("join given a nested list", `show join([[1,2]], "-")`, "one other list");
shows("grouping still works", `show (2 + 3) * 4`, ["20"]);

/* ---------- errors that must stay helpful ---------- */

fails("unknown name suggests yours first", `set total to 0\nshow totl`, "total");
fails("list position past the end", `show [1,2,3][5]`, "only has 3");
fails("missing end names the opener", `if true\n  show "x"`, "never closed");
fails("unclosed text", `show "abc`, "quote mark");
fails("divide by zero", `show 1 / 0`, "Dividing by zero");
fails("unreadable number", `show number("twelve")`, "can't be read");
fails("wrong kind of arithmetic", `show "a" * 2`, "multiply");
fails("missing record field lists the real ones", `set p to {name: "a"}\nshow p.naem`, "name");
fails("endless loop is stopped", `while true\n  set x to 1\nend`, "stopped it");

/* ---------- report ---------- */

(async () => {
  for (const check of queue) await check();

  console.log(`\nPlain v${PLAIN_VERSION}`);
  if (failures.length === 0) {
    console.log(`All ${passed} checks passed.\n`);
    process.exit(0);
  }
  console.log(`${passed} passed, ${failures.length} FAILED:\n`);
  failures.forEach(f => console.log("  ✗ " + f + "\n"));
  process.exit(1);
})();
