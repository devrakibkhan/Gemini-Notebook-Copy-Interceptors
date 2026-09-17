let isEnabled = true;
let activeDomains = ['notebooklm.google.com', 'notebook.google.com'];
let mathSpacing = true;

chrome.storage.sync.get({ enabled: true, mathSpacing: true, domains: ['notebooklm.google.com', 'notebook.google.com'] }, (data) => {
    isEnabled = data.enabled;
    mathSpacing = data.mathSpacing;
    activeDomains = data.domains;
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        if (changes.enabled) isEnabled = changes.enabled.newValue;
        if (changes.mathSpacing !== undefined) mathSpacing = changes.mathSpacing.newValue;
        if (changes.domains) activeDomains = changes.domains.newValue;
    }
});

function extractMathText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    if (node.classList.contains('mfrac')) {
        const fracLine = node.querySelector('.frac-line');
        if (fracLine && fracLine.parentElement) {
            const denomSpan = fracLine.parentElement.previousElementSibling;
            const numSpan = fracLine.parentElement.nextElementSibling;
            const num = numSpan ? extractMathText(numSpan) : '';
            const den = denomSpan ? extractMathText(denomSpan) : '';
            return ` ${num}/${den} `;
        }
    }
    
    let text = '';
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
        let child = children[i];
        let nextChild = children[i+1];
        
        if (nextChild && nextChild.nodeType === Node.ELEMENT_NODE && nextChild.classList.contains('msupsub')) {
            let base = extractMathText(child);
            let script = extractMathText(nextChild);
            text += `${base}^${script}`;
            i++; // skip the msupsub node as it's processed
        } else {
            text += extractMathText(child);
        }
    }

    if (node.classList.contains('sqrt')) {
        return `√(${text})`;
    }

    return text;
}

