# Project Detail: Gemini Notebook Copy Interceptor

## 1. Project Overview
**Name:** Gemini Notebook Copy Interceptor
**Platform:** Google Chrome Extension (Manifest V3)
**Primary Goal:** To seamlessly intercept copy events in the browser and restructure copied text and HTML payloads. Its main focus is accurately translating web-based mathematical equations (rendered by KaTeX) into **MathML** for flawless pasting into rich-text editors like Microsoft Word.

## 2. The Core Problem
When users copy content containing mathematical formulas from Google NotebookLM (which uses KaTeX), the resulting HTML clipboard payload consists of complex DOM elements (like `<span>` with absolute positioning and custom CSS classes). 
Word processors like **Microsoft Word do not support KaTeX HTML**. When a user pastes this data, the equations break, resulting in unreadable, garbled, or merged text. MS Word requires native **MathML** tags to render equations properly.

## 3. How This Extension Solves the Problem
This extension operates seamlessly in the background to fix this:
1. **Intercepts the Copy Event:** It attaches an event listener to the `copy` action on configured domains.
2. **DOM Cloning & Cleaning:** It clones the user's highlighted text and removes unwanted elements, such as invisible citation markers injected by NotebookLM.
3. **Smart Translation (KaTeX to MathML):** It scans the copied content for `.katex` elements and intelligently parses the KaTeX CSS classes into native MathML tags. 
   - *Example:* `.textbf` becomes `<mstyle mathvariant="bold">`.
   - *Example:* `\color{blue}` (`style="color: blue;"`) becomes `<mstyle mathcolor="blue">`.
   - *Example:* `\boxed{}` (`.fbox`) becomes `<menclose notation="box">`.
4. **Clipboard Injection:** It replaces the default `text/html` and `text/plain` clipboard data with the newly generated MathML and raw LaTeX strings, tricking MS Word into rendering perfect, native equations.

## 4. Architecture and File Structure
The project is built entirely with Vanilla JavaScript, HTML, and CSS. No heavy frameworks are used.

### Core Components
- **`manifest.json`**: The Chrome Extension Manifest (V3) defining permissions (`clipboardWrite`, `storage`, `activeTab`, `scripting`) and registering the content script.
- **`content.js`**: The brains of the extension. 
  - Contains the `copy` event listener.
  - Contains the `buildMathML()` recursive function, which maps specific KaTeX classes (`.textbf`, `.fbox`, `.mfrac`, `.sqrt`, `.cancel`, etc.) to MathML tags (`<mstyle>`, `<menclose>`, `<mfrac>`, `<msqrt>`).
  - Contains logic to extract the raw LaTeX code from `data-math` attributes to generate a perfect `text/plain` payload.
- **`popup.html` / `popup.css` / `popup.js`**: The user interface for the extension. 
  - Allows users to globally toggle the extension on/off.
  - Allows users to add or remove domains where the interceptor should be active (defaults to `notebooklm.google.com`).
  - Uses `chrome.storage.sync` to save user preferences across devices.

## 5. Key AI Context (For AI Assistants)
**If you are an AI assistant reading this file to understand the codebase, note the following:**
- The primary logic for parsing KaTeX to MathML lives entirely in `content.js` inside the `buildMathML` function.
- If the user requests adding support for a new LaTeX command (e.g., matrices or integrals), you must inspect how KaTeX renders that command in HTML, and then map those specific KaTeX CSS classes to their corresponding MathML equivalents inside `buildMathML`.
- The `plainText` extraction logic prioritizes the `data-math` attribute because Gemini Notebook stores the raw LaTeX source string there.
