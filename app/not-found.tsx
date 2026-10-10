import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { btnPrimary, h1 } from '@/components/ui/styles';

export const metadata: Metadata = { title: 'ไม่พบหน้านี้', robots: { index: false } };

export default function NotFound() {
  return (
    <PageShell>
      <div className="py-16 text-center">
        <p className="font-mono text-5xl font-semibold text-accent">404</p>
        <h1 className={`${h1} mt-4`}>ไม่พบหน้านี้</h1>
        <p className="mt-2 text-muted">ลิงก์อาจผิด หรือหน้านี้ถูกย้ายไปแล้ว</p>
        <Link href="/" className={`${btnPrimary} mt-6`}>
          กลับหน้าหลัก
        </Link>
      </div>
    </PageShell>
  );
}
