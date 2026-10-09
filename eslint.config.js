import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "public/ort", "test-results", "playwright-report", ".cache"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module" },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='todo']",
          message: "No TODO placeholders allowed.",
        },
      ],
    },
  },
);
