'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MathUtils, Vector3 } from 'three';
import { Bookshelf, Chair, DESK_TOP, Desk, DeskLamp, PencilCup, Plant, RoomShell, SunPatch, Window, useRoomMaterials } from './Furniture';
import { BOOK_W, SubjectBook, type BookPoses } from './SubjectBook';
import type { RoomBoard, RoomBook } from './types';
import { WallBoards } from './WallBoards';

// The study room. Loaded with next/dynamic from StudyRoom only, so three.js and
// R3F stay out of every other page. frameloop="demand": a frame is drawn only
// when something moves (book, camera, pointer parallax) and nothing otherwise.

export interface SceneProps {
  books: RoomBook[];
  board: RoomBoard;
  selected: string | null;
  opening: string | null;
  /** Subject we just came back from: its book starts open and closes onto the desk. */
  returning: string | null;
  reducedMotion: boolean;
  /** Lighter scene: no shadows, lower DPR (phones, tablets). */
  lite: boolean;
  onSelect(id: string | null): void;
  onOpen(id: string): void;
  onOpened(id: string): void;
}

const JITTER = [0.07, -0.05, 0.03, -0.08, 0.05];
const PRESENT: [number, number, number] = [BOOK_W / 2, 2.12, -0.42];
const PRESENT_NORMAL = new Vector3(0, Math.cos(1.06), Math.sin(1.06));
const TAN_HALF_FOV = Math.tan(MathUtils.degToRad(34 / 2));

/** Narrow screens put the books in two rows (3 + 2) so each stays big enough to tap. */
const isPortrait = (aspect: number) => aspect < 1;

function posesFor(books: RoomBook[], aspect: number): Record<string, BookPoses> {
  const portrait = isPortrait(aspect);
  const gap = 0.64;
  const start = -((books.length - 1) * gap) / 2;
  return Object.fromEntries(
    books.map((b, i) => {
      const row = portrait ? (i < 3 ? 0 : 1) : 0;
      const col = portrait ? (i < 3 ? i - 1 : i - 3.5) : 0;
      const x = portrait ? col * 0.64 : start + i * gap;
      // The subject studied last sits a little forward and askew, as if just put down.
      const z = portrait ? (row === 0 ? -1.66 : -0.9) : b.recent ? -1.08 : -1.22;
      return [
        b.id,
        {
          rest: {
            position: [x, DESK_TOP + 0.001, z] as [number, number, number],
            rotY: (JITTER[i % JITTER.length] ?? 0) + (b.recent ? 0.12 : 0),
          },
          present: { position: PRESENT, rotX: 1.06 },
        },
      ];
    }),
  );
}

interface View {
  pos: Vector3;
  look: Vector3;
}

/** Camera framing for the room and for an opened book, fitted to the viewport's aspect. */
function views(aspect: number): { room: View; open: View } {
  const tanH = TAN_HALF_FOV * aspect;
  let room: View;
  if (aspect >= 1.3) {
    room = { pos: new Vector3(2.75, 3.55, 3.65), look: new Vector3(-0.45, 1.85, -1.4) };
  } else {
    // Back off until the books (one row, or two on portrait) fit the width.
    const portrait = isPortrait(aspect);
    // A little wider than the books themselves so the room around them stays in view.
    const halfW = portrait ? 1.38 : 2.1;
    const dist = MathUtils.clamp(halfW / tanH, 4.5, 11);
    const dir = (portrait ? new Vector3(0.22, 0.62, 0.76) : new Vector3(0.45, 0.58, 0.68)).normalize();
    const look = new Vector3(portrait ? -0.1 : -0.15, portrait ? 2.0 : 1.75, -1.45);
    room = { pos: look.clone().addScaledVector(dir, dist), look };
  }
  const openDist = Math.max(2.0, 0.66 / tanH);
  const openLook = new Vector3(0, PRESENT[1], PRESENT[2]);
  return { room, open: { pos: openLook.clone().addScaledVector(PRESENT_NORMAL, openDist), look: openLook } };
}

