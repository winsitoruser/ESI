// Type declarations for external modules without using augmentation
declare module '@heroicons/react/outline' {
  const content: any;
  export = content;
}

declare module '@heroicons/react/solid' {
  const content: any;
  export = content;
}

// Add support for Next.js layout pattern
import { NextPage } from 'next';
import { ReactElement, ReactNode } from 'react';

declare global {
  export type NextPageWithLayout<P = {}> = NextPage<P> & {
    getLayout?: (page: ReactElement) => ReactNode
  };
}
