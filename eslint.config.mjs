import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import next from "@next/eslint-plugin-next";

/**
 * Flat config for ESLint 9 (Next.js 16 removed `next lint`, and eslint-config-next's
 * FlatCompat `extends` trips a circular-structure bug under ESLint 9). TypeScript
 * strict + a clean `next build` are the primary gates; this adds the high-signal
 * React-hooks and Next core-web-vitals rules on top of a light TS pass.
 */
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "supabase/functions/**",
      "next-env.d.ts",
      "*.config.mjs",
      "*.config.ts",
      "scripts/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "@next/next": next },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "react-hooks/exhaustive-deps": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-debugger": "error",
      "prefer-const": "warn",
    },
  },
);
