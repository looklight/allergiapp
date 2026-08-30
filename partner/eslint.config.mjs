import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  // next-env.d.ts è generato da Next a ogni build: non è codice nostro
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // Ovunque si mostrino le foto dei piatti: sono immagini che il partner ha
    // appena caricato, ridimensionate nel browser e tenute come data-URL.
    // next/image non le ottimizzerebbe comunque, e nell'anteprima imporrebbe
    // dimensioni fisse a una replica che deve somigliare all'app.
    files: [
      'src/components/preview/**',
      'src/components/dishes/**',
      'src/app/vetrina/**',
    ],
    rules: { '@next/next/no-img-element': 'off' },
  },
];

export default eslintConfig;
