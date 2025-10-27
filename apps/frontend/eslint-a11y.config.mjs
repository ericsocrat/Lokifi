// Accessibility-focused ESLint configuration
// Use this with: npx eslint --config eslint-a11y.config.mjs

import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      'jsx-a11y/alt-text': 'error',
    },
  },
];
