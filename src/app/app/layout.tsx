'use client';
import { AppShell } from '@/components/app/Shell';
import { Alert, Button, LoadingBlock } from '@/components/ui';
import { OrgProvider } from '@/lib/org';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider
      loading={<div className="grid min-h-screen place-items-center bg-[#f6f6f7]"><LoadingBlock label="Loading your workspace" /></div>}
      failed={(msg, retry) => (
        <div className="grid min-h-screen place-items-center p-6"><div className="max-w-md space-y-4"><Alert tone="error">{msg}</Alert><Button onClick={retry}>Try again</Button></div></div>
      )}>
      <AppShell>{children}</AppShell>
    </OrgProvider>
  );
}
