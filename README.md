# CSS @scope Polyfill

> **Bring the future of CSS encapsulation to today's browsers.**  
> A lightweight, zero-dependency runtime polyfill for the CSS `@scope` at-rule.

[![npm version](https://img.shields.io/npm/v/@oy3o/css-scope-polyfill?style=flat-square)](https://www.npmjs.com/package/@oy3o/css-scope-polyfill)
[![license](https://img.shields.io/npm/l/@oy3o/css-scope-polyfill?style=flat-square)](LICENSE)
[![size](https://img.shields.io/bundlephobia/minzip/@oy3o/css-scope-polyfill?style=flat-square)](https://bundlephobia.com/package/@oy3o/css-scope-polyfill)

## 🌟 Why this?

The [CSS `@scope` rule](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) is a game-changer for component architecture, allowing you to select elements specifically within a DOM subtree. However, browser support is still catching up.

This polyfill bridges the gap. It observes your DOM, parses your CSS, and applies the scoping logic dynamically—preserving your ability to write modern, clean CSS today.

## ✨ Features

-   **Native Syntax Support**: Writes exactly like native CSS. No custom classes required.
-   **Live DOM Monitoring**: Automatically detects new `<style>` tags or lazy-loaded components via `MutationObserver`.
-   **Intelligent Scoping**:
    -   Supports `:scope` pseudo-class.
    -   Supports `&` nesting selectors.
    -   Handles complex selectors like `:is()`, `:where()`, and `:not()` correctly.
-   **Dual-Mode Architecture**:
    -   **Zero-Config**: Drop it in via CDN, and it just works.
    -   **Framework-Ready**: Pure ESM export with Dependency Injection support for advanced integration.

---

## 📦 Installation

```bash
npm install @oy3o/css-scope-polyfill
```
Or use your favorite package manager (pnpm, yarn).

---

## 🚀 Usage

### 1. The "Drop-in" Mode (CDN)
*Best for static sites or quick prototypes.*

Simply add the script to your `<head>`. It will automatically scan for `@scope` rules and watch for changes.

```html
<!-- Via unpkg -->
<script src="https://unpkg.com/@oy3o/css-scope-polyfill"></script>

<!-- OR via jsdelivr -->
<script src="https://cdn.jsdelivr.net/npm/@oy3o/css-scope-polyfill"></script>
```

#### Manual Control (Optional)
If you want to load the script but prevent it from running automatically (e.g., to configure it later), add the `data-manual` attribute:

```html
<script src="..." data-manual></script>
<script>
  // Start it manually when you are ready
  window.CSSScopePolyfill();
</script>
```

### 2. The "Architect" Mode (ESM / Frameworks)
*Best for React, Vue, Vite, Webpack, or internal frameworks.*

Import the pure logic. It does **not** start automatically, giving you full control over the lifecycle.

```javascript
import ScopePolyfill from '@oy3o/css-scope-polyfill';

// Basic usage: Start with default MutationObserver
ScopePolyfill();
```

#### Advanced: Dependency Injection (BYO Observer)
If your framework already has an event system (like a global EventBus or a virtual DOM patcher), you can inject a custom `watcher` to avoid running a duplicate `MutationObserver`.

```javascript
import ScopePolyfill from '@oy3o/css-scope-polyfill';
import { myGlobalEvents } from './my-framework';

ScopePolyfill({
  // Strategy: Delegate DOM observation to your framework
  watcher: (processCallback) => {
    // 1. Process existing styles
    myGlobalEvents.scanStyles((node) => processCallback(node));

    // 2. Listen for future styles
    myGlobalEvents.on('style-injected', (node) => {
      processCallback(node);
    });
  }
});
```

---

## 🎨 Supported Syntax

### Basic Scoping
```css
/* Input */
@scope (.card) {
    :scope {
        border: 1px solid red; /* Applies to .card itself */
    }
    
    img {
        border-radius: 50%; /* Only applies to img INSIDE .card */
    }
}
```

### Nesting & Pseudo-classes
```css
/* Input */
@scope (.sidebar) {
    .tab {
        background: #ccc;
        
        /* Nesting support */
        &:hover {
            background: #fff;
        }
    }
    
    /* Complex selectors work too */
    :scope > .content :is(h1, h2) {
        color: blue;
    }
}
```

---

## ⚠️ Limitations & Trade-offs (Red Team Analysis)

1.  **CORS (Cross-Origin Resource Sharing)**:
    Since the polyfill must fetch external CSS files to parse them, `<link href="...">` pointing to a different domain must serve correct CORS headers (`Access-Control-Allow-Origin: *`).
2.  **Flash of Unstyled Content (FOUC)**:
    As a runtime polyfill, there is a slight delay between the CSS loading and the polyfill rewriting the rules. For critical path CSS, consider server-side transformation if possible.
3.  **Specific Syntax**:
    Currently supports the "Root Scoping" syntax (`@scope (.root) { ... }`).
    *Support for the "Donut Scoping" (lower boundary `to (...)`) is experimental.*

---

## 📄 License

MIT © [oy3o](https://github.com/oy3o)
