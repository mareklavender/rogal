# Plain — Language Reference

**Version 0.3** · Complete. Every word the language has is in this document.

Plain has 29 words and 20 built-in actions. That is the whole language. There is nothing to install, nothing to import, and no second half kept somewhere else.

---

## 1. The shape of a program

A program is a list of instructions, one per line, run from top to bottom.

```plain
set name to "Mark"
show "Hello, " + name
```

Four rules cover all of it:

- **One instruction per line.** No semicolons.
- **Indentation is yours.** Blocks are closed by the word `end`, so spacing can never change what a program does. Indent for readability or don't.
- **`#` starts a note.** Everything after it on that line is ignored.
- **Blank lines mean nothing.** Use them freely.

```plain
# This is a note. The line below is not.
set total to 0
```

---

## 2. The six kinds of value

| Kind | Written as | Notes |
|---|---|---|
| Number | `12`, `3.5`, `-8` | One kind only. No separate whole/decimal types. |
| Text | `"hello"` | Always double quotes. |
| True/false | `true`, `false` | The only things an `if` will accept. |
| List | `[1, 2, 3]` | **Items count from 1.** |
| Record | `{name: "Ada"}` | Named fields. |
| Nothing | `nothing` | No value yet. |

There is a seventh kind you create yourself — an **action**, made with `make`. See section 9.

Inside text you can use `\n` for a new line, `\"` for a quote mark, and `\\` for a backslash.

---

## 3. `set` and `change` — names and values

`set` creates a name. `change` gives an existing one a new value. They are separate on purpose, so a typo can never quietly create a second variable.

```plain
set total to 0          # create
change total to 5       # alter
```

Each fails clearly if used the wrong way round:

```plain
set total to 0
set total to 5
```
> Line 2: `total` already exists. To give it a new value, use `change total to 5`.

```plain
change score to 10
```
> Line 1: There's nothing called `score` to change. Create it first with `set score to 10`.

```plain
set total to 0
change totl to total + 5
```
> Line 2: There's nothing called `totl` to change. There is something called `total` — did you mean that?

That last one is the point of the whole design. In most languages it silently makes a second variable and the bug surfaces much later.

There is no `=` in Plain, so `=` and `==` can never be confused.

**One name means one thing.** `set` fails if the name is already in use anywhere you can see it, including the built-in actions:

```plain
set count to 3
```
> Line 1: `count` is already the name of a built-in action.

Names start with a letter or `_` and may contain letters, digits and `_`. They are case-sensitive.

`change` also reaches inside lists and records:

```plain
set xs to [10, 20, 30]
change xs[2] to 99         # xs is now [10, 99, 30]

set p to {name: "Ada"}
change p.name to "Grace"
change p.city to "London"  # adds a new field
```

`set` only ever creates a whole new name, so it never has a `.` or `[` after it.

### A name holds a value, not a link

Giving one name to another copies the value. The two are then independent:

```plain
set prices to [10, 20, 30]
set backup to prices

change prices[1] to 99

show prices      # [99, 20, 30]
show backup      # [10, 20, 30]
```

This is how numbers and text have always behaved — `set b to a` then changing `a` never altered `b`. Lists and records work the same way, so nothing anywhere is ever shared by accident.

The same is true when a value goes into an action, which is what makes an action's seal complete:

```plain
set data to [1, 2, 3]

make wreck(xs)
  change xs[1] to 999
  give 0
end

show wreck(data)
show data        # [1, 2, 3] — untouched
```

An action can read what you pass in and give something back. It can never reach out and alter anything.

If you want two names to match again later, say so — `change backup to prices` takes a fresh copy at that moment.

## 4. `show` — displaying something

```plain
show "Hello"
show 42
show total
```

Several values separated by commas appear on one line, with a space between:

```plain
set prices to [10, 20]
show "How many:", count(prices), "Total:", sum(prices)
```
```
How many: 2 Total: 30
```

`show` displays text without its quote marks. Inside a list or record, text keeps its quotes so you can see what is text and what is a number.

---

## 5. How things combine — the important part

This is the rule that makes everything else fit together:

> **Anywhere a value is allowed, any expression that produces a value is allowed.**

An **expression** is anything that produces a value: a number, some text, a name, a list, arithmetic, a comparison, a field, a position, or an action call. A **statement** is a whole instruction: `set`, `change`, `show`, `if`, `for each`, `repeat`, `while`, `make`, `give`, `stop`.

So `count(prices)` produces a number, and can go anywhere a number can go:

