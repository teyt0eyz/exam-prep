'use client';

import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import type { RoomMats } from './Furniture';
import type { RoomBoard } from './types';

// Pin board and calendar on the back wall. Their text is drawn into canvas
// textures with the page's own Thai font; everything shown is real store data.

function fontFamily(): string {
  return getComputedStyle(document.body).fontFamily || 'sans-serif';
}

function makeTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, font: string) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx, fontFamily());
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, rot: number) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  ctx.shadowColor = 'rgba(41,38,74,0.22)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 10);
  ctx.fill();
  ctx.restore();
}

function pin(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(x - 3, y - 3, 4, 0, Math.PI * 2);
  ctx.fill();
}

function boardTexture(b: RoomBoard) {
  return makeTexture(1024, 560, (ctx, font) => {
    ctx.fillStyle = '#e9c9a0';
    ctx.fillRect(0, 0, 1024, 560);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(160,110,60,0.10)' : 'rgba(255,255,255,0.12)';
      ctx.fillRect((i * 97) % 1024, (i * 61) % 560, 3, 3);
    }
    ctx.textBaseline = 'alphabetic';

    // Overall progress card
    card(ctx, 50, 50, 420, 300, '#ffffff', -0.03);
    pin(ctx, 260, 62, '#ff7f9f');
    ctx.fillStyle = '#565374';
    ctx.font = `500 32px ${font}`;
    ctx.fillText('ความคืบหน้ารวม', 92, 130);
    ctx.fillStyle = '#29264a';
    ctx.font = `700 120px ${font}`;
    ctx.fillText(`${b.percent}%`, 88, 265);
    ctx.fillStyle = '#eee8f4';
    ctx.beginPath();
    ctx.roundRect(92, 295, 330, 18, 9);
    ctx.fill();
    if (b.percent > 0) {
      const g = ctx.createLinearGradient(92, 0, 422, 0);
      g.addColorStop(0, '#83d5ff');
      g.addColorStop(1, '#8986ff');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(92, 295, Math.max(18, (330 * b.percent) / 100), 18, 9);
      ctx.fill();
    }

    // Lessons
    card(ctx, 520, 46, 420, 200, '#fff3a8', 0.025);
    pin(ctx, 730, 58, '#8986ff');
    ctx.fillStyle = '#6b5a1a';
    ctx.font = `500 30px ${font}`;
    ctx.fillText('บทเรียนที่อ่านแล้ว', 560, 120);
    ctx.fillStyle = '#29264a';
    ctx.font = `700 76px ${font}`;
    ctx.fillText(`${b.lessonsRead}`, 560, 210);
    const wlessonsRead = ctx.measureText(`${b.lessonsRead}`).width;
    ctx.font = `500 36px ${font}`;
    ctx.fillStyle = '#565374';
    ctx.fillText(`/ ${b.lessons} บท`, 560 + wlessonsRead + 16, 210);

    // Mocks
    card(ctx, 540, 290, 400, 200, '#d7f6e7', -0.02);
    pin(ctx, 740, 302, '#ffb477');
    ctx.fillStyle = '#11563f';
    ctx.font = `500 30px ${font}`;
    ctx.fillText('Mock ที่ทำจบ', 580, 362);
    ctx.fillStyle = '#29264a';
    ctx.font = `700 76px ${font}`;
    ctx.fillText(`${b.setsDone}`, 580, 452);
    const wsetsDone = ctx.measureText(`${b.setsDone}`).width;
    ctx.font = `500 36px ${font}`;
    ctx.fillStyle = '#565374';
    ctx.fillText(`/ ${b.sets} ชุด`, 580 + wsetsDone + 16, 452);

    // Accuracy across finished mocks, only once there is one
    card(ctx, 80, 380, 330, 150, '#e9e3ff', 0.04);
    pin(ctx, 245, 392, '#93e6c0');
    ctx.fillStyle = '#3d2f8f';
    ctx.font = `500 28px ${font}`;
    ctx.fillText('ตอบถูกเฉลี่ย', 112, 440);
    ctx.fillStyle = '#29264a';
    ctx.font = b.accuracy === null ? `600 30px ${font}` : `700 60px ${font}`;
    ctx.fillText(b.accuracy === null ? 'ยังไม่มี Mock' : `${b.accuracy}%`, 112, 505);
  });
}

function calendarTexture(b: RoomBoard) {
  return makeTexture(400, 480, (ctx, font) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, 400, 480, 24);
    ctx.fill();
    const g = ctx.createLinearGradient(0, 0, 400, 0);
    g.addColorStop(0, '#ff9fb8');
    g.addColorStop(1, '#ffb477');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, 0, 400, 120, [24, 24, 0, 0]);
    ctx.fill();
    ctx.textAlign = 'center';
    const e = b.nextExam;
    ctx.fillStyle = '#29264a';
    ctx.font = `700 40px ${font}`;
    ctx.fillText(e ? `สอบ ${e.code}` : 'ตารางสอบ', 200, 78);
    if (e) {
      ctx.font = `800 170px ${font}`;
      ctx.fillText(String(e.day), 200, 300);
      ctx.font = `500 34px ${font}`;
      ctx.fillStyle = '#565374';
      ctx.fillText(`${e.weekday} ${e.month}`, 200, 355);
      ctx.fillStyle = '#c13a68';
      ctx.font = `700 36px ${font}`;
      ctx.fillText(e.countdown, 200, 425);
    } else {
      ctx.font = `500 34px ${font}`;
      ctx.fillStyle = '#565374';
      ctx.fillText('ไม่มีสอบที่กำลังจะถึง', 200, 280);
    }
    // Rings
    ctx.fillStyle = '#d9d0e2';
    for (const x of [110, 290]) {
      ctx.beginPath();
      ctx.arc(x, 18, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function WallBoards({ board, mats }: { board: RoomBoard; mats: RoomMats }) {
  const boardTex = useMemo(() => boardTexture(board), [board]);
  const calTex = useMemo(() => calendarTexture(board), [board]);
  useEffect(() => () => boardTex.dispose(), [boardTex]);
  useEffect(() => () => calTex.dispose(), [calTex]);

  return (
    <group>
      {/* Pin board with a wooden frame */}
      <group position={[0.05, 2.78, -2.575]}>
        <mesh material={mats.woodDark}>
          <boxGeometry args={[2.06, 1.17, 0.04]} />
        </mesh>
        <mesh position={[0, 0, 0.022]}>
          <planeGeometry args={[1.96, 1.07]} />
          <meshStandardMaterial map={boardTex} roughness={0.95} />
        </mesh>
      </group>
      {/* Calendar */}
      <group position={[1.85, 2.75, -2.585]} rotation={[0, 0, 0.02]}>
        <mesh>
          <planeGeometry args={[0.72, 0.86]} />
          <meshStandardMaterial map={calTex} transparent roughness={0.8} />
        </mesh>
      </group>
      {/* Sticky notes */}
      {(
        [
          [-1.3, 3.05, 0.08, '#ffe58f'],
          [-1.32, 2.55, -0.06, '#93e6c0'],
          [2.65, 2.95, 0.1, '#83d5ff'],
        ] as const
      ).map(([x, y, r, color]) => (
        <mesh key={`${x}${y}`} position={[x, y, -2.588]} rotation={[0, 0, r]}>
          <planeGeometry args={[0.32, 0.32]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
