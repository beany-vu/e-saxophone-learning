// A page marked 'use client' cannot export metadata, so each route carries a
// server layout of its own that does nothing but name the page.
import type { Metadata } from 'next'
import { privatePageMetadata } from '@/lib/seo'

export const metadata: Metadata = privatePageMetadata('Log in')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