```plain
show count(prices)                        # in a show
set how_many to count(prices)             # in a set
if count(prices) is more than 3           # in a test
show "Items: " + count(prices)            # joined onto text
set doubled to count(prices) * 2          # in arithmetic
```

Actions can go inside other actions. Read them from the inside out:

```plain
show first(sort_up(prices))
# sort_up(prices) gives an ordered list
# first(...) then takes its first item
```

```plain
show round(sum(prices) / count(prices))
# sum gives a total, count gives how many,
# / divides them, round makes it whole
```

Nest as deeply as you like. There is no limit and no special syntax for it.

**What does not combine:** a statement can never go inside an expression. These are all wrong:

```plain
set x to show 5            # show is a statement, not a value
set x to (set y to 2)      # set is a statement, not a value
show if true               # if is a statement, not a value
```

**Where each thing must produce the right kind of value:**

| Position | Must be |
|---|---|
| `if` and `while` tests | true or false — nothing else is accepted |
| `for each … in` | a list, or text |
| `repeat … times` | a number |
| `[position]` | a number, from 1 upwards |

---

## 6. Arithmetic and joining

```plain
show 10 + 5      # 15
show 10 - 5      # 5
show 10 * 5      # 50
show 10 / 4      # 2.5
show 10 % 3      # 1   — the remainder after dividing
```

`+` does three jobs, depending on what is on either side:

```plain
show 2 + 3                 # 5          number plus number
show "a" + "b"             # ab         text joined to text
show "Total: " + 30        # Total: 30  number folded into text
show [1, 2] + [3]          # [1, 2, 3]  two lists into one
```

That third line matters: joining a number onto text needs no conversion. `"Total: " + 30` simply works.

Dividing by zero is an error, not `infinity`.

Numbers are shown tidied, so `0.1 + 0.2` displays as `0.3` rather than a long trail of digits.

---

## 7. Comparing

Comparisons are words, never symbols. Typing `>` or `==` gets you an error telling you the word to use instead.

| Written | Means |
|---|---|
| `is` | exactly the same |
| `is not` | different |
| `is more than` | bigger |
| `is less than` | smaller |
| `is at least` | bigger or the same |
| `is at most` | smaller or the same |

```plain
if score is 10
if name is not "Ada"
if age is at least 18
```

`is` compares by content, so two lists with the same items match:

```plain
show [1, 2] is [1, 2]      # true
```

Sizes can be compared for numbers, and for text alphabetically. **Capital letters and accents are ignored when ordering**, so text sorts the way a dictionary does:

```plain
show "apple" is less than "Banana"    # true
show sort_up(["banana", "Apple"])     # ["Apple", "banana"]
```

Note that ordering ignores capitals but `is` does not — `"Apple" is "apple"` is false. Matching is exact; only ordering is forgiving.

Comparing sizes of anything else is an error, with a message pointing you at `is`.

---

## 8. Logic and conditions

```plain
and    both must be true
or     either may be true
not    turns true into false
```

```plain
if age is at least 18 and name is not ""
  show "Allowed"
end

if not (score is 0)
  show "Started"
end
```

Everything must be true or false. There is no truthiness — an empty list, zero, and empty text are **not** false in Plain, they are simply not conditions:

```plain
if count(xs) is more than 0     # correct
if xs                           # error, with a message telling you the above
```

### `if`, `else if`, `else`

```plain
if score is at least 9
  show "Publish"
else if score is at least 7
  show "Watch"
else
  show "Skip"
end
```

One `end` closes the whole chain. `else if` may repeat as many times as you like; `else` is optional and comes last.

---

## 9. Loops

### `for each` — go through a list

```plain
for each price in prices
  show price
end
```

Also works on text, one letter at a time:

```plain
for each letter in "abc"
  show letter
end
```

For a record, go through its field names:

```plain
for each field in keys(person)
  show field
end
```

### `repeat` — a fixed number of times

```plain
repeat 3 times
  show "tick"
end
```

The count must be a whole number. `repeat 2.7 times` is an error rather than a silent guess, and the message says to use `round(2.7)` if that's what you meant.

### `while` — until a test stops being true

```plain
set n to 1
while n is at most 5
  show n
  change n to n + 1
end
```

### `stop` — leave a loop early

```plain
for each n in [1, 2, 3, 4]
  if n is 3
    stop
  end
  show n
end
```
```
1
2
```

`stop` works in all three loops and leaves only the innermost one.

