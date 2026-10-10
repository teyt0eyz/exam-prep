import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2f4bd8',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 64 64">
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
    ),
    { width: 180, height: 180 },
  );
}
