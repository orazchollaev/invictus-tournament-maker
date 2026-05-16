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
      "unused-imports": unusedImports, // ✅ FIXED
    },

    rules: {
      "no-undef": "off",

      // Vue
      "vue/multi-word-component-names": "off",
      "vue/no-multiple-template-root": "off",
      "vue/require-default-prop": "off",
      "vue/no-v-html": "warn",

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
    },
  }
)
