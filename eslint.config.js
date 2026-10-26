// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Arquitectura hexagonal: el núcleo no depende de frameworks, adaptadores ni UI.
    files: ['src/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/infrastructure/*', '@/ui/*', '@/config/*', '@/app/*'],
              message: 'El núcleo (core) no puede depender de adaptadores, UI ni configuración.',
            },
            {
              group: ['react', 'react-native', 'expo*', '@supabase/*'],
              message: 'El núcleo (core) debe ser TypeScript puro, sin frameworks.',
            },
          ],
        },
      ],
    },
  },
  {
    // La UI habla con el núcleo a través de casos de uso y del contenedor, nunca con adaptadores directamente.
    files: ['src/ui/**', 'src/app/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/infrastructure/*'],
              message: 'Usa los casos de uso de @/core/application y el contenedor de @/config.',
            },
          ],
        },
      ],
    },
  },
]);
