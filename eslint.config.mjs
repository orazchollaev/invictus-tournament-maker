import tseslint from "typescript-eslint"
import vue from "eslint-plugin-vue"
import vueParser from "vue-eslint-parser"
import unusedImports from "eslint-plugin-unused-imports"
import prettierConfig from "eslint-config-prettier"

// Two levels up or more means the import has left its own neighbourhood -- at that
// distance the path stops describing where the file is and starts breaking whenever
// either end moves. Use the "@/" alias instead.
const deepRelativeImports = [
  {
    group: ["../../*", "../../**"],
    message: 'Use the "@/" alias instead of a deep relative import.',
  },
]

export default tseslint.config(
  { ignores: ["android/**", "dist/**"] },

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

      "vue/multi-word-component-names": "off",
      "vue/no-multiple-template-root": "off",
      "vue/require-default-prop": "off",
      "vue/no-v-html": "warn",

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
      "vue/html-self-closing": [
        "warn",
        {
          html: { void: "always", normal: "never", component: "always" },
          svg: "always",
          math: "always",
        },
      ],
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
      "vue/block-order": [
        "error",
        {
          order: ["script", "template", "style"],
        },
      ],

      "vue/component-name-in-template-casing": ["error", "PascalCase"],
      "vue/define-macros-order": "error",

      // Promote to "error" once the remaining deep relative imports are converted.
      "no-restricted-imports": ["warn", { patterns: deepRelativeImports }],
    },
  },

  // reka-ui belongs to the design system, not to feature code. Three modules each
  // building their own Dialog on raw DialogRoot is how close animations, focus traps
  // and backdrop z-indexes drift apart. Wrap once in components/ui, fix once.
  // Promote to "error" once the remaining bypasses are wrapped.
  {
    files: ["src/**/*.{ts,vue}"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: deepRelativeImports,
          paths: [
            {
              name: "reka-ui",
              message:
                'Compose the wrappers in "@/components/ui" instead. If none fits, extend the wrapper rather than rebuilding the primitive here.',
            },
          ],
        },
      ],
    },
  },

  // A component past 400 lines is almost always doing two jobs. Warning, not a gate.
  {
    files: ["src/**/*.vue"],
    rules: {
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },

  prettierConfig
)
