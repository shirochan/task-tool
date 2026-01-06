import nextPlugin from 'eslint-config-next';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'dist/**',
      'public/**',
      'coverage/**',
      'next-env.d.ts',
      '.next/',
    ],
  },
  ...nextPlugin,
];

export default eslintConfig;