function buildMathML(node, variant = '') {
    if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent;
        if (!t.trim()) {
            if (t.length > 0) return `<mtext>&nbsp;</mtext>`;
            return '';
        }
        const safeT = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const variantAttr = variant ? ` mathvariant="${variant}"` : '';
        if (/^[0-9.]+$/.test(t)) return `<mn${variantAttr}>${safeT}</mn>`;
        if (/^[a-zA-Z]$/.test(t)) return `<mi${variantAttr}>${safeT}</mi>`;
        
        if (t.trim().length > 1 || /[^\x00-\x7F]/.test(t)) {
            if (variant) {
                return `<mstyle mathvariant="${variant}"><mtext>${safeT}</mtext></mstyle>`;
            }
            return `<mtext>${safeT}</mtext>`;
        }
        
        return `<mo${variantAttr}>${safeT}</mo>`;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const cl = node.classList;
    if (cl.contains('mspace')) {
        return '';
    }
    if (cl.contains('strut') || cl.contains('pstrut') || cl.contains('frac-line') || cl.contains('vlist-s') || cl.contains('hide-tail')) {
        return '';
    }

    if (cl.contains('mfrac')) {
        const fracLine = node.querySelector('.frac-line');
        if (fracLine && fracLine.parentElement) {
            const denomSpan = fracLine.parentElement.previousElementSibling;
            const numSpan = fracLine.parentElement.nextElementSibling;
            const num = numSpan ? buildMathML(numSpan, variant) : '';
            const den = denomSpan ? buildMathML(denomSpan, variant) : '';
            return `<mfrac><mrow>${num}</mrow><mrow>${den}</mrow></mfrac>`;
        }
    }
    
    if (cl.contains('vlist')) {
        const under = node.querySelector('.munder');
        const over = node.querySelector('.mover');
        
        if ((under && under.querySelector('.svg-align')) || (over && over.querySelector('.svg-align'))) {
            const isMunder = !!under;
            const braceSpan = isMunder ? under : over;
            const svgAlign = braceSpan.querySelector('.svg-align');
            
            if (svgAlign) {
                const baseNode = svgAlign.nextElementSibling || svgAlign.previousElementSibling;
                let baseMath = baseNode ? buildMathML(baseNode, variant) : '';
                
                let braceMath = isMunder ? `<munder><mrow>${baseMath}</mrow><mo>&#x23DF;</mo></munder>` 
                                         : `<mover><mrow>${baseMath}</mrow><mo>&#x23DE;</mo></mover>`;
                                         
                let labelMath = '';
                Array.from(node.children).forEach(child => {
                    if (!child.contains(braceSpan)) {
                        const txt = child.textContent.trim();
                        if (txt) {
                            // Extract the inner content, bypassing the sizing/mtight wrapper
                            // to get clean MathML for the label
                            const innerContent = child.querySelector('.mord, .mord.mtight') || child;
                            labelMath = buildMathML(innerContent, variant);
                        }
                    }
                });
                
                if (labelMath) {
                    // Use simple mrow for label - mathsize wrapper causes Word rendering issues
                    return isMunder ? `<munder><mrow>${braceMath}</mrow><mrow>${labelMath}</mrow></munder>`
                                    : `<mover><mrow>${braceMath}</mrow><mrow>${labelMath}</mrow></mover>`;
                }
                return braceMath;
            }
        }
    }

    if (cl.contains('munder') && node.querySelector('.svg-align')) {
        const svgAlign = node.querySelector('.svg-align');
        const baseNode = svgAlign.nextElementSibling || svgAlign.previousElementSibling;
        const vlist = node.querySelector('.vlist');
        let labelNode = null;
        if (vlist) {
            Array.from(vlist.children).forEach(child => {
                if (!child.querySelector('.svg-align') && child !== baseNode) {
                    labelNode = child;
                }
            });
        }
        if (baseNode) {
            const baseMath = buildMathML(baseNode, variant);
            let underMath = `<munder><mrow>${baseMath}</mrow><mo>&#x23DF;</mo></munder>`;
            if (labelNode && labelNode.textContent.trim()) {
                const innerLabel = labelNode.querySelector('.mord, .mord.mtight') || labelNode;
                const labelMath = buildMathML(innerLabel, variant);
                return `<munder><mrow>${underMath}</mrow><mrow>${labelMath}</mrow></munder>`;
            }
            return underMath;
        }
    } else if (cl.contains('munder')) {
        // Generic munder (e.g. \underset)
        const vlist = node.querySelector('.vlist');
        if (vlist) {
            const children = Array.from(vlist.children).filter(c => c.textContent.trim() !== '');
            if (children.length >= 2) {
                // In KaTeX, the script usually has a larger positive 'top' value than the base
                let scriptNode = children[0];
                let baseNode = children[1];
                let top0 = parseFloat(scriptNode.style.top) || 0;
                let top1 = parseFloat(baseNode.style.top) || 0;
                if (top0 < top1) {
                    baseNode = children[0];
                    scriptNode = children[1];
                }
                const baseMath = buildMathML(baseNode, variant);
                const scriptMath = buildMathML(scriptNode, variant);
                return `<munder><mrow>${baseMath}</mrow><mrow>${scriptMath}</mrow></munder>`;
            } else if (children.length === 1) {
                return buildMathML(children[0], variant);
            }
        }
    }

    if (cl.contains('mover') && node.querySelector('.svg-align')) {
        const svgAlign = node.querySelector('.svg-align');
        const baseNode = svgAlign.nextElementSibling || svgAlign.previousElementSibling;
        const vlist = node.querySelector('.vlist');
        let labelNode = null;
        if (vlist) {
            Array.from(vlist.children).forEach(child => {
                if (!child.querySelector('.svg-align') && child !== baseNode) {
                    labelNode = child;
                }
            });
        }
        if (baseNode) {
            const baseMath = buildMathML(baseNode, variant);
            let overMath = `<mover><mrow>${baseMath}</mrow><mo>&#x23DE;</mo></mover>`;
            if (labelNode && labelNode.textContent.trim()) {
                const innerLabel = labelNode.querySelector('.mord, .mord.mtight') || labelNode;
                const labelMath = buildMathML(innerLabel, variant);
                return `<mover><mrow>${overMath}</mrow><mrow>${labelMath}</mrow></mover>`;
            }
            return overMath;
        }
    } else if (cl.contains('mover')) {
        // Generic mover (e.g. \overset)
        const vlist = node.querySelector('.vlist');
        if (vlist) {
            const children = Array.from(vlist.children).filter(c => c.textContent.trim() !== '');
            if (children.length >= 2) {
                // In KaTeX, the script usually has a smaller (more negative) 'top' value than the base
                let scriptNode = children[0];
                let baseNode = children[1];
                let top0 = parseFloat(scriptNode.style.top) || 0;
                let top1 = parseFloat(baseNode.style.top) || 0;
                if (top0 > top1) {
                    baseNode = children[0];
                    scriptNode = children[1];
                }
                const baseMath = buildMathML(baseNode, variant);
                const scriptMath = buildMathML(scriptNode, variant);
                return `<mover><mrow>${baseMath}</mrow><mrow>${scriptMath}</mrow></mover>`;
            } else if (children.length === 1) {
                return buildMathML(children[0], variant);
            }
        }
    } else if (cl.contains('mtable')) {
        // Handle matrices, arrays, \substack
        const cols = Array.from(node.querySelectorAll('.col-align-l, .col-align-c, .col-align-r'));
        let maxRows = 0;
        let tableData = [];
        cols.forEach(col => {
            const vlist = col.querySelector('.vlist');
            let cells = [];
            if (vlist) {
                // Find all valid spans with a top style (KaTeX uses top for vertical positioning)
                let validSpans = Array.from(vlist.children).filter(c => c.textContent.trim() !== '' && c.style && c.style.top);
                // Sort by top value ascending (lower top value = higher up visually)
                validSpans.sort((a, b) => (parseFloat(a.style.top) || 0) - (parseFloat(b.style.top) || 0));
                cells = validSpans.map(s => buildMathML(s, variant));
            }
            if (cells.length > maxRows) maxRows = cells.length;
            tableData.push(cells);
        });

        let mtableHTML = `<mtable>`;
        for (let r = 0; r < maxRows; r++) {
            mtableHTML += `<mtr>`;
            for (let c = 0; c < cols.length; c++) {
                let cellMath = tableData[c][r] || '';
                mtableHTML += `<mtd><mrow>${cellMath}</mrow></mtd>`;
            }
            mtableHTML += `</mtr>`;
        }
        mtableHTML += `</mtable>`;
        return mtableHTML;
    }

    let childVariant = variant;
    if (cl.contains('textbf')) childVariant = 'bold';
    else if (cl.contains('textit')) childVariant = 'italic';
    else if (cl.contains('texttt')) childVariant = 'monospace';
    else if (cl.contains('textsf')) childVariant = 'sans-serif';
    
    let inner = '';
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
        let child = children[i];
        let nextChild = children[i+1];
        
        if (nextChild && nextChild.nodeType === Node.ELEMENT_NODE && nextChild.classList.contains('msupsub')) {
            let baseMath = buildMathML(child, childVariant);
            let scriptMath = buildMathML(nextChild, childVariant);
            if (cl.contains('vlist') && inner.trim() !== '' && baseMath.trim() !== '') {
                inner += `<mspace width="0.3em"/>`;
            }
            inner += `<msup><mrow>${baseMath}</mrow><mrow>${scriptMath}</mrow></msup>`;
            i++; // skip the msupsub node
        } else {
            let childMath = buildMathML(child, childVariant);
            if (cl.contains('vlist') && inner.trim() !== '' && childMath.trim() !== '') {
                inner += `<mspace width="0.3em"/>`;
            }
            inner += childMath;
        }
    }

    let result = inner;
    if (cl.contains('sqrt')) {
        result = `<msqrt><mrow>${inner}</mrow></msqrt>`;
    } else if (cl.contains('fbox') || cl.contains('cancel') || cl.contains('sout')) {
        // These are structural spans in KaTeX (usually empty or just borders).
        // We ignore them here to avoid generating empty MathML nodes (which show as dotted boxes in Word).
        // We will wrap their parent vlist instead.
        return '';
    } else if (inner.trim() !== '') {
        if (cl.contains('mbin')) {
            // Binary operators like +, −
            if (mathSpacing) {
                result = `<mspace width="0.222em"/><mrow>${inner}</mrow><mspace width="0.222em"/>`;
            } else {
                result = `<mrow>${inner}</mrow>`;
            }
        } else if (cl.contains('mrel')) {
            // Relation operators like =
            if (mathSpacing) {
                result = `<mspace width="0.278em"/><mrow>${inner}</mrow><mspace width="0.278em"/>`;
            } else {
                result = `<mrow>${inner}</mrow>`;
            }
        } else if (cl.contains('mpunct')) {
            // Punctuation like comma
            if (mathSpacing) {
                result = `<mrow>${inner}</mrow><mspace width="0.167em"/>`;
            } else {
                result = `<mrow>${inner}</mrow>`;
            }
        } else if (cl.contains('mord') || cl.contains('mopen') || cl.contains('mclose') || cl.contains('minner') || cl.contains('base')) {
            // Ordinary terms, brackets: just protect order, no extra space
            result = `<mrow>${inner}</mrow>`;
        }
    }

    // For structural elements (\boxed, \sout, \cancel, \stackrel, limits, etc), KaTeX uses vlist
    if (cl.contains('vlist')) {
        let childMaths = [];
        let hasFboxDirect = false;
        let hasCancelDirect = false;
        let hasSoutDirect = false;

        Array.from(node.children).forEach(child => {
            // Check for structural indicators within this specific vlist item
            if (child.querySelector(':scope > .fbox, :scope > * > .fbox')) hasFboxDirect = true;
            if (child.querySelector(':scope > .cancel, :scope > .cancel-lap, :scope > .cancel-pad, :scope > * > .cancel')) hasCancelDirect = true;
            if (child.querySelector(':scope > .sout, :scope > * > .sout')) hasSoutDirect = true;
            
            let math = buildMathML(child, childVariant);
            if (math && math.trim() !== '') {
                childMaths.push({ math, top: parseFloat(child.style.top) || 0 });
            }
        });

        // If it has multiple valid children, it's a vertical stack (like \stackrel, or \sum limits)
        if (childMaths.length >= 2) {
            childMaths.sort((a, b) => a.top - b.top);
            let mtableHTML = `<mtable>`;
            for (let item of childMaths) {
                mtableHTML += `<mtr><mtd><mrow>${item.math}</mrow></mtd></mtr>`;
            }
            mtableHTML += `</mtable>`;
            return mtableHTML;
        }

        // If it has 1 valid child, it's a wrapper (like \boxed) or just a single line
        result = childMaths.length === 1 ? childMaths[0].math : '';

        if (hasFboxDirect) {
            result = `<menclose notation="box"><mrow>${result}</mrow></menclose>`;
        }
        if (hasCancelDirect) {
            result = `<menclose notation="updiagonalstrike"><mrow>${result}</mrow></menclose>`;
        }
        if (hasSoutDirect) {
            result = `<menclose notation="horizontalstrike"><mrow>${result}</mrow></menclose>`;
        }
    }

    let mathsize = '';
    if (cl.contains('size1')) mathsize = '50%';
    else if (cl.contains('size2')) mathsize = '70%';
    else if (cl.contains('size3')) mathsize = '80%';
    else if (cl.contains('size4')) mathsize = '90%';
    else if (cl.contains('size5')) mathsize = '100%';
    else if (cl.contains('size6')) mathsize = '120%';
    else if (cl.contains('size7')) mathsize = '140%';
    else if (cl.contains('size8')) mathsize = '170%';
    else if (cl.contains('size9')) mathsize = '200%';
    else if (cl.contains('size10')) mathsize = '250%';
    else if (cl.contains('size11')) mathsize = '300%';

    if (mathsize && result.trim() !== '') {
        result = `<mstyle mathsize="${mathsize}">${result}</mstyle>`;
    }

    return result;
}