**A loop that never finishes** is stopped automatically after about four million steps or five seconds, with a message saying so. It will not hang.

---

## 10. Actions

`make` creates an action. `give` hands a value back.

```plain
make double(n)
  give n * 2
end

show double(21)        # 42
```

**An action sees only what you pass in.** It cannot read or alter anything outside itself, so its first line lists everything it uses:

```plain
set tax to 0.2
make total(amount)
  give amount * (1 + tax)     # error — tax is outside
end
```
> Line 3: `tax` exists outside this action, but actions can't see outside names. Pass it in instead.

```plain
make total(amount, tax)       # correct
  give amount * (1 + tax)
end
show total(100, 0.2)          # 120
```

Two useful consequences. Names are reusable — `n` can be an input to every action, since no two actions can see each other's. And nothing ever changes at a distance: to alter something outside, an action must give a value back and the caller must `change` it.

Actions can still call other actions, including themselves:

```plain
make factorial(n)
  if n is at most 1
    give 1
  end
  give n * factorial(n - 1)
end

show factorial(6)      # 720
```

**Actions are made at the top level only**, never inside an `if`, a loop, or another action. Since actions can call each other freely, nothing is lost by keeping them all in one place — and it means every action in a program is visible without hunting through blocks.

Several inputs are separated by commas, and an action with no inputs still needs its brackets:

```plain
make greet()
  show "Hello"
end

greet()
```

`give` stops the action immediately, so it doubles as an early exit. An action that never reaches a `give` produces `nothing`. Calling with the wrong number of values is an error naming what it expected.

Actions are values, so they can be stored and passed on:

```plain
make double(n)
  give n * 2
end

make apply(fn, value)
  give fn(value)
end

show apply(double, 7)   # 14
```

## 11. Lists in detail

**Items count from 1.** The first item is `xs[1]`, matching how people already count.

```plain
set xs to ["a", "b", "c"]
show xs[1]             # a
show xs[3]             # c
show count(xs)         # 3
change xs[2] to "Z"    # xs is now ["a", "Z", "c"]
```

Asking for a position that doesn't exist tells you how many there are. A position must also be a whole number — `xs[2.9]` is an error, not item 2, because a fractional position is nearly always a calculation that needs rounding.

A list may hold anything, including other lists and records:

```plain
set people to [
  {name: "Ada", born: 1815},
  {name: "Alan", born: 1912}
]

for each person in people
  show person.name + " — " + person.born
end
```

A list written across several lines needs no continuation marks, as above.

Text also takes positions, giving one letter:

```plain
show "hello"[1]        # h
```

---

## 12. Records in detail

```plain
set person to {name: "Ada", born: 1815}
show person.name       # Ada
show keys(person)      # ["name", "born"]
show count(person)     # 2
```

Reading a field that doesn't exist lists the fields it does have, and suggests a correction if your spelling was close.

Records nest, and are read with dots all the way down:

```plain
set config to {owner: {name: "Ada", city: "London"}}
show config.owner.city      # London
```

**A record's fields are fixed when you create it.** `change` can alter a field but never invent one:

```plain
set person to {name: "Ada"}
change person.age to 36
```
> Line 2: This record has no field called `age`, so there's nothing to change. It has: name. A record's fields are fixed when you create it.

So a misspelling is caught rather than quietly making a second field alongside the real one. Declare everything the record will hold when you create it, using `nothing` for anything not known yet:

```plain
set person to {name: "Ada", age: nothing}
change person.age to 36
```

---

## 13. The 20 built-in actions

Always available. Nothing to import. **None of them ever changes what you give them** — they hand back a new value, so the original is untouched.

### Lists

| Action | Needs | Gives back |
|---|---|---|
| `count(thing)` | list, text or record | how many items, letters or fields |
| `add(list, item)` | a list and anything | a **new** list with the item on the end |
| `remove(list, position)` | a list and a position | a **new** list without that item |
| `first(list)` | a list with at least one item | the first item |
| `last(list)` | a list with at least one item | the last item |
| `reverse(list)` | a list or text | it, back to front |
| `has(collection, item)` | list, text or record | true or false |
| `sum(list)` | a list of numbers only | the total |
| `sort_up(list)` | all numbers, or all text | smallest or A–Z first |
| `sort_down(list)` | all numbers, or all text | largest or Z–A first |
| `sort_up(list, "field")` | a list of records | ordered by that field |
| `join(list, separator)` | a list and some text | one piece of text |

