import React from 'react';
import { Toaster } from 'sonner';
import VolumeControl from '@/components/ui/VolumeControl';

// アプリ全体の枠。スクロールするのは main の中だけ
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="w-screen h-dvh flex flex-col overflow-hidden">
      {/* 外側をぼんやり暗く */}
      <div className="bg-gradient"></div>

      <main className="flex-1 overflow-auto">{children}</main>

      <Toaster richColors position="bottom-right" expand />
      <VolumeControl />
    </div>
  );
};

export default Layout;
