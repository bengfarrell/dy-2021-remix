/**
 * We're using Object.assign(...) to extend with plugin configs
 * eslint does not allow extends in overrides yet
 * support has been added, but it wont be available until eslint 6.0
 * https://github.com/eslint/eslint/pull/11554
 */

module.exports = {
    root: true,
    plugins: ['prettier', 'import'],
    extends: ['eslint-config-airbnb-base', 'prettier'],
    rules: {
        'no-plusplus': 'off',
        'no-underscore-dangle': 'off',
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        'import/extensions': 'off',
        'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
        'func-names': 'off',
        'no-case-declarations': 'off',
        'prefer-destructuring': 'off', // kind of annoying when working with gl-matrix
        'class-methods-use-this': [
            'warn', // @TODO: update this to error in the future
            {
                exceptMethods: [
                    'render', // for lit-html render
                ],
            },
        ],
        'import/no-cycle': 'off',
        'guard-for-in': 'off',
        'no-continue': 'off',
        'import/no-duplicates': 'warn',
        'no-param-reassign': ['error', { props: false }],
        eqeqeq: ['error', 'smart'],
        'no-bitwise': 'off',
        'no-loop-func': 'off',
        'prefer-const': ['error', { destructuring: 'all' }],
        'import/prefer-default-export': 'off',
        'no-return-assign': ['error', 'except-parens'],
    },
    "env": {
        "browser": true
    },
};
