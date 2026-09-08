# Project Detail: Gemini Notebook Copy Interceptor

## 1. What is our complete project?
The project is a **Google Chrome Extension** named "Gemini Notebook Copy Interceptor" (Version 1.3, Manifest V3). It provides a background capability to fix clipboard text and HTML payloads during a copy action, specifically targeting mathematical equations that are otherwise lost or garbled when pasting into rich-text editors.

## 2. What is it about?
When users copy text containing KaTeX or similar web-based math rendering from sites like Google NotebookLM, the raw HTML copied to the clipboard is often incompatible with word processors like Microsoft Word. This extension intercepts the copy event, extracts the underlying math content, and converts it into standard **MathML**. This ensures equations paste flawlessly, preserving their structure and formatting (such as bold and italic styles).

## 3. How does it work?
The extension consists of two main parts:

### A. The Content Script (`content.js`)
- **Copy Interception**: It injects an event listener for the `copy` event across all web pages.
- **Domain Filtering**: It checks if the current URL matches the user's active domain list (defaults: `notebooklm.google.com` and `notebook.google.com`). If not, it does nothing.
- **DOM Cloning & Parsing**: If active, it clones the user's highlighted selection range and removes injected citations (`.notebooklm-processed`).
- **MathML Conversion**: It scans the cloned DOM for elements with the `.katex` class. It converts structures like fractions (`mfrac`), square roots (`sqrt`), and superscripts/subscripts (`msupsub`). It also detects bold (`<b>`, `<strong>`) or italic (`<i>`, `<em>`) formatting based on CSS properties and elements.
- **Clipboard Replacement**: It translates the math into valid MathML strings (e.g., `<math><mstyle mathvariant="bold">...</mstyle></math>`), wrapped with non-breaking spaces to avoid Word text-merging issues. It updates the `text/html` and `text/plain` formats, and replaces the system clipboard data, overriding the browser's default copy behavior.

### B. The User Interface (`popup.html`, `popup.js`, `popup.css`)
- **Settings Popup**: Accessible by clicking the extension icon in the Chrome toolbar.
- **Global Toggle**: Allows users to enable or disable the interceptor entirely.
- **Domain Management**: Users can dynamically add or remove domains where the interceptor should run. The current domain is automatically filled into the input field for quick adding. These preferences are saved using the `chrome.storage.sync` API, synchronizing across the user's Chrome browsers.

## 4. How was it created?
The project is built using standard web technologies without heavy frameworks:
- **Core logic**: Vanilla JavaScript for DOM manipulation, recursive walking of math nodes, and event interception.
- **UI**: Standard HTML5 and Vanilla CSS with custom switch toggles and SVG icons.
- **Chrome APIs**: Uses Manifest V3 configurations (`manifest.json`) and the `chrome.storage` API for persisting settings.

## 5. File Structure
- `manifest.json`: Configuration, permissions, and metadata for Chrome.
- `content.js`: The core logic that intercepts the copy event and builds MathML.
- `popup.html` / `popup.css`: Structure and styling for the settings interface.
- `popup.js`: Logic for toggling features and saving domain lists to Chrome storage.
- `README.md`: Setup and installation instructions.
- `icons/` (icon16.png, icon48.png, icon128.png): Various sizes for the extension UI.
- `generate_icons.ps1`: A script to generate the necessary icons.
