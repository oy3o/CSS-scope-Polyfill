// src/index.js
function CSSScopePolyfill(events) {
  const TAG = "[@scope]";
  const processedNodes = /* @__PURE__ */ new WeakSet();
  try {
    if (typeof CSSScopeRule !== "undefined") {
      console.log(`${TAG} Native support detected. Hibernating.`);
      return;
    }
  } catch (e) {
  }
  console.log(`${TAG} Activating polyfill (Live Mode)...`);
  async function processNode(node) {
    if (processedNodes.has(node)) return;
    processedNodes.add(node);
    if (node.hasAttribute("data-polyfill-generated")) return;
    let cssText = "";
    let sourceUrl = "inline-style";
    try {
      if (node.tagName === "LINK") {
        const link = (
          /** @type {HTMLLinkElement} */
          node
        );
        if (link.rel !== "stylesheet" || !link.href) return;
        sourceUrl = link.href;
        const response = await fetch(sourceUrl);
        if (!response.ok) return;
        cssText = await response.text();
      } else if (node.tagName === "STYLE") {
        cssText = node.textContent;
      } else {
        return;
      }
      if (!cssText.includes("@scope")) return;
      const transformedCss = parseAndTransform(cssText);
      if (transformedCss) {
        injectStyles(transformedCss, sourceUrl);
        console.log(`${TAG} Processed ${sourceUrl}`);
      }
    } catch (e) {
      console.warn(`${TAG} Failed to process ${sourceUrl}`, e);
    }
  }
  function observeMutations() {
    if (events) {
      events.onMutation((mutations) => {
        var _a;
        for (const node of mutations.added) {
          if (node.nodeType === 1) {
            const el = (
              /** @type {Element} */
              node
            );
            if (isStyleNode(el)) processNode(el);
            else (_a = el.querySelectorAll) == null ? void 0 : _a.call(el, 'link[rel="stylesheet"], style').forEach(processNode);
          }
        }
      });
    } else {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              var _a;
              if (node.nodeType === 1) {
                const el = (
                  /** @type {Element} */
                  node
                );
                if (isStyleNode(el)) processNode(el);
                else (_a = el.querySelectorAll) == null ? void 0 : _a.call(el, 'link[rel="stylesheet"], style').forEach(processNode);
              }
            });
          }
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }
  function isStyleNode(node) {
    return node.tagName === "LINK" && node.rel === "stylesheet" || node.tagName === "STYLE";
  }
  function parseAndTransform(cssText) {
    const cleanCss = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
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
    return extractedRules.length > 0 ? extractedRules.join("\n") : null;
  }
  function processBlock(cssText, rootSelector) {
    let result = "";
    let cursor = 0;
    while (cursor < cssText.length) {
      const openBrace = cssText.indexOf("{", cursor);
      if (openBrace === -1) break;
      const headerRaw = cssText.substring(cursor, openBrace).trim();
      const closeBrace = findClosingBrace(cssText, openBrace);
      if (closeBrace === -1) break;
      const blockBody = cssText.substring(openBrace + 1, closeBrace);
      if (headerRaw.startsWith("@")) {
        const isDefinitionRule = /^@(keyframes|font-face)/i.test(headerRaw);
        if (isDefinitionRule) {
          result += `${headerRaw} {${blockBody}}
`;
        } else {
          const processedBody = processBlock(blockBody, rootSelector);
          result += `${headerRaw} {
${processedBody}
}
`;
        }
      } else {
        const newSelector = rewriteSelector(headerRaw, rootSelector);
        if (newSelector) {
          result += `${newSelector} {${blockBody}}
`;
        }
      }
      cursor = closeBrace + 1;
    }
    return result;
  }
  function rewriteSelector(selectorLine, rootSelector) {
    if (!selectorLine.trim()) return "";
    const parts = splitByCommaBalanced(selectorLine);
    return parts.map((part) => {
      const s = part.trim();
      if (s.includes(":scope")) {
        return s.replace(/:\s*scope/g, rootSelector);
      }
      if (s.includes("&")) {
        return s.replace(/&/g, rootSelector);
      }
      return `${rootSelector} ${s}`;
    }).join(", ");
  }
  function splitByCommaBalanced(text) {
    const parts = [];
    let buffer = "";
    let depth = 0;
    let inString = false;
    let stringChar = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if ((char === '"' || char === "'") && text[i - 1] !== "\\") {
        if (inString && char === stringChar) {
          inString = false;
        } else if (!inString) {
          inString = true;
          stringChar = char;
        }
      }
      if (!inString) {
        if (char === "(") depth++;
        else if (char === ")") depth--;
      }
      if (char === "," && depth === 0 && !inString) {
        parts.push(buffer);
        buffer = "";
      } else {
        buffer += char;
      }
    }
    if (buffer) parts.push(buffer);
    return parts;
  }
  function findClosingBrace(text, openBraceIndex) {
    let depth = 1;
    for (let i = openBraceIndex + 1; i < text.length; i++) {
      const char = text[i];
      if (char === "{") depth++;
      else if (char === "}") depth--;
      if (depth === 0) return i;
    }
    return -1;
  }
  function injectStyles(cssText, source) {
    const blob = new Blob([cssText], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.setAttribute("data-polyfill-generated", "true");
    link.setAttribute("data-source", source);
    document.head.appendChild(link);
  }
  document.querySelectorAll('link[rel="stylesheet"], style').forEach(processNode);
  observeMutations();
}
if (typeof window !== "undefined") {
  window.CSSScopePolyfill = CSSScopePolyfill;
}
var index_default = CSSScopePolyfill;

export { index_default as default };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map