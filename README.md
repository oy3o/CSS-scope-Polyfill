# CSS `@scope` Polyfill

> **Experimental Runtime Polyfill**  
> Bringing encapsulated styles to browsers that don't yet speak the language of modern CSS.

This lightweight script detects generic `@scope` rules in your external stylesheets and transforms them into scoped selectors at runtime. It essentially "flattens" the scoping logic into standard CSS descendant selectors.

## Features

- **Zero Config**: Just include the script. It auto-detects support.
- **Native Fallback**: If the browser supports `@scope` natively, this script does nothing.
- **Recursive Parsing**: Correctly handles nested At-Rules (like `@media` or `@supports`) inside a `@scope` block.
- **Pseudo-class Support**:
  - Replaces `:scope` with the root selector.
  - Replaces `&` with the root selector.
  - Handles implicit descendant selectors.

## Usage

Simply add the script to your HTML document **after** your stylesheets.

```html
<!-- Your CSS -->
<link rel="stylesheet" href="styles.css">

<!-- The Polyfill -->
<script src="path/to/scope-polyfill.js"></script>
```

### Example

**Input CSS (`styles.css`):**
```css
@scope (.card) {
  /* Implicit descendant */
  img { 
    border-radius: 50%; 
  }

  /* Explicit scope usage */
  :scope {
    background: #fff;
  }
  
  /* Nested Rule Support */
  @media (max-width: 500px) {
    h2 { font-size: 1rem; }
  }
}
```

**Transformed Output (Injected at runtime):**
```css
.card img { 
  border-radius: 50%; 
}
.card {
  background: #fff;
}
@media (max-width: 500px) {
  .card h2 { font-size: 1rem; }
}
```

## Limitations & Caveats

1.  **CORS**: Since this script uses `fetch()` to read your CSS files, your stylesheets must be served with appropriate CORS headers if they are on a different domain (CDN).
2.  **Performance**: This is a runtime transformation. For large production apps, it is **strongly recommended** to use a build-time tool (like PostCSS) instead of this polyfill.
3.  **Syntax Support**: 
    - Currently supports `@scope (root)`.
    - Does **not** yet fully support the "donut scope" syntax: `@scope (root) to (limit)`.

## Architecture

- **Recursive Descent**: Uses a depth-counter mechanism to parse nested `{}` blocks, ensuring rules inside `@media` queries within a scope are preserved and transformed correctly.
- **Isolation**: Injected styles use `Blob` URLs to avoid modifying the DOM's original `<link>` tags directly, keeping the source clean.

---
*Maintained by oy3o & Moonlight.*

