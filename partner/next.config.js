/** @type {import('next').NextConfig} */
const nextConfig = {
  // partner/ è un progetto a sé dentro il repo: senza questo Next "inferisce"
  // la workspace root da lockfile esterni e avvisa a ogni avvio
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
