/**
 * Ambient declaration so TypeScript accepts side-effect CSS imports
 * (`import './theme/index.css'`). Vite/Storybook handle the actual CSS at build;
 * this only satisfies `tsc --noEmit` type-checking.
 */
declare module '*.css';
