import React, { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

export const AppLayout = ({ children, headerExtra }: { children: ReactNode; headerExtra?: ReactNode }) => (
  <div className="min-h-screen bg-paper-50 flex flex-col">
    <Header subNav={headerExtra} />
    <main id="main-content" className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 flex-1">
      {children}
    </main>
    <Footer variant="slim" />
  </div>
);
