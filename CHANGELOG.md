# Changelog

## 0.9.6

- `reach` now works when the action comes from a library, not only from your own program.
- Corrected the places that said an action can never use `read`, `write`, `get`, `ask` or `now`. An ordinary action can't; one made with `reach` can.
- The **json** example shows real JSON instead of a way to get a quote mark.
- The **a table from text** example is marked as ending on a deliberate failure.

## 0.9.5

- `ask` puts its question at the bottom of the output rather than in a browser prompt box, so it works on phones.
- An **asking** example in the playground.
- The README leads with the link, since that is the easiest way to try Rogal.
- Corrected section 21: `now()` and the `dates` library mean Rogal does have dates, and `fail` is a way to stop a program deliberately.

## 0.9.4

- The **+ library** button works.
- About fifty words from other languages — `print`, `len`, `return`, `function`, `var`, `null`, `elif`, `class`, `try` — now point to the Rogal equivalent.
- `is equal`, `is equal to` and `is equals` say that `is` is the whole comparison.
- A genuine typo still gets its "did you mean" suggestion.

## 0.9.3

- A `json` library, written in Rogal. `parse_json` turns JSON text into values, and `json` turns them back.
- The **+ library** button takes a `.rogal` file of your own and makes `use` find it. Yours wins over one that shipped.
- Apache 2.0, with a notice at the top of each source file.
- Text is written on one line. The reference shows `join` as the way to write a block.
- Fixed a parse error inside a library naming the file twice.

## 0.9.2

- Numbers are compared the way they are shown, so `0.1 + 0.2` equals `0.3`.
- `reach` creates an action that may use `read`, `write`, `get`, `ask` and `now`, under the same rules they follow.
- `fail "message"` stops a program with a message you write.
- A `csv` library, written in Rogal: rows, records, quoted fields, and back to text.
- `\r` works as an escape.
- An error inside a library says which file it came from.

## 0.9.0

- The playground can save and open files, with a filename field and **Save** and **Open** buttons. Ctrl+S and Ctrl+O work too.
- A **blank** chip for starting from nothing.
- Loading an example or opening a file asks first if you would lose unsaved work.
- The README is for people using Rogal; working on the language itself moved to `CONTRIBUTING.md`.
- Recounted: 30 words and 32 actions, of which 27 are built in and 5 reach outside the program.

## 0.8.0

- Renamed from Plain to Rogal. Files are now `.rogal`, and the playground is `rogal.html`. Nothing about the language changed.

## 0.7.1

- The reference opens with how to run a program — in a browser or with Node — and where files and libraries are looked for.
- The help text names how you actually started it, rather than always saying `node rogal.js`.
- A full proofread. Among other things, the kernel section still said "three actions" when there are five.

## 0.7.0

- `use "dates"` brings in the actions from another file. A missing file, a clashing name or a circle is reported before the program runs.
- `dates` travels with the playground, so `use "dates"` works in a browser as well as on a computer.
- The reference describes the language as it is, without plans or history.

## 0.6.2

- A missing `end` now says how many blocks were opened, how many were found, and which block the last `end` actually closed. Before, a missing `end` inside a nest blamed the outermost block.
- Section 1 of the reference explains what `end` means, with two programs that differ only in where it sits.

## 0.6.1

- `ask` worked in the kernel but neither the browser nor the command line implemented it. Both do now.
- Starting Rogal without all five kernel actions fails immediately with a clear message, rather than letting an internal error escape mid-program.
- Seven new checks run the kernel against a stand-in host, so a gap like that can't go unnoticed again.
- The reference lists all nine fields `now()` gives back, and says plainly that `day` counts while `weekday` names.
- Fixed a race on the command line where piped input could close before an answer arrived.

## 0.6.0

- `slice(thing, from, to)` — part of some text or part of a list, both ends included.
- `replace(text, old, new)` and `find(text, part)`.
- `align_left`, `align_right` and `decimals` for laying out tables. `decimals(1.5, 2)` gives `"1.50"`, which `round` can't, since numbers drop trailing zeros.
- `now()` — a fifth kernel action, giving a record with the date, time and weekday.
- `dates.rogal` — leap years, days between dates, adding days, weekday names. Written in Rogal itself.

## 0.5.0

- Records can be looked up by a name worked out while the program runs: `counts[word]`. The dot stays strict, so a misspelt field is still caught.
- `numbers(from, to)` for counting through a range.
- `ask(question)` — a fourth kernel action. Always gives text.
- `(1, 2, 3)` now offers to rewrite itself as `[1, 2, 3]`, and `join` on a nested list explains the extra brackets.
- `else` and `end` must sit on their own line, so the shape you see is the shape that runs.
- `read` refuses a file that isn't text instead of handing back nonsense.

## 0.4.0

- The evaluator became internally asynchronous, at a measured cost of 1.54x. Nothing changed from the outside.
- A kernel: `read`, `write` and `get`. Each needs a line of its own and nyou can be used inside an action.
- `rogal.js`, a command-line runner.
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
