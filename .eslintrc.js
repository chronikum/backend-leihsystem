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
        'class-methods-use-this': 0,
        'no-underscore-dangle': ['error', { allow: ['_id'] }],
        'no-console': 0,
        'no-unresolved': 0,
        'import/prefer-default-export': 0,
        'max-len': ['error', { code: 180 }],
        'no-param-reassign': 0,
    },
};
