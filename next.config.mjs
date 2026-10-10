import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Cloudflare Pages: no API routes, middleware or server actions.
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  // Set when the site is served from a sub-path (GitHub Pages project site); empty at a domain root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'mdx'],
  // Pin the workspace root so a stray lockfile in a parent folder is never picked up.
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
};

// Plugin names are strings so Turbopack can load them.
export default createMDX({ options: { remarkPlugins: ['remark-gfm'] } })(nextConfig);
