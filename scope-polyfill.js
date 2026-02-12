/**
 * CSS @scope Polyfill
 * 
 * A lightweight runtime polyfill for the CSS @scope at-rule.
 * Supports nesting and recursive rule processing.
 * 
 * @author oy3o & Moonlight
 * @version 1.0.0
 */
(async function ScopePolyfill() {
    const TAG = '[@scope]';

    // 1. Feature Detection
    // If the browser natively supports it, we yield immediately.
    try {
        if (typeof CSSScopeRule !== "undefined") {
            console.log(`${TAG} Native support detected. Hibernating.`);
            return;
        }
    } catch (e) {
        // Fallback for browsers that throw on unknown selectors
    }

    console.log(`${TAG} Activating polyfill...`);

    /**
     * Main execution loop: Fetches and transforms CSS resources.
     */
    async function init() {
        // Filter relevant stylesheets (.css files)
        const resources = performance.getEntriesByType('resource').filter(r => r.name.endsWith('.css'));

        for (const resource of resources) {
            try {
                const response = await fetch(resource.name);
                if (!response.ok) continue;

                const cssText = await response.text();

                // Fast fail: skip if no @scope is present
                if (!cssText.includes('@scope')) continue;

                const transformedCss = parseAndTransform(cssText);
                if (transformedCss) {
                    injectStyles(transformedCss, resource.name);
                    console.log(`${TAG} Processed ${resource.name}`);
                }
            } catch (e) {
                console.warn(`${TAG} Failed to process ${resource.name}`, e);
            }
        }
    }

    /**
     * Extracts @scope blocks and transforms them into scoped selectors.
     * @param {string} cssText - The CSS text to process.
     * @returns {string|null} The transformed CSS text, or null if no @scope is found.
     */
    function parseAndTransform(cssText) {
        // Remove comments to prevent false positives
        const cleanCss = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

        // Regex to find the opening of @scope (e.g., "@scope (.card) {")
        // Note: This matches the "root" scope. Complex "to" syntax is not fully supported in this MVP.
        const scopeHeadRegex = /@scope\s*\(([^)]+)\)\s*{/g;

        let match;
        const extractedRules = [];

        while ((match = scopeHeadRegex.exec(cleanCss)) !== null) {
            const scopeRootSelector = match[1].trim();
            const bodyStart = match.index + match[0].length;
            const bodyEnd = findClosingBrace(cleanCss, bodyStart - 1);

            if (bodyEnd !== -1) {
                const innerContent = cleanCss.substring(bodyStart, bodyEnd);
                // Recursively process the rules inside the scope
                const transformedBlock = processBlock(innerContent, scopeRootSelector);
                extractedRules.push(transformedBlock);
            }
        }

        return extractedRules.length > 0 ? extractedRules.join('\n') : null;
    }

    /**
     * Recursively processes CSS blocks to handle nesting (like @media inside @scope).
     * @param {string} cssText - The CSS text to process.
     * @param {string} rootSelector - The root selector for the scope.
     * @returns {string} The processed CSS text.
     */
    function processBlock(cssText, rootSelector) {
        let result = '';
        let cursor = 0;

        while (cursor < cssText.length) {
            const openBrace = cssText.indexOf('{', cursor);
            if (openBrace === -1) break;

            // 1. Get Header (Selector or At-Rule)
            const headerRaw = cssText.substring(cursor, openBrace).trim();

            // 2. Find matching closing brace
            const closeBrace = findClosingBrace(cssText, openBrace);
            if (closeBrace === -1) {
                console.warn(`${TAG} Unbalanced brace detected.`);
                break;
            }

            // 3. Extract Body
            const blockBody = cssText.substring(openBrace + 1, closeBrace);

            // 4. Transform Logic
            if (headerRaw.startsWith('@')) {
                const isDefinitionRule = /^@(keyframes|font-face)/i.test(headerRaw);
                if (isDefinitionRule) {
                    // Case A: Definition Rules (@keyframes, @font-face)
                    result += `${headerRaw} {${blockBody}}\n`;
                } else {
                    // Case B: Grouping Rules (@media, @supports, @layer, @container)
                    const processedBody = processBlock(blockBody, rootSelector);
                    result += `${headerRaw} {\n${processedBody}\n}\n`;
                }
            } else {
                // Case C: Standard Selectors
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
     * Rewrites a selector string to simulate scoping.
     * Handles: :scope, & (nesting), and descendant combinators.
     * @param {string} selectorLine - The selector line to rewrite.
     * @param {string} rootSelector - The root selector for the scope.
     * @returns {string} The rewritten selector line.
     */
    function rewriteSelector(selectorLine, rootSelector) {
        if (!selectorLine.trim()) return '';

        return selectorLine.split(',').map(part => {
            const s = part.trim();

            // 1. Explicit :scope pseudo-class
            if (s.includes(':scope') || s.includes(': scope')) {
                return s.replace(/:\s*scope/g, rootSelector);
            }

            // 2. Nesting selector &
            if (s.includes('&')) {
                return s.replace(/&/g, rootSelector);
            }

            // 3. Implicit descendant
            return `${rootSelector} ${s}`;
        }).join(', ');
    }

    /**
     * Helper: Finds the matching closing brace index relying on depth counting.
     * @param {string} text - The text to search.
     * @param {number} openBraceIndex - The index of the opening brace.
     * @returns {number} The index of the matching closing brace, or -1 if not found.
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
     * Injects the transformed CSS as a blob URL.
     * @param {string} cssText - The CSS text to inject.
     * @param {string} source - The source of the CSS text.
     */
    function injectStyles(cssText, source) {
        const blob = new Blob([cssText], { type: 'text/css' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.setAttribute('data-polyfill-source', source);
        document.head.appendChild(link);
    }

    // Ignite
    await init();
})()

