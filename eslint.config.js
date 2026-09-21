import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Both build outputs are ignored: `dist` ships and `dist-qa` is what a real
    // acceptance run drives, and neither is source.
    ignores: [
      "**/dist/**",
      "**/dist-qa/**",
      "**/coverage/**",
      ".spike-backups/**",
      // Generated evidence and machine-local state, never source. The QA Chrome profile holds
      // Chrome's own bundled extensions, whose shipped source is not this repository's to lint.
      "artifacts/**",
      ".tmp/**"
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, chrome: "readonly" },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-confusing-void-expression": "off",
      // A leading underscore marks a binding that exists to be ignored: a destructured key that
      // is being dropped, a positional argument a signature must carry, a caught error.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true
        }
      ]
    }
  },
  {
    files: ["**/*.mjs", "**/*.js"],
    ...tseslint.configs.disableTypeChecked
  }
);
