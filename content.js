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

function buildMathML(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent;
        if (!t.trim()) return '';
        const safeT = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (/^[0-9.]+$/.test(t)) return `<mn>${safeT}</mn>`;
        if (/^[a-zA-Z]$/.test(t)) return `<mi>${safeT}</mi>`;
        return `<mo>${safeT}</mo>`;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const cl = node.classList;
    if (cl.contains('strut') || cl.contains('pstrut') || cl.contains('frac-line') || cl.contains('mspace') || cl.contains('vlist-s') || cl.contains('hide-tail')) {
        return '';
    }

    if (cl.contains('mfrac')) {
        const fracLine = node.querySelector('.frac-line');
        if (fracLine && fracLine.parentElement) {
            const denomSpan = fracLine.parentElement.previousElementSibling;
            const numSpan = fracLine.parentElement.nextElementSibling;
            const num = numSpan ? buildMathML(numSpan) : '';
            const den = denomSpan ? buildMathML(denomSpan) : '';
            return `<mfrac><mrow>${num}</mrow><mrow>${den}</mrow></mfrac>`;
        }
    }
    
    let inner = '';
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
        let child = children[i];
        let nextChild = children[i+1];
        
        if (nextChild && nextChild.nodeType === Node.ELEMENT_NODE && nextChild.classList.contains('msupsub')) {
            let baseMath = buildMathML(child);
            let scriptMath = buildMathML(nextChild);
            inner += `<msup><mrow>${baseMath}</mrow><mrow>${scriptMath}</mrow></msup>`;
            i++; // skip the msupsub node
        } else {
            inner += buildMathML(child);
        }
    }

    if (cl.contains('sqrt')) {
        return `<msqrt><mrow>${inner}</mrow></msqrt>`;
    }

    return inner;
}

document.addEventListener('copy', function(event) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    // Compute text/plain
    const plainContainer = document.createElement('div');
    plainContainer.appendChild(range.cloneContents());
    plainContainer.querySelectorAll('.katex').forEach(node => {
        let mathText = extractMathText(node).replace(/\s+/g, ' ').trim();
        const span = document.createElement('span');
        span.textContent = ` ${mathText} `;
        node.parentNode.replaceChild(span, node);
    });
    let plainText = plainContainer.textContent;
    if (!plainText.trim()) plainText = selection.toString();

    // Compute text/html with MathML
    const htmlContainer = document.createElement('div');
    htmlContainer.appendChild(range.cloneContents());
    htmlContainer.querySelectorAll('.katex').forEach(node => {
        const mathMLStr = `<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><mrow>${buildMathML(node)}</mrow></math>`;
        const wrapper = document.createElement('span');
        // Add non-breaking spaces around MathML. MS Word trims regular spaces 
        // at the boundaries of MathML blocks, causing words to merge.
        wrapper.innerHTML = `&nbsp;${mathMLStr}&nbsp;`;
        node.parentNode.replaceChild(wrapper, node);
    });
    const htmlContent = htmlContainer.innerHTML;

    event.preventDefault();
    event.stopImmediatePropagation();

    event.clipboardData.setData('text/html', htmlContent);
    event.clipboardData.setData('text/plain', plainText);
}, true);