```plain
set xs to [3, 1, 2]
show sort_up(xs)              # [1, 2, 3]
show sort_down(xs)            # [3, 2, 1]
show xs                       # [3, 1, 2] — untouched

change xs to add(xs, 4)       # to keep the result, change the name
show xs                       # [3, 1, 2, 4]
```

### `add` and `+` are not the same

`add` puts in **exactly one item**, whatever that item is. `+` **merges two lists**:

```plain
set xs to [1, 2]

show add(xs, 3)         # [1, 2, 3]
show xs + [3]           # [1, 2, 3]     — same

show add(xs, [3, 4])    # [1, 2, [3, 4]]  one new item, which is a list
show xs + [3, 4]        # [1, 2, 3, 4]    four items
```

Counting makes the difference plain:

```plain
set names to ["Ada"]

show count(add(names, ["Alan", "Grace"]))   # 2
show count(names + ["Alan", "Grace"])       # 3
```

If you're reaching for `add` with square brackets in the second slot, you almost certainly want `+`. Note that `join` is a third thing again — it turns one list into text.

Sorting records needs the field name in quotes:

```plain
set people to [
  {name: "Grace", born: 1906},
  {name: "Ada", born: 1815}
]
show sort_up(people, "born")     # Ada first
show sort_down(people, "born")   # Grace first
```

Misspelling the field is an error naming the fields that exist, with a one-tap correction. It is checked when the line runs, not before.

### Text

| Action | Needs | Gives back |
|---|---|---|
| `split(text, separator)` | two pieces of text | a list |
| `upper(text)` | text | text in capitals |
| `lower(text)` | text | text in lower case |
| `trim(text)` | text | text without leading or trailing spaces |

### Numbers

| Action | Needs | Gives back |
|---|---|---|
| `round(number)` | a number | the nearest whole number |
| `round(number, places)` | a number and how many places | rounded to that many decimals |
| `random(lowest, highest)` | two numbers | a whole number, either end possible |

```plain
show round(17.12345, 2)    # 17.12
show round(2.5)            # 3
show round(-2.5)           # -3   — same distance either side of zero
```

Rounding gives a number, and numbers drop trailing zeros, so `round(17.1, 2)` shows as `17.1` rather than `17.10`. Fixed decimal places for display needs text formatting, which doesn't exist yet.

### Converting and records

| Action | Needs | Gives back |
|---|---|---|
| `text(value)` | anything | it as text |
| `number(text)` | text that reads as a number | the number |
| `keys(record)` | a record | a list of its field names |

## 14. Order of operations

From loosest to tightest:

1. `or`
2. `and`
3. comparisons — `is`, `is more than`, and the rest
4. `+` `-`
5. `*` `/` `%`
6. `not`, and negative signs
7. calls `()`, fields `.`, positions `[]`

So `2 + 3 * 4` is 14, and `a is 1 and b is 2` reads as expected. Use brackets whenever you'd rather not rely on remembering this:

```plain
show (2 + 3) * 4           # 20
```

---

## 15. Where names live

Two rules cover all of it.

**Each block keeps its own new names.** A name created inside an `if`, `for each`, `while` or `repeat` is forgotten at its `end`:

```plain
for each price in prices
  set found to price
end
show found
```
> Line 4: `found` only exists inside the `for` on line 1. Names made inside a block are forgotten at its `end`. Create it before the block instead: `set found to nothing`

Which is exactly how to write it — create it outside, alter it inside:

```plain
set found to nothing
for each price in prices
  change found to price
end
show found
```

That's why every accumulator starts before its loop. The loop's own name works the same way: `price` exists only for the loop.

**Each action is sealed.** It sees its inputs, anything it creates itself, the built-in actions, and other actions — nothing else. See section 10.

Together these give one rule worth remembering: **a name means one thing inside any single action, and one thing at the top level.** You'll almost never meet the error, because it only fires when you typed `set` where you meant `change`, or forgot a name was already in use.

## 16. Errors

Every error names the line, underlines the exact word, says what went wrong in a sentence, and where possible says what to do about it:

```
Line 10
show "Sum is " + totl
                 ^^^^
I don't know what "totl" is.
There is something called "total". Did you mean that?
```

The full set of things Plain will tell you:

