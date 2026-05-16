import tseslint from "typescript-eslint"
import vue from "eslint-plugin-vue"
import vueParser from "vue-eslint-parser"
import unusedImports from "eslint-plugin-unused-imports"

export default tseslint.config(
  ...vue.configs["flat/recommended"],

  {
    files: ["**/*.{ts,vue}"],

    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },

    plugins: {
      vue,
      "unuserd-imports": unusedImports,
    },

    rules: {
      "no-undef": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/multiline-html-element-content-newline": "off",
      "vue/html-indent": "off",
      "vue/first-attribute-linebreak": "off",

      // Vue
      "vue/multi-word-component-names": "off",
      "vue/no-multiple-template-root": "off",
      "vue/require-default-prop": "off",
      "vue/no-v-html": "warn",

      // prettier ile çakışabilir
      "vue/html-self-closing": "off",
      "vue/padding-line-between-blocks": "off",

      // TS
      "@typescript-eslint/consistent-type-imports": "off",

      // General
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",

      // normal unused disable
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",

      // auto fix yapan rule
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  }
)