document.addEventListener('copy', function(event) {
    if (!isEnabled) return;
    const currentDomain = window.location.hostname;
    const isDomainActive = activeDomains.some(d => currentDomain.includes(d));
    if (!isDomainActive) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());

    // Strip citations (they can be span elements or button.citation-marker)
    container.querySelectorAll('span.notebooklm-processed[aria-label], button.citation-marker, mat-icon').forEach(node => {
        node.remove();
    });

    // Compute plain text using the cleaned container
    // We walk through elements to intercept .katex nodes
    let plainText = '';
    function walk(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            plainText += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList.contains('katex')) {
                let mathText = '';
                const annotationNode = node.querySelector('.katex-mathml annotation');
                if (annotationNode && annotationNode.textContent) {
                    mathText = annotationNode.textContent;
                } else {
                    const htmlNode = node.querySelector('.katex-html');
                    mathText = extractMathText(htmlNode || node).replace(/\s+/g, ' ').trim();
                }
                plainText += ` ${mathText} `;
            } else {
                for (let child of node.childNodes) {
                    walk(child);
                }
            }
        }
    }
    for (let child of container.childNodes) {
        walk(child);
    }

    function isPureTextMath(node) {
        if (!node) return false;
        // If it contains complex math structures, it's not pure text
        const mathSelectors = ['.mfrac', '.msqrt', '.msupsub', '.mop', '.mbin', '.mrel', '.svg-align', '.mover', '.munder'];
        for (let sel of mathSelectors) {
            const elements = Array.from(node.querySelectorAll(sel));
            for (let el of elements) {
                // svg-align inside a cancel/sout structure is just the strike line drawing — not real math
                if (sel === '.svg-align') {
                    const isStrikeElement = el.closest('.cancel, .cancel-lap, .cancel-pad, .sout');
                    if (isStrikeElement) continue;
                }
                return false;
            }
        }
        return true;
    }

    function buildPureHTML(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const cl = node.classList;
        // Skip purely visual/layout KaTeX elements
        if (cl.contains('mspace') || cl.contains('strut') || cl.contains('pstrut') || cl.contains('vlist-s') || cl.contains('hide-tail')) {
            return '';
        }
        // Skip the SVG line-drawing element inside cancel/sout — it's just a visual diagonal/horizontal line
        if (cl.contains('svg-align') && node.closest('.cancel, .cancel-lap, .cancel-pad, .sout')) {
            return '';
        }

        let inner = '';
        const children = node.childNodes;
        for (let i = 0; i < children.length; i++) {
            inner += buildPureHTML(children[i]);
        }

        let isStrike = false;
        let isFbox = false;
        let style = '';

        if (cl.contains('textbf')) style += 'font-weight: bold; ';
        if (cl.contains('textit')) style += 'font-style: italic; ';
        
        if (cl.contains('vlist')) {
            // \boxed{} — wrap with a visible border
            if (Array.from(node.querySelectorAll('.fbox')).length > 0) {
                isFbox = true;
            }
            // \cancel{} or \sout{} — strikethrough
            const hasCancelOrSout =
                Array.from(node.querySelectorAll('.cancel, .cancel-lap, .cancel-pad, .sout')).length > 0;
            if (hasCancelOrSout) {
                isStrike = true;
            }
        }
        
        let fontSize = '';
        if (cl.contains('size1')) fontSize = '50%';
        else if (cl.contains('size2')) fontSize = '70%';
        else if (cl.contains('size3')) fontSize = '80%';
        else if (cl.contains('size4')) fontSize = '90%';
        else if (cl.contains('size5')) fontSize = '100%';
        else if (cl.contains('size6')) fontSize = '120%';
        else if (cl.contains('size7')) fontSize = '140%';
        else if (cl.contains('size8')) fontSize = '170%';
        else if (cl.contains('size9')) fontSize = '200%';
        else if (cl.contains('size10')) fontSize = '250%';
        else if (cl.contains('size11')) fontSize = '300%';
        
        if (fontSize) style += `font-size: ${fontSize}; `;

        let result = inner;
        if (style && result.trim() !== '') {
            result = `<span style="${style.trim()}">${result}</span>`;
        }
        // Apply <s> tag for strikethrough — more reliable than CSS in Word
        if (isStrike && result.trim() !== '') {
            result = `<s>${result}</s>`;
        }
        // Apply border box — use inline style on a span
        if (isFbox && result.trim() !== '') {
            result = `<span style="border: 1px solid windowtext; padding: 1px 3px;">${result}</span>`;
        }
        return result;
    }

    // Extracts only visible text from KaTeX HTML, skipping layout and decoration-only elements
    function extractVisibleText(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const cl = node.classList;
        // Skip layout-only and visual-decoration-only spans
        if (cl.contains('strut') || cl.contains('pstrut') || cl.contains('vlist-s') ||
            cl.contains('mspace') || cl.contains('hide-tail') ||
            cl.contains('svg-align') || cl.contains('sout') || cl.contains('fbox')) {
            return '';
        }
        let text = '';
        for (const child of node.childNodes) text += extractVisibleText(child);
        return text;
    }

    // Compute text/html with MathML
    container.querySelectorAll('.katex').forEach(node => {
        let isBold = false;
        let isItalic = false;
        let curr = node;
        
        while (curr && curr !== container) {
            if (curr.nodeName === 'B' || curr.nodeName === 'STRONG' || 
                (curr.style && (curr.style.fontWeight === 'bold' || parseInt(curr.style.fontWeight, 10) >= 600))) {
                isBold = true;
            }
            if (curr.nodeName === 'I' || curr.nodeName === 'EM' || 
                (curr.style && curr.style.fontStyle === 'italic')) {
                isItalic = true;
            }
            curr = curr.parentNode;
        }

        // Find the top-level inline wrapper (e.g., spans) to check siblings
        let topInline = node;
        while (topInline.parentNode && topInline.parentNode !== container) {
            if (topInline.parentNode.nodeName === 'SPAN') {
                topInline = topInline.parentNode;
            } else {
                break;
            }
        }

        // Check siblings if not found in ancestors
        if (!isBold) {
            let prev = topInline.previousElementSibling;
            let next = topInline.nextElementSibling;
            if ((prev && (prev.nodeName === 'B' || prev.nodeName === 'STRONG')) || 
                (next && (next.nodeName === 'B' || next.nodeName === 'STRONG'))) {
                isBold = true;
            }
        }
        if (!isItalic) {
            let prev = topInline.previousElementSibling;
            let next = topInline.nextElementSibling;
            if ((prev && (prev.nodeName === 'I' || prev.nodeName === 'EM')) || 
                (next && (next.nodeName === 'I' || next.nodeName === 'EM'))) {
                isItalic = true;
            }
        }

        let mathvariant = '';
        if (isBold && isItalic) {
            mathvariant = 'bold-italic';
        } else if (isBold) {
            mathvariant = 'bold';
        } else if (isItalic) {
            mathvariant = 'italic';
        }

        let mathMLStr = '';
        const mathMLNode = node.querySelector('.katex-mathml math');
        
        let dataMathNode = node.closest('[data-math]');
        let rootColor = null;
        if (dataMathNode) {
            const mathStr = dataMathNode.getAttribute('data-math');
            const colorMatch = mathStr.match(/\\color{([^}]+)}/);
            if (colorMatch) rootColor = colorMatch[1];
        }
        
        const htmlNode = node.querySelector('.katex-html');
        const isPureText = isPureTextMath(htmlNode || node);

        // ── EARLY HANDLING: Decorative commands ──
        // CRITICAL: HTML <s> tags and CSS border on <span> are unreliable when Word
        // converts clipboard HTML to OOXML. We use buildMathML to generate
        // MathML <menclose> tags which Word's equation engine renders correctly.
        let forceCustomMathML = false;
        if (dataMathNode) {
            const rawMathStr = dataMathNode.getAttribute('data-math');
            if (rawMathStr && (
                rawMathStr.includes('\\sout{') || 
                rawMathStr.includes('\\cancel{') || 
                rawMathStr.includes('\\xcancel{') || 
                rawMathStr.includes('\\bcancel{') || 
                rawMathStr.includes('\\boxed{') || 
                rawMathStr.includes('\\fbox{') ||
                rawMathStr.includes('\\underbrace{') ||
                rawMathStr.includes('\\overbrace{')
            )) {
                forceCustomMathML = true;
            }
        }

        if (forceCustomMathML) {
            let innerMath = buildMathML(htmlNode || node, mathvariant);
            if (mathvariant) {
                innerMath = `<mstyle mathvariant="${mathvariant}"><mrow>${innerMath}</mrow></mstyle>`;
            } else {
                innerMath = `<mrow>${innerMath}</mrow>`;
            }
            if (rootColor) {
                innerMath = `<mstyle mathcolor="${rootColor}">${innerMath}</mstyle>`;
            }
            mathMLStr = `<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline">${innerMath}</math>`;

            const wrapper = document.createElement('span');
            wrapper.innerHTML = `&nbsp;${mathMLStr}&nbsp;`;
            node.parentNode.replaceChild(wrapper, node);
            return; // Skip normal processing for this .katex element
        }
        // ── END EARLY HANDLING ──

        if (isPureText) {
            let innerHTMLStr = buildPureHTML(htmlNode || node);
            let rootStyle = '';
            if (rootColor) rootStyle += `color: ${rootColor}; `;
            if (mathvariant === 'bold' || mathvariant === 'bold-italic') rootStyle += 'font-weight: bold; ';
            if (mathvariant === 'italic' || mathvariant === 'bold-italic') rootStyle += 'font-style: italic; ';
            
            if (rootStyle) {
                mathMLStr = `<span style="${rootStyle.trim()}">${innerHTMLStr}</span>`;
            } else {
                mathMLStr = innerHTMLStr;
            }
        } else if (mathMLNode) {
            let innerMath = mathMLNode.innerHTML;
            if (mathvariant) {
                innerMath = `<mstyle mathvariant="${mathvariant}">${innerMath}</mstyle>`;
            }
            if (rootColor) {
                innerMath = `<mstyle mathcolor="${rootColor}">${innerMath}</mstyle>`;
            }
            mathMLStr = `<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline">${innerMath}</math>`;
        } else {
            let innerMath = buildMathML(htmlNode || node, mathvariant);
            if (mathvariant) {
                innerMath = `<mstyle mathvariant="${mathvariant}"><mrow>${innerMath}</mrow></mstyle>`;
            } else {
                innerMath = `<mrow>${innerMath}</mrow>`;
            }
            if (rootColor) {
                innerMath = `<mstyle mathcolor="${rootColor}">${innerMath}</mstyle>`;
            }
            mathMLStr = `<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline">${innerMath}</math>`;
        }
        const wrapper = document.createElement('span');
        // Add non-breaking spaces around MathML. MS Word trims regular spaces 
        // at the boundaries of MathML blocks, causing words to merge.
        wrapper.innerHTML = `&nbsp;${mathMLStr}&nbsp;`;
        node.parentNode.replaceChild(wrapper, node);
    });

    // Convert multiple consecutive spaces to non-breaking spaces
    // so MS Word preserves the distinct visual gaps.
    function preserveWhitespace(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.nodeValue) {
                node.nodeValue = node.nodeValue.replace(/ {2,}/g, match => '\u00A0'.repeat(match.length));
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (let child of node.childNodes) {
                preserveWhitespace(child);
            }
        }
    }
    preserveWhitespace(container);

    const htmlContent = container.innerHTML;

    event.preventDefault();
    event.stopImmediatePropagation();

    event.clipboardData.setData('text/html', htmlContent);
    event.clipboardData.setData('text/plain', plainText);
}, true);
