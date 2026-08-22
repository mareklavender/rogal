# Plain

A small programming language for getting things done, where the error messages are the point.

29 words. One way to write each thing. Blocks closed with `end`, so indentation can never break a program. Comparisons written in words, so `=` and `==` can't be confused. And when something goes wrong, the message names the line, underlines the word, explains the cause in a sentence, and where possible offers the fix as a button.

Being easy to pick up is a property of the design, not the purpose. The aim is a language small enough to hold in your head and solid enough to write real scripts in.

```plain
set prices to [12.4, 8.9, 31.2]
set total to 0

for each price in prices
  change total to total + price
end

show "Average:", round(total / count(prices), 2)
```

```
Average: 17.5
```

Runs entirely in a browser. Nothing to install.

**Status:** working prototype, v0.3.0. **The name is a placeholder** — it hasn't been decided, and the repo will be renamed when it is.

---

## Files

| File | What it is |
|---|---|
| `plain-core.js` | The language — tokeniser, parser, interpreter. Edit this. |
| `plain-ui.html` | The playground page. Edit this. |
| `build.js` | Fuses the two into `plain.html`. |
| `test.js` | 88 checks over the language. |
| `plain.html` | **Generated.** The single file to share. Never edit by hand. |
| `plain-reference.md` | The complete language reference. |

Three sources, one deliverable. The split exists so that a change to the language shows up as a few lines in the history rather than a whole rewritten page.

## Working on it

Needs [Node.js](https://nodejs.org). Nothing else — no build tools, no dependencies.

```
node test.js      # check nothing broke
node build.js     # produce plain.html
```

Always run the tests before building. They catch the mistakes that are easy to make and hard to notice — a diagnostic that stops firing, a built-in that quietly starts modifying its input.

The version lives in one place, at the top of `plain-core.js`:

```js
const PLAIN_VERSION = "0.2.0";
```

The build stamps it into the page, so the two can't drift apart. Bump it whenever the language changes.

## Sharing it

Send a **link**, not the file. iOS blocks JavaScript in local HTML, so anyone opening `plain.html` from Files, Mail or a cloud drive on an iPhone sees a dead page with no examples and no Run button.

Drag `plain.html` onto [Netlify Drop](https://app.netlify.com/drop) for a public URL in about a minute, no account needed. Then it works everywhere.

## Design decisions

The reasoning behind these is in `plain-reference.md`.

- **`set` creates, `change` alters.** A typo can't quietly make a second variable.
- **A name holds a value, not a link to someone else's.** Every binding copies, so no two names ever share a list or record.
- **Actions see only what you pass in** and can't alter it. An action's first line lists everything it touches, and every action lives at the top level.
- **Nothing is ever changed in place.** `add`, `remove` and `sort_up` all hand back a new value.
- **An `if` accepts only `true` or `false`.** Nothing is secretly truthy.
- **Nothing is silently rounded.** Fractional counts and positions are errors, not guesses.
- **Lists count from 1**, matching how people already count.

## What's next

1. Make the evaluator async internally — invisible from the outside, and the gate on everything below.
2. A kernel of three primitives: `read`, `write`, `get`, usable **at the top level of a program only**, never inside an action. That keeps every action pure, which in turn keeps every library runnable in a browser as well as on a computer.
3. Standalone binaries, via Bun.
4. Libraries, written in Plain itself rather than wrapping JavaScript packages.

The language is identical everywhere it runs. Only the kernel differs, and anything a browser can't do explains itself rather than failing quietly.

Known gaps are listed in section 18 of the reference: no files or network, no text formatting, no error handling, no modules, no input.
