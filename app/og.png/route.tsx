import { ImageResponse } from 'next/og';

// Rendered once at build time and exported as the static file /og.png.
export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#121316',
          color: '#ecebe6',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 20,
              background: '#2f4bd8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="56" height="56" viewBox="0 0 64 64">
              <path
                d="M14 34l12 12 24-28"
                fill="none"
                stroke="#fff"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ fontSize: 40, color: '#a6a59e' }}>exam.chickyon.com</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 104, fontWeight: 700, lineHeight: 1 }}>CE Exam Prep</div>
          <div style={{ fontSize: 44, color: '#93a5ff' }}>OS · OODS · IST · Web App Dev</div>
          <div style={{ fontSize: 34, color: '#a6a59e' }}>
            Interactive simulations + 3 mock exams per subject
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
