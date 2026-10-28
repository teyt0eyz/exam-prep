'use client';

import { Html, RoundedBox } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, Euler, MathUtils, Quaternion, Vector3, type Group } from 'three';
import { BOOK_STYLE } from '@/lib/subject-style';
import { coverTexture } from './textures';
import type { RoomBook } from './types';

// Book size (metres-ish). It lies flat: cover on +y, spine along the -x edge.
export const BOOK_W = 0.52;
export const BOOK_D = 0.7;
const T = 0.11;
const COVER = 0.014;
const LEAVES = 3;

/** Where a book sits on the desk, and the pose it takes when opened in front of the camera. */
export interface BookPoses {
  rest: { position: [number, number, number]; rotY: number };
  present: { position: [number, number, number]; rotX: number };
}

interface Props {
  book: RoomBook;
  poses: BookPoses;
  hovered: boolean;
  /** Floating label with the real percentage and status. */
  showLabel: boolean;
  selected: boolean;
  /** Opening: present it and swing the cover open. */
  open: boolean;
  /** Start already opened (coming back from this subject) and close on the desk. */
  startOpen: boolean;
  instant: boolean;
  castShadow: boolean;
  onHover(id: string | null): void;
  onPick(id: string): void;
  onOpened(id: string): void;
  /** Called every frame something still moves, so the demand loop keeps going. */
  invalidate(): void;
}

