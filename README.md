# Gemini Notebook Copy Interceptor

A Google Chrome extension designed to preserve mathematical equations (KaTeX/MathML) when copying text from NotebookLM and other configured AI chatbot sites. 

## Features
- **Preserves Math Formatting**: Converts KaTeX blocks into properly formatted MathML so equations paste correctly into Microsoft Word, Notion, and other rich-text editors.
- **Preserve Code & Text Style (Word-Optimized)**:
  - Formats inline code and code blocks with **Lucida Console** and styled background boxes.
  - Formats italic text (Bangla and English) with **BenSenHandwriting** font.
  - Defaults normal text and table cells to **Kohinoor Bangla** font.
  - Automatically formats pasted text to **10pt** for MS Word compatibility.
  - Full table and table cell support (`<table>`, `<th>`, `<td>`, `div.table-paragraph`).
  - Dark mode safe (automatically prevents dark backgrounds from bleeding into Word).
- **Dynamic Domain Support**: Works on `notebooklm.google.com` by default. You can easily add other domains (like ChatGPT or Claude) via the settings popup.
- **Clean Settings UI**: Simple toggles to enable/disable the interceptor, math spacing, and code style preservation, plus a sleek interface to manage your active domains.

## Installation
1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select the directory containing this extension.

## Usage
1. Click the extension icon in your toolbar to open settings.
2. Toggle the interceptor ON/OFF as needed.
3. Add any additional domains where you want to preserve math formatting.
4. Copy text on those sites normally. The extension intercepts the copy event automatically!

## License
[MIT](LICENSE)
