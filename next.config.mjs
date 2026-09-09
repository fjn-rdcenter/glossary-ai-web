import { fileURLToPath } from "url"
import path from "path"
import createNextIntlPlugin from 'next-intl/plugin';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const withNextIntl = createNextIntlPlugin(
  './i18n/request.ts' 
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Cho phép máy khác trong LAN truy cập Next.js dev resources / HMR
  allowedDevOrigins: [
    '172.16.1.169',
  ],

  turbopack: {
    root: path.resolve(process.cwd()),
  },
  basePath: "/new",
  webpack(config) {
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg'),
    )

    if (fileLoaderRule) {
      config.module.rules.push(
        // Reapply the existing rule, but only for svg imports ending in ?url
        {
          ...fileLoaderRule,
          test: /\.svg$/i,
          resourceQuery: /url/, // *.svg?url
        },
        // Convert all other *.svg imports to React components
        {
          test: /\.svg$/i,
          issuer: fileLoaderRule.issuer,
          resourceQuery: { not: [...(fileLoaderRule.resourceQuery?.not || []), /url/] }, // exclude if *.svg?url
          use: ['@svgr/webpack'],
        },
      )

      fileLoaderRule.exclude = /\.svg$/i
    }

    return config
  },
  // assetPrefix: "/v2/",
  reactStrictMode: true,
  trailingSlash: true,
  devIndicators: false
}

export default withNextIntl(nextConfig)
