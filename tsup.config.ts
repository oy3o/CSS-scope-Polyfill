import { defineConfig } from 'tsup';

export default defineConfig([
    // ---------------------------------------------------------------------------
    // 1. ESM Build (给您的框架、Vite、Webpack 使用)
    //    目标: 纯净、Tree-shaking 友好、保留 export default
    // ---------------------------------------------------------------------------
    {
        entry: ['src/index.js'],
        format: ['esm'],       // 只输出 ESM
        outDir: 'dist',
        clean: true,           // 每次构建前清理 dist
        dts: true,             // 生成 .d.ts 类型定义
        sourcemap: true,
        minify: false,         // ESM 通常不压缩，留给用户的 bundler 去做
        treeshake: true,
        splitting: false,      // 禁用拆包，保证单文件
    },

    // ---------------------------------------------------------------------------
    // 2. IIFE Build (给 CDN、<script> 使用)
    //    目标: 挂载到 window、自动执行、绝对没有 export 关键字
    // ---------------------------------------------------------------------------
    {
        entry: ['src/browser.js'],
        format: ['iife'],
        outDir: 'dist',
        clean: false,
        dts: false,
        minify: true,
        target: 'es2015',
        platform: 'browser',
    }
]);