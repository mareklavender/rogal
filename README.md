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

**Status:** working prototype, v0.4.0. **The name is a placeholder** — it hasn't been decided, and the repo will be renamed when it is.

---

## Just want to try it?

You need one file: **`plain.html`**. Open it in a browser — nothing to install.

Better still, use a link. See *Sharing it* below.

To run programs against real files, you also need `plain-core.js` and `plain.js`, and Node installed:

```
node plain.js myscript.plain
```

## Files

| File | What it is |
|---|---|
| `plain-core.js` | The language — tokeniser, parser, interpreter. Edit this. |
| `plain-ui.html` | The playground page. Edit this. |
| `build.js` | Fuses the two into `plain.html`. |
| `test.js` | 88 checks over the language. |
| `plain.js` | Runs a program from the command line, with files and the network. |
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
const PLAIN_VERSION = "0.4.0";
```

The build stamps it into the page, so the two can't drift apart. Bump it whenever the language changes.

## Sharing it

Send a **link**, not the file. iOS blocks JavaScript in local HTML, so anyone opening `plain.html` from Files, Mail or a cloud drive on an iPhone sees a dead page with no examples and no Run button.

**Cloud storage is not a substitute.** Dropbox, iCloud, Google Drive and Proton Drive all *preview* the file rather than serving it, so JavaScript stays blocked and you get the same dead page. It needs real hosting.

Any of these give you a URL in a minute or two:

- [Netlify Drop](https://app.netlify.com/drop) — drag the file on, no account needed
- Cloudflare Pages
- GitHub Pages — free, but only from a public repository

On an iPhone without hosting, **Documents by Readdle** has a real browser engine built in and will run the file properly from local storage.

## Design decisions

The reasoning behind these is in `plain-reference.md`.

- **`set` creates, `change` alters.** A typo can't quietly make a second variable.
- **A name holds a value, not a link to someone else's.** Every binding copies, so no two names ever share a list or record.
- **Actions see only what you pass in** and can't alter it. An action's first line lists everything it touches, and every action lives at the top level.
- **Nothing is ever changed in place.** `add`, `remove` and `sort_up` all hand back a new value.
- **An `if` accepts only `true` or `false`.** Nothing is secretly truthy.
- **Nothing is silently rounded.** Fractional counts and positions are errors, not guesses.
- **Lists count from 1**, matching how people already count.
- **Reaching outside is visible.** `read`, `write` and `get` need a line of their own and can't be used inside an action, so every action stays free of surprises.

## What's next

1. ~~Async evaluator~~ — done in v0.4.0, at a measured cost of 1.54x.
2. ~~A kernel: `read`, `write`, `get`~~ — done in v0.4.0.
3. Standalone binaries, via Bun.
4. Libraries, written in Plain itself rather than wrapping JavaScript packages.
5. Text formatting — padding, alignment, fixed decimals.

The language is identical everywhere it runs. Only the kernel differs, and anything a browser can't do explains itself rather than failing quietly.

Known gaps are listed in section 18 of the reference: no files or network, no text formatting, no error handling, no modules, no input.
