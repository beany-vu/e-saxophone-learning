/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production builds emit a self-contained server plus only the node_modules
  // it actually reaches, which is what the prod image runs. No effect on `next
  // dev`, so the compose dev stack is untouched.
  output: 'standalone',

  // Anything the browser requests at /api/* is proxied server-side to the Go
  // API over the compose network. The browser therefore only ever talks to
  // the web origin, so the session cookie is same-origin and CORS never applies.
  // Note: `next build` evaluates this and bakes the destination into the
  // output, so API_INTERNAL_URL must be set at build time for a production
  // image (Dockerfile.prod passes it as a build arg). At runtime it is only
  // read by `next dev`.
  async rewrites() {
    const api = process.env.API_INTERNAL_URL || 'http://localhost:8080'
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }]
  },
}

export default nextConfig
