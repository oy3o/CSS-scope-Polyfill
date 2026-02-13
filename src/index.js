/**
 * CSS @scope Polyfill v1.2.0 (Live-Watch Edition)
 * 
 * A lightweight runtime polyfill for the CSS @scope at-rule.
 * Now features MutationObserver to handle lazy-loaded and dynamic styles.
 * 
 * @author oy3o & Moonlight
 */

/**
 * @typedef {object} EventSystem
 * @property {(callback: (mutations: {added: Set<Element>, removed: Set<Element>}) => void) => void} onMutation
 */

/**
 * @param {EventSystem} [events]
 */
function CSSScopePolyfill(events) {
    const TAG = '[@scope]';
    const processedNodes = new WeakSet(); // Memory-safe deduping

    // 1. Feature Detection
    try {
        if (typeof CSSScopeRule !== "undefined") {
            console.log(`${TAG} Native support detected. Hibernating.`);
            return;
        }
    } catch (e) { }

    console.log(`${TAG} Activating polyfill (Live Mode)...`);

    /**
     * Core Logic: Process a specific DOM node (Link or Style)
     * @param {Element} node
     */
    async function processNode(node) {
        // Circuit Breaker: Skip if already processed
        if (processedNodes.has(node)) return;
        processedNodes.add(node);

        // Guard: Skip our own injected polyfill styles to prevent infinite loops
        if (node.hasAttribute('data-polyfill-generated')) return;

        let cssText = '';
        let sourceUrl = 'inline-style';

        try {
            if (node.tagName === 'LINK') {
                const link = /** @type {HTMLLinkElement} */(node);
                if (link.rel !== 'stylesheet' || !link.href) return;
                // Fetch external CSS
                sourceUrl = link.href;
                const response = await fetch(sourceUrl);
                if (!response.ok) return;
                cssText = await response.text();

            } else if (node.tagName === 'STYLE') {
                // Read inline CSS
                cssText = node.textContent;
            } else {
                return;
            }

            // Fast fail: Optimization
            if (!cssText.includes('@scope')) return;

            const transformedCss = parseAndTransform(cssText);
            if (transformedCss) {
                injectStyles(transformedCss, sourceUrl);
                console.log(`${TAG} Processed ${sourceUrl}`);
            }

        } catch (e) {
            console.warn(`${TAG} Failed to process ${sourceUrl}`, e);
        }
    }

    /**
     * Observer: Watches for new nodes entering the DOM
     */
    function observeMutations() {
        if (events) {
            events.onMutation((mutations) => {
                for (const node of mutations.added) {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        const el = /** @type {Element} */(node);
                        // Handle cases where styles are nested inside a container being added
                        if (isStyleNode(el)) processNode(el);
                        else el.querySelectorAll?.('link[rel="stylesheet"], style').forEach(processNode);
                    }
                }
            });
        } else {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1) { // ELEMENT_NODE
                                const el = /** @type {Element} */(node);
                                // Handle cases where styles are nested inside a container being added
                                if (isStyleNode(el)) processNode(el);
                                else el.querySelectorAll?.('link[rel="stylesheet"], style').forEach(processNode);
                            }
                        });
                    }
                }
            });

            // Watch the entire document body and head
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }
    }

    /**
     * Helper: Identifies if a node is a target for processing
     * @param {Element} node
     * @returns {boolean}
     */
    function isStyleNode(node) {
        // @ts-ignore
        return (node.tagName === 'LINK' && node.rel === 'stylesheet') || node.tagName === 'STYLE';
    }

    /**
     * Parse and transform CSS text
     * @param {string} cssText
     * @returns {string | null}
     */
    function parseAndTransform(cssText) {
        const cleanCss = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
        // Regex adjusted to be slightly more robust
        const scopeHeadRegex = /@scope\s*\(([^)]+)\)\s*{/g;

        let match;
        const extractedRules = [];

        while ((match = scopeHeadRegex.exec(cleanCss)) !== null) {
            const scopeRootSelector = match[1].trim();
            const bodyStart = match.index + match[0].length;
            const bodyEnd = findClosingBrace(cleanCss, bodyStart - 1);

            if (bodyEnd !== -1) {
                const innerContent = cleanCss.substring(bodyStart, bodyEnd);
                const transformedBlock = processBlock(innerContent, scopeRootSelector);
                extractedRules.push(transformedBlock);
            }
        }
        return extractedRules.length > 0 ? extractedRules.join('\n') : null;
    }

    /**
     * Process a block of CSS text
     * @param {string} cssText
     * @param {string} rootSelector
     * @returns {string}
     */
    function processBlock(cssText, rootSelector) {
        let result = '';
        let cursor = 0;

        while (cursor < cssText.length) {
            const openBrace = cssText.indexOf('{', cursor);
            if (openBrace === -1) break;

            const headerRaw = cssText.substring(cursor, openBrace).trim();
            const closeBrace = findClosingBrace(cssText, openBrace);
            if (closeBrace === -1) break;

            const blockBody = cssText.substring(openBrace + 1, closeBrace);

            if (headerRaw.startsWith('@')) {
                const isDefinitionRule = /^@(keyframes|font-face)/i.test(headerRaw);
                if (isDefinitionRule) {
                    result += `${headerRaw} {${blockBody}}\n`;
                } else {
                    const processedBody = processBlock(blockBody, rootSelector);
                    result += `${headerRaw} {\n${processedBody}\n}\n`;
                }
            } else {
                const newSelector = rewriteSelector(headerRaw, rootSelector);
                if (newSelector) {
                    result += `${newSelector} {${blockBody}}\n`;
                }
            }
            cursor = closeBrace + 1;
        }
        return result;
    }

    /**
     * Rewrite a selector to use the root selector
     * @param {string} selectorLine
     * @param {string} rootSelector
     * @returns {string}
     */
    function rewriteSelector(selectorLine, rootSelector) {
        if (!selectorLine.trim()) return '';

        const parts = splitByCommaBalanced(selectorLine);

        return parts.map(part => {
            const s = part.trim();

            // 1. Explicit :scope pseudo-class
            if (s.includes(':scope')) {
                return s.replace(/:\s*scope/g, rootSelector);
            }

            // 2. Nesting selector &
            if (s.includes('&')) {
                return s.replace(/&/g, rootSelector);
            }

            // 3. Implicit descendant (Standard Scoping)
            return `${rootSelector} ${s}`;
        }).join(', ');
    }

    /**
     * Helper: Splits a CSS selector list by comma, ignoring commas inside parentheses.
     * Handles: :is(.a, .b), :not(.a, .b), [attr="a,b"]
     * @param {string} text
     * @returns {string[]}
     */
    function splitByCommaBalanced(text) {
        const parts = [];
        let buffer = '';
        let depth = 0;
        let inString = false;
        let stringChar = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // Handle Strings (to ignore commas inside quotes like [data-val="a,b"])
            if ((char === '"' || char === "'") && text[i - 1] !== '\\') {
                if (inString && char === stringChar) {
                    inString = false;
                } else if (!inString) {
                    inString = true;
                    stringChar = char;
                }
            }

            // Handle Parentheses (only if not in string)
            if (!inString) {
                if (char === '(') depth++;
                else if (char === ')') depth--;
            }

            // Split logic
            if (char === ',' && depth === 0 && !inString) {
                parts.push(buffer);
                buffer = '';
            } else {
                buffer += char;
            }
        }

        if (buffer) parts.push(buffer);
        return parts;
    }

    /**
     * Find the closing brace for a given open brace index
     * @param {string} text
     * @param {number} openBraceIndex
     * @returns {number}
     */
    function findClosingBrace(text, openBraceIndex) {
        let depth = 1;
        for (let i = openBraceIndex + 1; i < text.length; i++) {
            const char = text[i];
            if (char === '{') depth++;
            else if (char === '}') depth--;
            if (depth === 0) return i;
        }
        return -1;
    }

    /**
     * Inject styles into the document
     * @param {string} cssText
     * @param {string} source
     */
    function injectStyles(cssText, source) {
        const blob = new Blob([cssText], { type: 'text/css' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        // Important: Mark this node so the observer ignores it!
        link.setAttribute('data-polyfill-generated', 'true');
        link.setAttribute('data-source', source);
        document.head.appendChild(link);
    }

    // --- [Ignition] ---

    // @ts-ignore 1. Scan currently existing nodes 
    document.querySelectorAll('link[rel="stylesheet"], style').forEach(processNode);

    // 2. Start watching for future nodes
    observeMutations();
}

export default CSSScopePolyfill;
