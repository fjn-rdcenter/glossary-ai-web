import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  basePath: "/v2",
  // assetPrefix: "/v2/",
  reactStrictMode: true,
  trailingSlash: true
}

export default nextConfig
