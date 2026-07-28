# Gemini Notebook Copy Interceptor

A Google Chrome extension designed to preserve mathematical equations (KaTeX/MathML) when copying text from NotebookLM and other configured AI chatbot sites. 

## Features
- **Preserves Math Formatting**: Converts KaTeX blocks into properly formatted MathML so equations paste correctly into Microsoft Word, Notion, and other rich-text editors.
- **Dynamic Domain Support**: Works on `notebooklm.google.com` by default. You can easily add other domains (like ChatGPT or Claude) via the settings popup.
- **Clean Settings UI**: Simple toggle to enable/disable the interceptor, and a sleek interface to manage your active domains.

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
