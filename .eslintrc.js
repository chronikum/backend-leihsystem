module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es6: true,
    },
    extends: [
        'airbnb-base',
    ],
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2018,
    },
    plugins: [
        '@typescript-eslint',
    ],
    rules: {
        indent: ['error', 4],
        'class-methods-use-this': false,
        'no-underscore-dangle':  ['error', { 'allow': ['_id'] }],
    },
};
