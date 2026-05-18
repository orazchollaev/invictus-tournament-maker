import tseslint from "typescript-eslint"
import vue from "eslint-plugin-vue"
import vueParser from "vue-eslint-parser"
import unusedImports from "eslint-plugin-unused-imports"
import prettierConfig from "eslint-config-prettier"

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
      "unused-imports": unusedImports,
    },

    rules: {
      "no-undef": "off",

      // Vue
      "vue/multi-word-component-names": "off",
      "vue/no-multiple-template-root": "off",
      "vue/require-default-prop": "off",
      "vue/no-v-html": "warn",

      // Prettier ile çakışan Vue kuralları
      "vue/html-closing-bracket-newline": "off",
      "vue/html-closing-bracket-spacing": "off",
      "vue/html-end-tags": "off",
      "vue/html-indent": "off",
      "vue/html-quotes": "off",
      "vue/max-attributes-per-line": "off",
      "vue/multiline-html-element-content-newline": "off",
      "vue/mustache-interpolation-spacing": "off",
      "vue/no-multi-spaces": "off",
      "vue/no-spaces-around-equal-signs-in-attribute": "off",
      "vue/singleline-html-element-content-newline": "off",
      // "special rule" — Prettier'ın davranışıyla uyumlu değer:
      "vue/html-self-closing": [
        "warn",
        {
          html: { void: "always", normal: "never", component: "always" },
          svg: "always",
          math: "always",
        },
      ],

      // unused imports plugin
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
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
      "vue/component-tags-order": [
        "error",
        {
          order: ["script", "template", "style"],
        },
      ],
    },
  },

  prettierConfig // en sona, objenin dışında
)
