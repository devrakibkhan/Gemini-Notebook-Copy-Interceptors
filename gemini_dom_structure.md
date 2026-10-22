# Gemini Notebook — DOM Structure Reference

> This file documents the HTML/DOM structure used by Google's Gemini Notebook (notebook.google.com / notebooklm.google.com) chat interface. It is compiled from user-inspected elements and is intended as a reference for this Chrome Extension's development.

## General Notes

- Gemini Notebook is an **Angular** application.
- Elements have Angular-specific attributes like `_ngcontent-ng-c1432174999=""` and `_nghost-ng-c1973222095=""`. These are auto-generated and change between sessions.
- The `data-start-index` attribute on elements indicates the character offset within the response text.

---

## Element Types

### 1. Paragraph Container

```html
<div _ngcontent-ng-c1432174999="" class="paragraph normal" data-start-index="1556" dir="auto">
  <!-- child elements: <span>, <i>, <i class="code">, <code class="code">, etc. -->
</div>
```

- **Class:** `paragraph normal`
- **Role:** Wraps a single paragraph of chat response text.

---

### 2. Normal Text

```html
<span _ngcontent-ng-c1432174999="" data-start-index="3660">২. </span>
```

- **Tag:** `<span>`
- **Role:** Plain, non-styled text segments.

---

### 3. Italic Text

```html
<i _ngcontent-ng-c1432174999="" data-start-index="1556">ইনপুট ও আউটপুট নেওয়ার সময়...</i>
```

Another example (mixed Bengali & English terms in italic):
```html
<i _ngcontent-ng-c1432174999="" data-start-index="4209">এখানে 'const' শব্দটি মূল কীওয়ার্ড যা মানটিকে স্থির রাখে, ConstType হলো ডেটার ধরন (যেমন: int বা float), ConstName হলো ধ্রুবকের নাম এবং ConstValue হলো তার নির্দিষ্ট মান।</i>
```

- **Tag:** `<i>` (without any class)
- **Role:** Italic / emphasized text in the response.
- **Note:** Standard HTML `<i>` tag without class. When pasting into MS Word:
  - MS Word requires `mso-bidi-font-family` for Bengali script characters.
  - The Windows font family registered name is `BenSenHandwriting` (no space).
  - An inline `<font face="BenSenHandwriting">` inside a styled `<span>` ensures both Latin and Bengali characters render in BenSenHandwriting in Word.

---

### 4. Inline Code (Two Variants!)

Gemini Notebook uses **two different tags** for inline code, both with `class="code"`:

#### Variant A: `<i class="code">`
```html
<i _ngcontent-ng-c1432174999="" class="code" data-start-index="1665">int</i>
```

#### Variant B: `<code class="code">`
```html
<code _ngcontent-ng-c1432174999="" class="code" data-start-index="3663">#define</code>
```

- **Common Class:** `code`
- **Visual Appearance:** Monospace font, light background color, small padding — resembles a "code chip" or "code badge".
- **Selector for both:** `.code` or `i.code, code.code`

> **Important:** Any logic targeting inline code MUST handle BOTH `<i class="code">` AND `<code class="code">` variants. Using only `i.code` will miss the `<code>` variant.

---

### 5. Code Blocks

Gemini Notebook / Gemini Chat renders code blocks in a few variations:

#### Variant A: `<code-block-element-view>` wrapper
```html
<code-block-element-view _ngcontent-ng-c4194277229="" _nghost-ng-c1973222095="">
  <pre _ngcontent-ng-c1973222095="" dir="auto">
    <code _ngcontent-ng-c1973222095="">#define ConstName ConstValue
</code>
  </pre>
</code-block-element-view>
```

#### Variant B: Bare `<pre>` with `<code>`
```html
<pre _ngcontent-ng-c1973222095="" dir="auto">
  <code _ngcontent-ng-c1973222095="">#include &lt;stdio.h&gt;
...
</code>
</pre>
```

#### Variant C: Bare multiline `<code>`
```html
<code _ngcontent-ng-c1973222095="">#include &lt;stdio.h&gt;
...
</code>
```

- **Wrapper:** `<code-block-element-view>` (Angular custom element)
- **Structure:** `<code-block-element-view>` → `<pre>` → `<code>`, or `<pre>` → `<code>`, or bare multiline `<code>`
- **MS Word Critical Requirement:** MS Word's clipboard HTML engine completely ignores the CSS `white-space: pre-wrap` property on `<div>` elements. Placing raw newline `\n` characters in a `<div>` causes MS Word to collapse all lines into a single continuous wrapped paragraph.
- **Handling:**
  - Code lines are split by `\n` and joined with `<br>` tags (`Shift+Enter` in Word), preserving the exact line breaks within a single shaded block.
  - Leading spaces and 2+ consecutive spaces are converted to `&nbsp;`.
  - Tabs (`\t`) are converted to 4 `&nbsp;`.
  - Empty lines are set to `&nbsp;` so Word preserves blank lines.
  - Monospace font `Lucida Console` (10.0pt), light gray background `#f0f4f9`, and a subtle border are applied.
  - Multiline `<code>` elements without `<pre>` are recognized as code blocks and formatted accordingly, rather than treated as inline chips.

---

### 6. Mathematical Equations (KaTeX)

