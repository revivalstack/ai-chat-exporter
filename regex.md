# Regular Expression (Regex) Search Guide for AI Chat Exporter

This guide explains how to use Regular Expressions (Regex) for searching messages within the AI Chat Exporter's outline. Regex is a powerful tool for pattern matching in text, allowing you to find specific phrases, variations of words, or complex patterns that simple text searches cannot.

---

## What is Regex?

A Regular Expression (Regex) is a sequence of characters that defines a search pattern. When you use regex in the search bar of the AI Chat Exporter, you're not just looking for an exact match of your typed characters, but for text that fits the pattern you've described.

The AI Chat Exporter's search bar uses **JavaScript's built-in `RegExp` engine**.

---

## Basic Concepts

- **Literal Characters:** Most characters (e.g., `a`, `B`, `1`, `!`) match themselves literally.
  - Example: `hello` will match the exact phrase "hello".
- **Case-Insensitivity (Default):** By default, the tool's regex search is **case-insensitive**. This means `apple` will match "apple", "Apple", or "APPLE".
  - If you need case-sensitive matching, you can specify it using flags (see "Flags" below).
- **Metacharacters:** Some characters have special meanings in regex. If you want to search for these characters literally, you must "escape" them by putting a backslash (`\`) before them.
  - Common metacharacters: `.`, `*`, `+`, `?`, `^`, `$`, `(`, `)`, `[`, `]`, `{`, `}`, `|`, `\`, `/`
  - Example: To search for a literal question mark, you'd type `\?`.

---

## Common Regex Components & Examples

### Quantifiers (How many times?)

These specify how many times the preceding character or group must occur.

- `?`: **Zero or one occurrence (optional).** Makes the preceding item optional.

  - `colou?r`: Matches "color" or "colour" (the 'u' is optional).
  - `Match(es)?`: Matches "Match" or "Matches". This is a common solution if you want to make a suffix optional.
    - **Why `Match?s` didn't work for "Matches":** In `Match?s`, the `?` only applies to the character directly before it, which is `h`. So, it means "M-a-t-c" followed by an _optional_ "h", then followed by "s". This would match "Matcs" or "Matchs", but not "Matches".

- `*`: **Zero or more occurrences.**
  - `go*gle`: Matches "ggle", "gogle", "google", "gooogle", etc.
- `+`: **One or more occurrences.**
  - `Go+gle`: Matches "Google", "Gooogle", etc., but not "Ggle".
- `{n}`: **Exactly `n` occurrences.**
  - `\d{3}`: Matches exactly three digits (e.g., "123").
- `{n,}`: **At least `n` occurrences.**
  - `\d{3,}`: Matches three or more digits.
- `{n,m}`: **Between `n` and `m` occurrences (inclusive).**
  - `\d{3,5}`: Matches three, four, or five digits.

### Character Classes (What kind of character?)

These match any single character from a set.

- `[abc]`: Matches `a`, `b`, or `c`.
- `[0-9]`: Matches any single digit from 0 to 9.
- `[a-zA-Z]`: Matches any single uppercase or lowercase letter.
- `[^abc]`: Matches any character _except_ `a`, `b`, or `c`.

### Shorthand Character Classes

- `.`: **Any character** (except newline).
- `\d`: Any **digit** (0-9). (Equivalent to `[0-9]`)
- `\D`: Any **non-digit** character.
- `\s`: Any **whitespace** character (space, tab, newline, etc.).
- `\S`: Any **non-whitespace** character.
- `\w`: Any **word character** (alphanumeric and underscore, `[a-zA-Z0-9_]`).
- `\W`: Any **non-word** character.

### Anchors & Boundaries (Where is it?)

These don't match characters, but positions within the string.

- `^`: **Start of the string/line.**
  - `^Hello`: Matches "Hello" only if it's at the beginning of the message content.
- `$`: **End of the string/line.**
  - `world$`: Matches "world" only if it's at the end of the message content.
- `\b`: **Word boundary.** Matches the position between a word character (`\w`) and a non-word character (`\W`), or the beginning/end of a string.
  - `\bcat\b`: Matches the whole word "cat", but not "catamaran" or "cats".

### Grouping & Alternation

- `()`: **Grouping.** Creates a sub-expression that can be treated as a single unit (e.g., for quantifiers or alternation).
  - `(apple|orange)`: Groups "apple" or "orange".
- `|`: **Alternation (OR).** Matches either the expression before or after the `|`.
  - `apple|orange`: Matches "apple" or "orange".

### Flags (How to modify the search behavior?)

Flags are placed at the end of a regex pattern, often after a `/` if you're using a literal regex. The tool's search bar applies the `i` flag by default for case-insensitivity if you just type plain text.

- `i`: **Case-insensitive search.** (Already default in the tool if no `/` are used).
- `g`: **Global search.** (Not directly relevant for this search bar as it's testing for presence, not finding all occurrences within a single message).
- `m`: **Multiline search.** Treats `^` and `$` as matching the start/end of lines within a multi-line string, not just the start/end of the entire string.

---

### Example Regex Searches (Valid & Invalid)

| Regex Pattern | Explanation                                      | Matches (Example Text)     | Invalid? |
| :------------ | :----------------------------------------------- | :------------------------- | :------- |
| `hello`       | Simple text search (case-insensitive by default) | "Hello", "hello there"     | No       |
| `/Hello/`     | Case-sensitive search for "Hello"                | "Hello" (but not "hello")  | No       |
| `[aeiou]`     | Any single vowel (a, e, i, o, u)                 | "a" in "cat", "e" in "dog" | No       |
| `\d{2}`       | Exactly two digits                               | "12", "99"                 | No       |
| `\buser\b`    | The whole word "user"                            | "user message"             | No       |
| `(cat\|dog)`  | Either "cat" or "dog"                            | "my cat", "your dog"       | No       |
| `ChatGPT\s\d` | "ChatGPT" followed by a space and a digit        | "ChatGPT 4"                | No       |
| `Match(es)?`  | "Match" or "Matches"                             | "Match", "Matches"         | No       |
| `(`           | Unclosed group                                   | -                          | Yes      |
| `[`           | Unclosed character set                           | -                          | Yes      |
| `*`           | Quantifier without a preceding element           | -                          | Yes      |
| `abc\`        | Incomplete escape sequence (trailing backslash)  | -                          | Yes      |

---

---

## Tips for Using Regex in the Tool

- **Default Case-Insensitivity:** If you just type `my question`, it will match "My Question", "my question", etc.
- **Explicit Flags:** If you want to specify flags yourself (e.g., for truly case-sensitive search), you can wrap your regex in forward slashes, like `/pattern/flags`. For example, `/hello/` would be case-sensitive, while `/hello/i` would be case-insensitive.
- **Error Messages:** If you enter an invalid regex, the search bar will display a "Invalid regex: [error message]" directly below it. Correct your pattern to clear the error.
- **Testing Regex:** If you're unsure about a regex pattern, you can use online regex testers (like regex101.com or regexr.com) to build and test your patterns before using them in the tool.
- **Simplicity First:** Start with simple text. If that's not enough, gradually add regex components.

Regular expressions can seem complex at first, but with practice, they become an incredibly efficient way to find exactly what you're looking for in large amounts of text.
