import './globals.css'
import { DM_Sans } from 'next/font/google'
import { metadata } from './metadata'
import { RootProviders } from './_providers/root-providers'
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "./api/uploadthing/core";
import { ReactNode } from 'react';

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
})

export { metadata }

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es" className={dmSans.variable}>
      <body className={`${dmSans.className} antialiased`}>
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  )
}
