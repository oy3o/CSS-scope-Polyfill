import ScopePolyfill from './index.js';

// 1. 显式挂载 (手动接管全局变量，绕过构建工具的自动包装)
if (typeof window !== 'undefined') {
    window.CSSScopePolyfill = ScopePolyfill;
}

// 2. 自动启动逻辑 (移到这里，代码更可读)
// 检测 data-manual 属性，如果没有则自动运行
if (
    typeof document !== 'undefined' &&
    document.currentScript &&
    !document.currentScript.hasAttribute('data-manual')
) {
    ScopePolyfill();
}