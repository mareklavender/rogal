# Changelog

## 0.7.0

- `use "dates"` brings in the actions from another file. Libraries hold only actions, `use` lines sit at the top, and everything is followed before the program runs — so a missing file, a clashing name or a circle is reported straight away.
- `dates` travels with the playground, so `use "dates"` works in a browser as well as on a computer.
- Standalone binaries. Bun compiles Plain into a single file that runs with nothing installed.
- The reference no longer lists plans or a history of what was settled. It describes the language as it is; `CHANGELOG.md` covers the rest.
- A full proofread. Among other things, the kernel section still said "three actions" when there are five.

## 0.6.2

- A missing `end` now says how many blocks were opened, how many were found, and which block the last `end` actually closed. Before, a missing `end` inside a nest blamed the outermost block.
- Section 1 of the reference explains what `end` means, with two programs that differ only in where it sits.

## 0.6.1

- `ask` worked in the kernel but neither the browser nor the command line implemented it. Both do now.
- Starting Plain without all five kernel actions fails immediately with a clear message, rather than letting an internal error escape mid-program.
- Seven new checks run the kernel against a stand-in host, so a gap like that can't go unnoticed again.
- The reference lists all nine fields `now()` gives back, and says plainly that `day` counts while `weekday` names.
- Fixed a race on the command line where piped input could close before an answer arrived.

## 0.6.0

- `slice(thing, from, to)` — part of some text or part of a list, both ends included.
- `replace(text, old, new)` and `find(text, part)`.
- `align_left`, `align_right` and `decimals` for laying out tables. `decimals(1.5, 2)` gives `"1.50"`, which `round` can't, since numbers drop trailing zeros.
- `now()` — a fifth kernel action, giving a record with the date, time and weekday.
- `dates.plain` — leap years, days between dates, adding days, weekday names. Written in Plain itself.

## 0.5.0

- Records can be looked up by a name worked out while the program runs: `counts[word]`. The dot stays strict, so a misspelt field is still caught.
- `numbers(from, to)` for counting through a range.
- `ask(question)` — a fourth kernel action. Always gives text.
- `(1, 2, 3)` now offers to rewrite itself as `[1, 2, 3]`, and `join` on a nested list explains the extra brackets.
- `else` and `end` must sit on their own line, so the shape you see is the shape that runs.
- `read` refuses a file that isn't text instead of handing back nonsense.

## 0.4.0

- The evaluator became internally asynchronous, at a measured cost of 1.54x. Nothing changed from the outside.
- A kernel: `read`, `write` and `get`. Each needs a line of its own and none can be used inside an action.
- `plain.js`, a command-line runner.
- In a browser, `read` asks you to pick a file and `write` hands one back as a download.

## 0.3.0

- Every binding copies, so two names never share a list or record, and an action can't alter what it was given.
- An action may call itself 300 times before stopping with a message that names it.
- `repeat`, list positions and `random` all require whole numbers rather than silently rounding.
- `change` can no longer invent a record field, so a misspelling is caught.
- Actions are made at the top level only.

## 0.2.0

- `set` creates a name, `change` alters one. A typo can no longer make a second variable quietly.
- Actions see only what you pass in.
- `sort_up` and `sort_down` replaced `sort`, which never said which way round. Capitals and accents are ignored when ordering.
- `round(x, 2)` for decimal places, and rounding is symmetric about zero.
- `reverse` added.

## 0.1.0

First working version. 28 words, 18 built-in actions, running entirely in a browser.
