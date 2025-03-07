import type { ReactNode } from 'react';

declare module 'next' {
  export interface LayoutProps {
    children: ReactNode;
  }
} 