```html
<span class="katex">
  <span class="katex-mathml">
    <math xmlns="http://www.w3.org/1998/Math/MathML">
      <annotation encoding="application/x-tex">LaTeX source</annotation>
    </math>
  </span>
  <span class="katex-html" aria-hidden="true">
    <!-- Complex KaTeX HTML rendering with positioned spans -->
  </span>
</span>
```

- **Wrapper:** `<span class="katex">`
- **Contains:** `.katex-mathml` (accessible MathML) + `.katex-html` (visual rendering)
- **Raw LaTeX:** Found in `<annotation>` tag inside `.katex-mathml`, or in `data-math` attribute on ancestor elements.
- **Key KaTeX classes:** `.mfrac`, `.msqrt`, `.msupsub`, `.mbin`, `.mrel`, `.mord`, `.textbf`, `.textit`, `.fbox`, `.cancel`, `.sout`, `.mover`, `.munder`, `.mtable`, etc.

---

### 7. Citations (NotebookLM-specific)

```html
<span class="notebooklm-processed" aria-label="[1]">1</span>
<button class="citation-marker">1</button>
<mat-icon>...</mat-icon>
```

- **Role:** Source citation markers injected by NotebookLM.
- **Handling:** Removed during copy to prevent clutter in pasted text.

---

### 8. Tables and Table Paragraphs

Gemini Notebook renders markdown tables as standard HTML `<table>`, but wraps cell contents in custom paragraph `<div>` elements:

```html
<table>
  <tbody>
    <tr>
      <td>
        <div _ngcontent-ng-c1432174999="" class="paragraph table-paragraph normal" data-start-index="6143" dir="auto">
          <span _ngcontent-ng-c1432174999="" data-start-index="6143">১. ভেরিয়েবল হলো ডেটা রাখার জন্য মেমোরি লোকেশনের নাম বা অ্যাড্রেস।</span>
          <span _ngcontent-ng-c1432174999="" data-start-index="6208">&lt;br&gt;</span>
          <i _ngcontent-ng-c1432174999="" data-start-index="6216">অর্থাৎ মেমোরির নির্দিষ্ট একটি পাত্রের নাম যেখানে মান রাখা হয়।</i>
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

- **Cell wrapper class:** `div.paragraph.table-paragraph.normal`
- **MS Word Gotcha:** MS Word isolates table cells (`<w:tc>`) from the surrounding document and outer `<div>` containers. Word does NOT inherit font styles from outer wrapper `<div>`s into table cells.
- **Handling for MS Word:**
  - `<table>`, `<th>`, and `<td>` must have explicit font styling (`font-family`, `mso-ascii-font-family`, `mso-bidi-font-family`).
  - Inner block elements (`.table-paragraph`, `.paragraph`, `p`, `div`) must also have explicit font styling.
  - Cell contents must be wrapped in `<font face="Kohinoor Bangla">` so Word's legacy and modern HTML converters both enforce the default document font on normal cell text, while inner code chips (`Lucida Console`) and italic spans (`BenSenHandwriting`) retain their specific styling.

---

## Dark Mode vs Light Mode

Gemini Notebook supports both light and dark themes.

| Property | Light Mode | Dark Mode |
|----------|-----------|-----------|
| **Code background** | Light gray (`#f0f4f9` or similar) | Dark gray/black (`rgb(40,40,40)` or similar) |
| **Code text color** | Dark (`#1b1b1b`) | Light (`#e0e0e0` or similar) |
| **Page background** | White | Dark |

> **For MS Word compatibility:** Dark mode colors (dark backgrounds, light text) are unsuitable for Word's white page. Computed styles from the page should be validated — if the background is too dark, fallback to light-mode defaults.

---

## Quick Selector Reference

| Target | CSS Selector |
|--------|-------------|
| Inline code (single-line) | `.code` or `i.code, code.code, code` (without `\n`) |
| Italic text (not code) | `i:not(.code), em` |
| Code blocks (all variants) | `code-block-element-view`, `pre`, or `code` (with `\n`) |
| Code block inner content | `code-block-element-view code`, `pre > code`, or `code` |
| KaTeX equations | `.katex` |
| Citations to remove | `span.notebooklm-processed[aria-label], button.citation-marker, mat-icon` |
| Paragraph containers | `div.paragraph` |
| Tables & Cells | `table`, `th`, `td` |
| Table cell paragraphs | `div.table-paragraph` |

---

## Font & Size Strategy for MS Word

| Content Type | Font Family | Size | Notes |
|--------------|-------------|------|-------|
| Normal text (Bangla/English) | `Kohinoor Bangla` | `10.0pt` | Inherited via outer `div` and applied to `div.paragraph` |
| Italic text | `BenSenHandwriting` | `10.0pt` | Replaced with `<span>` + `<font face="BenSenHandwriting"><i>` |
| Inline code | `Lucida Console` | `10.0pt` | Replaced with `<span>` + `<font face="Lucida Console">` |
| Code blocks | `Lucida Console` | `10.0pt` | Converted to styled `<div>` + `<font face="Lucida Console">` with `<br>` line breaks & `&nbsp;` indentation |
| Table content | `Kohinoor Bangla` | `10.0pt` | Applied directly to `table`, `th`, `td`, and inner `table-paragraph` |