const STATUS = { new: 'ยังไม่เริ่ม', progress: 'กำลังอ่าน', done: 'ครบแล้ว' } as const;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smooth = (a: number, b: number, t: number) => {
  const x = MathUtils.clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

export function SubjectBook(props: Props) {
  const { book, poses, hovered, selected, open, startOpen, instant, castShadow } = props;
  const style = BOOK_STYLE[book.accent];
  const root = useRef<Group>(null);
  const cover = useRef<Group>(null);
  const leaves = useRef<(Group | null)[]>([]);
  // p: 0 on the desk -> 1 presented. c: cover 0 closed -> 1 open. lift: hover/selection height.
  const anim = useRef({ p: startOpen ? 1 : 0, c: startOpen ? 1 : 0, lift: 0, tilt: 0, notified: false });

  const texture = useMemo(() => coverTexture(style, book.code, book.short), [style, book.code, book.short]);
  useEffect(() => () => texture.dispose(), [texture]);
  const edge = useMemo(() => new Color(style.to).multiplyScalar(0.82).getStyle(), [style.to]);

  useEffect(() => {
    if (!open) anim.current.notified = false;
  }, [open]);

  const tmp = useMemo(
    () => ({
      restQ: new Quaternion(),
      presentQ: new Quaternion(),
      e: new Euler(),
      restP: new Vector3(),
      presentP: new Vector3(),
    }),
    [],
  );

  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    const a = anim.current;
    const k = instant ? 1e3 : 1;

    // Opening runs present -> cover; closing runs cover -> desk, so the book never
    // flies around with its cover flapping.
    const pTarget = open ? 1 : a.c > 0.25 ? 1 : 0;
    const cTarget = open ? (a.p > 0.72 ? 1 : 0) : 0;
    a.p = MathUtils.damp(a.p, pTarget, 4.2 * k, dt);
    a.c = MathUtils.damp(a.c, cTarget, 4.6 * k, dt);
    const liftTarget = selected ? 0.2 : hovered ? 0.07 : 0;
    a.lift = MathUtils.damp(a.lift, liftTarget, 9 * k, dt);

    const { rest, present } = poses;
    tmp.restP.set(rest.position[0], rest.position[1] + a.lift, rest.position[2]);
    tmp.presentP.set(...present.position);
    // Selected books tip their cover toward the camera so the code reads clearly.
    const tiltTarget = selected ? 0.32 : hovered ? 0.08 : 0;
    a.tilt = MathUtils.damp(a.tilt, tiltTarget, 9 * k, dt);
    tmp.restQ.setFromEuler(tmp.e.set(a.tilt, rest.rotY, 0));
    tmp.presentQ.setFromEuler(tmp.e.set(present.rotX, 0, 0));
    const pe = ease(MathUtils.clamp(a.p, 0, 1));
    g.position.lerpVectors(tmp.restP, tmp.presentP, pe);
    // A little arc on the way up so it reads as being picked up, not sliding.
    g.position.y += Math.sin(pe * Math.PI) * 0.18;
    g.quaternion.slerpQuaternions(tmp.restQ, tmp.presentQ, pe);

    const angle = ease(MathUtils.clamp(a.c, 0, 1)) * Math.PI * 0.97;
    if (cover.current) cover.current.rotation.z = angle;
    leaves.current.forEach((leaf, i) => {
      if (!leaf) return;
      // Leaves follow the cover with a stagger and settle at a fan.
      const share = smooth(0.25 + i * 0.14, 1, a.c);
      leaf.rotation.z = share * Math.PI * (0.9 - i * 0.16);
    });

    if (open && a.c > 0.96 && !a.notified) {
      a.notified = true;
      props.onOpened(book.id);
    }
    const moving =
      Math.abs(a.p - pTarget) > 0.002 || Math.abs(a.c - cTarget) > 0.002 ||
      Math.abs(a.lift - liftTarget) > 0.001 ||
      Math.abs(a.tilt - tiltTarget) > 0.001;
    if (moving) props.invalidate();
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    props.onHover(book.id);
  };
  const outOf = () => props.onHover(null);
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    props.onPick(book.id);
  };

  return (
    <group
      ref={root}
      position={poses.rest.position}
      rotation={[0, poses.rest.rotY, 0]}
      onPointerOver={over}
      onPointerOut={outOf}
      onClick={click}
    >
      {/* Back cover, spine and page block */}
      <RoundedBox args={[BOOK_W, COVER, BOOK_D]} radius={0.006} smoothness={2} position={[0, COVER / 2, 0]} castShadow={castShadow} receiveShadow>
        <meshStandardMaterial color={edge} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.03, T, BOOK_D]} radius={0.012} smoothness={3} position={[-BOOK_W / 2 + 0.012, T / 2, 0]} castShadow={castShadow}>
        <meshStandardMaterial color={edge} roughness={0.55} />
      </RoundedBox>
      <mesh position={[0.012, T / 2, 0]} castShadow={castShadow} receiveShadow>
        <boxGeometry args={[BOOK_W - 0.04, T - COVER * 2, BOOK_D - 0.03]} />
        <meshStandardMaterial color="#fff8ec" emissive="#fff8ec" emissiveIntensity={0.35} roughness={0.9} />
      </mesh>

      {/* Leaves that turn behind the cover, hinged on the spine */}
      {Array.from({ length: LEAVES }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            leaves.current[i] = el;
          }}
          position={[-BOOK_W / 2 + 0.02, T - COVER - 0.002 - i * 0.002, 0]}
        >
          <mesh position={[(BOOK_W - 0.05) / 2, 0, 0]}>
            <boxGeometry args={[BOOK_W - 0.05, 0.002, BOOK_D - 0.04]} />
            <meshStandardMaterial
              color={i % 2 ? '#fffdf7' : '#fff6e6'}
              emissive={i % 2 ? '#fffdf7' : '#fff6e6'}
              emissiveIntensity={0.55}
              roughness={0.95}
            />
          </mesh>
        </group>
      ))}

      {/* Front cover on its hinge */}
      <group ref={cover} position={[-BOOK_W / 2, T - COVER / 2, 0]}>
        <RoundedBox args={[BOOK_W, COVER, BOOK_D]} radius={0.006} smoothness={2} position={[BOOK_W / 2, 0, 0]} castShadow={castShadow}>
          <meshStandardMaterial color={edge} roughness={0.6} />
        </RoundedBox>
        <mesh position={[BOOK_W / 2, COVER / 2 + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[BOOK_W - 0.012, BOOK_D - 0.012]} />
          <meshStandardMaterial map={texture} roughness={0.45} />
        </mesh>
        {/* Inside of the cover */}
        <mesh position={[BOOK_W / 2, -COVER / 2 - 0.0008, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[BOOK_W - 0.03, BOOK_D - 0.03]} />
          <meshStandardMaterial color={style.from} emissive={style.from} emissiveIntensity={0.35} roughness={0.8} />
        </mesh>

        {/* Real progress: a bar along the bottom of the cover */}
        <group position={[BOOK_W / 2, COVER / 2 + 0.002, BOOK_D / 2 - 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <planeGeometry args={[BOOK_W - 0.12, 0.022]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.65} />
          </mesh>
          {book.percent > 0 ? (
            <mesh position={[(-(BOOK_W - 0.12) / 2) * (1 - book.percent / 100), 0, 0.0005]}>
              <planeGeometry args={[(BOOK_W - 0.12) * (book.percent / 100), 0.022]} />
              <meshBasicMaterial color={style.ink} />
            </mesh>
          ) : null}
        </group>

        {/* Completed subject: a gold seal */}
        {book.complete ? (
          <mesh position={[BOOK_W - 0.1, COVER / 2 + 0.003, -BOOK_D / 2 + 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.055, 24]} />
            <meshStandardMaterial color="#ffd45c" roughness={0.3} metalness={0.2} />
          </mesh>
        ) : null}
      </group>

      {props.showLabel ? (
        <Html position={[0, 0.34, 0]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
          <div className="animate-rise whitespace-nowrap rounded-xl border border-white/80 bg-white/90 px-3 py-1.5 text-center shadow-lift backdrop-blur-md">
            <p className="text-[13px] font-semibold leading-5 text-ink">
              <span className="font-mono" style={{ color: style.ink }}>
                {book.code}
              </span>{' '}
              {book.short}
            </p>
            <p className="text-[12px] leading-4 text-muted">
              {STATUS[book.status]} · {book.percent}%
            </p>
          </div>
        </Html>
      ) : null}

      {/* Most recently studied: a ribbon bookmark hangs out of the pages */}
      {book.recent ? (
        <mesh position={[0.08, T / 2, BOOK_D / 2 + 0.05]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.035, 0.004, 0.13]} />
          <meshStandardMaterial color="#ff7f9f" roughness={0.6} />
        </mesh>
      ) : null}
    </group>
  );
}