function CameraRig({
  selectedAt,
  openTarget,
  startOpen,
  reducedMotion,
}: {
  selectedAt: Vector3 | null;
  openTarget: boolean;
  startOpen: boolean;
  reducedMotion: boolean;
}) {
  const { camera, size, pointer, invalidate } = useThree();
  const state = useRef({ blend: startOpen ? 1 : 0, look: new Vector3(), ready: false, par: new Vector3() });
  const tmp = useMemo(() => ({ pos: new Vector3(), look: new Vector3() }), []);

  useFrame((_, dt) => {
    const s = state.current;
    const v = views(size.width / size.height);
    const k = reducedMotion ? 1e3 : 1;
    const target = openTarget ? 1 : 0;
    s.blend = MathUtils.damp(s.blend, target, 3.6 * k, dt);
    const b = s.blend * s.blend * (3 - 2 * s.blend);

    tmp.pos.lerpVectors(v.room.pos, v.open.pos, b);
    tmp.look.lerpVectors(v.room.look, v.open.look, b);
    if (selectedAt && !openTarget) {
      // Lean in toward the chosen book.
      tmp.look.lerp(selectedAt, 0.35);
      tmp.pos.lerp(selectedAt.clone().add(new Vector3(1.6, 2.2, 3.0)), 0.18);
    }
    // Gentle parallax with the pointer, room view only.
    const parTarget = reducedMotion || b > 0.05 ? 0 : 1;
    s.par.x = MathUtils.damp(s.par.x, pointer.x * 0.35 * parTarget, 4, dt);
    s.par.y = MathUtils.damp(s.par.y, pointer.y * 0.2 * parTarget, 4, dt);
    tmp.pos.x += s.par.x;
    tmp.pos.y += s.par.y;

    if (!s.ready) {
      camera.position.copy(tmp.pos);
      s.look.copy(tmp.look);
      s.ready = true;
    } else {
      const lam = 5 * k;
      camera.position.x = MathUtils.damp(camera.position.x, tmp.pos.x, lam, dt);
      camera.position.y = MathUtils.damp(camera.position.y, tmp.pos.y, lam, dt);
      camera.position.z = MathUtils.damp(camera.position.z, tmp.pos.z, lam, dt);
      s.look.x = MathUtils.damp(s.look.x, tmp.look.x, lam, dt);
      s.look.y = MathUtils.damp(s.look.y, tmp.look.y, lam, dt);
      s.look.z = MathUtils.damp(s.look.z, tmp.look.z, lam, dt);
    }
    camera.lookAt(s.look);
    if (camera.position.distanceTo(tmp.pos) > 0.002 || s.look.distanceTo(tmp.look) > 0.002 || Math.abs(s.blend - target) > 0.002) {
      invalidate();
    }
  });
  return null;
}

function Room(props: SceneProps) {
  const { books, board, selected, opening, returning, reducedMotion, lite } = props;
  const { mats, textures } = useRoomMaterials();
  const [hovered, setHovered] = useState<string | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const poses = useMemo(() => posesFor(books, aspect), [books, aspect]);
  const shadows = !lite;

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
    [mats, textures],
  );
  useEffect(() => {
    gl.domElement.style.cursor = hovered && !opening ? 'pointer' : '';
  }, [hovered, opening, gl]);
  useEffect(() => {
    invalidate();
  }, [selected, hovered, opening, books, board, invalidate]);

  const selectedAt = useMemo(() => {
    const p = selected ? poses[selected] : undefined;
    return p ? new Vector3(...p.rest.position) : null;
  }, [selected, poses]);

  return (
    <>
      <hemisphereLight args={['#eef6ff', '#ffe6cf', 1.25]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[-6, 7, 2.2]}
        intensity={2.1}
        color="#fff1dc"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <RoomShell mats={mats} shadows={shadows} />
      <Window mats={mats} />
      <SunPatch mats={mats} />
      <Bookshelf mats={mats} shadows={shadows} />
      <Desk mats={mats} shadows={shadows} />
      <DeskLamp mats={mats} shadows={shadows} />
      <PencilCup mats={mats} />
      <Plant mats={mats} shadows={shadows} position={[2.75, 0, -1.95]} scale={1.35} />
      <Chair mats={mats} shadows={shadows} />
      <WallBoards board={board} mats={mats} />

      {books.map((b) => {
        const p = poses[b.id];
        if (!p) return null;
        return (
          <SubjectBook
            key={b.id}
            book={b}
            poses={p}
            hovered={hovered === b.id}
            showLabel={hovered === b.id && selected !== b.id && !opening}
            selected={selected === b.id}
            open={opening === b.id}
            startOpen={returning === b.id && !reducedMotion}
            instant={reducedMotion}
            castShadow={shadows}
            invalidate={invalidate}
            onHover={(id) => {
              if (!opening) setHovered(id);
            }}
            onPick={(id) => {
              if (opening) return;
              if (selected === id) props.onOpen(id);
              else props.onSelect(id);
            }}
            onOpened={props.onOpened}
          />
        );
      })}

      <CameraRig
        selectedAt={selectedAt}
        openTarget={opening !== null}
        startOpen={returning !== null && !reducedMotion}
        reducedMotion={reducedMotion}
      />
    </>
  );
}

export default function StudyRoomScene(props: SceneProps) {
  return (
    <Canvas
      frameloop="demand"
      flat
      shadows={!props.lite}
      dpr={[1, props.lite ? 1.5 : 1.75]}
      gl={{ antialias: true, powerPreference: 'low-power', alpha: true }}
      camera={{ fov: 34, near: 0.1, far: 40, position: [2.75, 3.55, 3.65] }}
      onPointerMissed={() => {
        if (!props.opening) props.onSelect(null);
      }}
      aria-hidden="true"
    >
      <Invalidator />
      <Room {...props} />
    </Canvas>
  );
}

/** Draws a frame when the pointer moves over the canvas (for parallax). */
function Invalidator() {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const on = () => invalidate();
    el.addEventListener('pointermove', on);
    return () => el.removeEventListener('pointermove', on);
  }, [gl, invalidate]);
  return null;
}
