/** @type {import('next').NextConfig} */
const nextConfig = {
  // Anything the browser requests at /api/* is proxied server-side to the Go
  // API over the compose network. The browser therefore only ever talks to
  // localhost:3000, so the session cookie is same-origin and CORS never applies.
  async rewrites() {
    const api = process.env.API_INTERNAL_URL || 'http://localhost:8080'
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }]
  },
}

export default nextConfig
