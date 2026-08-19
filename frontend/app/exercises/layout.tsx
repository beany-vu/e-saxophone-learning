// A page marked 'use client' cannot export metadata, so each route carries a
// server layout of its own that does nothing but name the page.
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata('/exercises')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