- an unknown name, with the closest name you did define (your own names are offered before built-ins)
- a name that vanished at an `end`, naming the block it was created in
- `set` on a name that already exists, and `change` on one that doesn't
- a record field that doesn't exist, with the fields that do
- a list position past the end, with how many items there are
- arithmetic on the wrong kind of value, naming both sides
- an `if` or `while` test that isn't true or false, with a suggested comparison
- an action given the wrong number of values, naming what it expects
- a block never closed, pointing at the line where it opened
- text never closed with a second quote mark
- `=` where `set` or `change` was meant, and `>` or `==` where a word was meant
- an action reaching for a name outside itself
- a field name misspelled inside `sort_up` or `sort_down`
- dividing by zero
- text that can't be read as a number
- a loop that never finishes

Where the fix is unambiguous, the playground offers it as a button.

---

## 17. The complete word list

All 29. There are no others.

**Instructions** — `set`, `change`, `to`, `show`, `if`, `else`, `end`, `for`, `each`, `in`, `repeat`, `times`, `while`, `make`, `give`, `stop`

**Comparing** — `is`, `not`, `more`, `less`, `than`, `at`, `most`, `least`

**Joining tests** — `and`, `or`

**Values** — `true`, `false`, `nothing`

Six of these (`more`, `less`, `than`, `at`, `most`, `least`) only ever appear as part of a comparison such as `is more than`, so in practice there are 23 words to learn and six that come along with them.

**Symbols** — `+` `-` `*` `/` `%` `(` `)` `[` `]` `{` `}` `,` `.` `:` `"` `#`

## 18. What Plain does not have yet

Being honest about the edges, so nothing surprises you:

- **No file or network access.** A program cannot read a file or fetch a URL. This is the kernel, and it is the next thing to build.
- **No text formatting.** No padding, alignment or fixed decimal places, so a table of numbers comes out ragged.
- **No error handling.** No `try`/`catch`. An error stops the program.
- **No modules.** One program is one file; programs can't yet use each other, so there are no libraries.
- **No input.** No way to ask the person a question while running.
- **No classes.** Records hold values, not actions on those values. This may stay that way deliberately.
- **No async, threads or timing.** Nothing runs in the background.

### Settled since v0.1

Every rough edge found so far is now closed:

1. **Names vanishing at `end`** — kept, because block scoping is correct, but the error names the block and says what to do instead.
2. **Mutation** — settled completely. Nothing is changed in place, and every binding takes a copy, so no two names ever share a list or record.
3. **Suggestions favouring built-ins** — fixed. Your own names are offered first.
4. **Asymmetric rounding** — fixed. `round(2.5)` is 3 and `round(-2.5)` is -3.
5. **Runaway recursion** — an action may call itself 300 times, then stops with a message naming it. Nothing internal can leak, even on a device with less room than usual.
6. **Silent flooring** — `repeat`, list positions and `random` all require whole numbers.
7. **Fields appearing from a typo** — `change` can no longer invent a field.
8. **Actions inside actions** — no longer allowed; every action lives at the top level.

### Open questions

- **Checking earlier.** Quoted field names are checked when the line runs. A pass over the whole program before running would catch them sooner, along with unknown names and wrong argument counts. Planned for after the kernel.
- **Text formatting.** The shape of it isn't decided yet — likely a small group of actions rather than one.
- **Effects and the kernel.** `read`, `write` and `get` are planned to work at the top level of a program only, never inside an action, so that every action stays pure. That keeps a library written in Plain runnable in a browser as well as on a computer.
- **Copying cost.** Every binding copies, which is O(n) for a large list. Copy-on-write would remove the cost without changing anything observable, if it ever matters.

## 19. A complete program

Everything in this document, used once:

```plain
# Work out which product line earned most last month.

set lines to [
  {name: "Monitors", units: 42, price: 189.99},
  {name: "Keyboards", units: 118, price: 34.50},
  {name: "Cables", units: 306, price: 4.25}
]

make revenue(line)
  give line.units * line.price
end

set totals to []

for each line in lines
  set earned to revenue(line)
  change totals to add(totals, earned)
  show line.name + ": " + round(earned, 2)
end

show ""
show "Total:", round(sum(totals), 2)
show "Average per line:", round(sum(totals) / count(lines), 2)

show ""
show "Best first:"
for each line in sort_down(lines, "units")
  show "  " + line.name + " — " + line.units + " units"
end
```

```
Monitors: 7979.58
Keyboards: 4071
Cables: 1300.5

Total: 13351.08
Average per line: 4450.36

Best first:
  Cables — 306 units
  Keyboards — 118 units
  Monitors — 42 units
```

Note the shape: `set totals to []` before the loop, `change` inside it, and `revenue` taking everything it needs as an input.
