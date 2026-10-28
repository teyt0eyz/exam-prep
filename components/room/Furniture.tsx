'use client';

import { RoundedBox } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, MeshStandardMaterial, Object3D, RepeatWrapping, type InstancedMesh, type Texture } from 'three';
import { floorTexture, skyTexture, sunPatchTexture } from './textures';

// The room's furniture, built from primitives. Materials are made once per
// scene and shared; StudyRoomScene disposes them on unmount.

export function useRoomMaterials() {
  return useMemo(() => {
    const m = (color: string, roughness = 0.75, extra: Partial<MeshStandardMaterial> = {}) =>
      Object.assign(new MeshStandardMaterial({ color, roughness }), extra);
    const floor = floorTexture();
    floor.wrapS = floor.wrapT = RepeatWrapping;
    floor.repeat.set(3, 3);
    const textures: Texture[] = [floor, skyTexture(), sunPatchTexture()];
    const mats = {
      floor: m('#ffffff', 0.85, { map: floor }),
      backWall: m('#f4eeff', 0.95, { emissive: new Color('#f4eeff'), emissiveIntensity: 0.18 }),
      sideWall: m('#e8f5ff', 0.95, { emissive: new Color('#e8f5ff'), emissiveIntensity: 0.42 }),
      trim: m('#ffffff', 0.6),
      wood: m('#e9bb8c', 0.6),
      woodDark: m('#c98f5e', 0.65),
      white: m('#fffdf9', 0.55),
      shelf: m('#fffaf3', 0.6),
      lampBody: m('#8986ff', 0.4),
      lampShade: m('#ffe58f', 0.5, { emissive: new Color('#ffe58f'), emissiveIntensity: 0.25 }),
      bulb: m('#fff6d8', 0.3, { emissive: new Color('#fff1c2'), emissiveIntensity: 1.2 }),
      pot: m('#ff9fb8', 0.6),
      potRim: m('#ffb7c8', 0.6),
      leaf: m('#5ccf9a', 0.7),
      leafLight: m('#93e6c0', 0.7),
      soil: m('#8a6248', 0.95),
      cup: m('#83d5ff', 0.45),
      chairSeat: m('#c3a7ff', 0.7),
      chairFrame: m('#8986ff', 0.5),
      rug: m('#ffd6e1', 0.95),
      cork: m('#e8c79e', 0.95),
      paper: m('#ffffff', 0.9),
      curtain: m('#ffc9a3', 0.9),
      sky: new MeshStandardMaterial({ map: textures[1], emissive: new Color('#ffffff'), emissiveMap: textures[1], emissiveIntensity: 0.9, roughness: 1 }),
      sun: new MeshStandardMaterial({ map: textures[2], transparent: true, depthWrite: false, roughness: 1, emissive: new Color('#fff3c4'), emissiveMap: textures[2], emissiveIntensity: 0.35 }),
    };
    return { mats, textures };
  }, []);
}

export type RoomMats = ReturnType<typeof useRoomMaterials>['mats'];

export function RoomShell({ mats, shadows }: { mats: RoomMats; shadows: boolean }) {
  // Oversized so a full-screen camera at any aspect never sees past the walls.
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, 0, 3]} material={mats.floor} receiveShadow={shadows}>
        <planeGeometry args={[16, 14]} />
      </mesh>
      <mesh position={[3.8, 3.2, -2.6]} material={mats.backWall} receiveShadow={shadows}>
        <planeGeometry args={[16, 6.4]} />
      </mesh>
      <mesh position={[-4.2, 3.2, 3]} rotation={[0, Math.PI / 2, 0]} material={mats.sideWall} receiveShadow={shadows}>
        <planeGeometry args={[14, 6.4]} />
      </mesh>
      {/* Skirting boards */}
      <mesh position={[3.8, 0.06, -2.585]} material={mats.trim}>
        <boxGeometry args={[16, 0.12, 0.03]} />
      </mesh>
      <mesh position={[-4.185, 0.06, 3]} material={mats.trim}>
        <boxGeometry args={[0.03, 0.12, 14]} />
      </mesh>
      {/* Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.9, 0.006, 0.2]} material={mats.rug} receiveShadow={shadows}>
        <circleGeometry args={[1.5, 48]} />
      </mesh>
    </group>
  );
}

export function Window({ mats }: { mats: RoomMats }) {
  // On the left wall, facing into the room.
  return (
    <group position={[-4.17, 2.45, -0.5]} rotation={[0, Math.PI / 2, 0]}>
      <mesh material={mats.sky}>
        <planeGeometry args={[1.8, 1.9]} />
      </mesh>
      {/* Frame and mullions */}
      {[
        [0, 0.98, 1.96, 0.08],
        [0, -0.98, 1.96, 0.08],
        [-0.94, 0, 0.08, 2.04],
        [0.94, 0, 0.08, 2.04],
        [0, 0, 0.05, 1.9],
        [0, 0.15, 1.8, 0.05],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x!, y!, 0.03]} material={mats.trim}>
          <boxGeometry args={[w!, h!, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, -1.05, 0.08]} material={mats.trim}>
        <boxGeometry args={[2.1, 0.06, 0.18]} />
      </mesh>
      {/* Curtains */}
      {[-1.2, 1.2].map((x) => (
        <RoundedBox key={x} args={[0.36, 2.4, 0.06]} radius={0.03} smoothness={2} position={[x, -0.05, 0.08]} material={mats.curtain} />
      ))}
    </group>
  );
}

/** Warm patch of window light on the floor. */
export function SunPatch({ mats }: { mats: RoomMats }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, -0.35]} position={[-2.7, 0.012, 0.0]} material={mats.sun}>
      <planeGeometry args={[2.6, 1.8]} />
    </mesh>
  );
}

export const DESK_TOP = 1.5;

export function Desk({ mats, shadows }: { mats: RoomMats; shadows: boolean }) {
  const legs: [number, number][] = [
    [-1.75, -2.0],
    [1.75, -2.0],
    [-1.75, -0.7],
    [1.75, -0.7],
  ];
  return (
    <group>
      <RoundedBox
        args={[3.8, 0.09, 1.55]}
        radius={0.03}
        smoothness={3}
        position={[0, DESK_TOP - 0.045, -1.35]}
        material={mats.wood}
        castShadow={shadows}
        receiveShadow={shadows}
      />
      {legs.map(([x, z]) => (
        <RoundedBox key={`${x}${z}`} args={[0.09, DESK_TOP - 0.09, 0.09]} radius={0.02} smoothness={2} position={[x, (DESK_TOP - 0.09) / 2, z]} material={mats.woodDark} castShadow={shadows} />
      ))}
      {/* Drawer unit */}
      <RoundedBox args={[0.9, 0.5, 1.25]} radius={0.03} smoothness={2} position={[1.25, DESK_TOP - 0.34, -1.38]} material={mats.white} castShadow={shadows} receiveShadow={shadows} />
      <mesh position={[1.25, DESK_TOP - 0.34, -0.745]} material={mats.lampBody}>
        <boxGeometry args={[0.28, 0.04, 0.02]} />
      </mesh>
    </group>
  );
}

export function DeskLamp({ mats, shadows }: { mats: RoomMats; shadows: boolean }) {
  return (
    <group position={[-1.5, DESK_TOP, -1.88]}>
      <mesh position={[0, 0.02, 0]} material={mats.lampBody} castShadow={shadows}>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 32]} />
      </mesh>
      <mesh position={[0.05, 0.32, 0]} rotation={[0, 0, -0.18]} material={mats.lampBody} castShadow={shadows}>
        <cylinderGeometry args={[0.018, 0.018, 0.62, 12]} />
      </mesh>
      <mesh position={[0.24, 0.66, 0.06]} rotation={[0.3, 0, 0.95]} material={mats.lampBody} castShadow={shadows}>
        <cylinderGeometry args={[0.016, 0.016, 0.5, 12]} />
      </mesh>
      <group position={[0.46, 0.7, 0.2]} rotation={[0.55, 0, -0.35]}>
        <mesh material={mats.lampShade} castShadow={shadows}>
          <coneGeometry args={[0.17, 0.22, 32, 1, true]} />
        </mesh>
        <mesh position={[0, -0.05, 0]} material={mats.bulb}>
          <sphereGeometry args={[0.05, 16, 12]} />
        </mesh>
      </group>
      <pointLight position={[0.5, 0.55, 0.35]} color="#ffd79a" intensity={1.6} distance={2.4} decay={2} />
    </group>
  );
}

export function PencilCup({ mats }: { mats: RoomMats }) {
  const pencils: [number, number, number, string][] = [
    [-0.03, 0.02, -0.12, '#ff9fb8'],
    [0.03, -0.02, 0.1, '#ffe58f'],
    [0.0, 0.035, 0.05, '#93e6c0'],
    [0.025, 0.0, -0.2, '#8986ff'],
  ];
  return (
    <group position={[1.55, DESK_TOP, -1.9]}>
      <mesh position={[0, 0.13, 0]} material={mats.cup}>
        <cylinderGeometry args={[0.09, 0.08, 0.26, 24, 1, true]} />
      </mesh>
      <mesh position={[0, 0.005, 0]} material={mats.cup}>
        <cylinderGeometry args={[0.08, 0.08, 0.01, 24]} />
      </mesh>
      {pencils.map(([x, z, tilt, color], i) => (
        <group key={i} position={[x, 0.2, z]} rotation={[tilt, 0, tilt * 0.8]}>
          <mesh>
            <cylinderGeometry args={[0.012, 0.012, 0.36, 6]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <coneGeometry args={[0.012, 0.04, 6]} />
            <meshStandardMaterial color="#f3d2a8" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Plant({ mats, shadows, position, scale = 1 }: { mats: RoomMats; shadows: boolean; position: [number, number, number]; scale?: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = i * 2.4;
        const r = 0.12 + (i % 3) * 0.06;
        return {
          pos: [Math.cos(a) * r, 0.55 + (i % 4) * 0.14, Math.sin(a) * r] as [number, number, number],
          rot: [Math.sin(a) * 0.6, a, Math.cos(a) * 0.6] as [number, number, number],
          light: i % 3 === 0,
        };
      }),
    [],
  );
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.22, 0]} material={mats.pot} castShadow={shadows}>
        <cylinderGeometry args={[0.26, 0.2, 0.44, 32]} />
      </mesh>
      <mesh position={[0, 0.45, 0]} material={mats.potRim}>
        <torusGeometry args={[0.26, 0.03, 10, 32]} />
      </mesh>
      <mesh position={[0, 0.43, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.soil}>
        <circleGeometry args={[0.24, 24]} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} position={l.pos} rotation={l.rot} scale={[0.13, 0.3, 0.05]} material={l.light ? mats.leafLight : mats.leaf} castShadow={shadows}>
          <sphereGeometry args={[1, 14, 10]} />
        </mesh>
      ))}
    </group>
  );
}

export function Chair({ mats, shadows }: { mats: RoomMats; shadows: boolean }) {
  // Pulled out from the desk at an angle, seat toward the desk.
  return (
    <group position={[-2.05, 0, -0.35]} rotation={[0, -0.75, 0]}>
      <RoundedBox args={[0.74, 0.1, 0.7]} radius={0.045} smoothness={3} position={[0, 0.9, 0]} material={mats.chairSeat} castShadow={shadows} />
      <RoundedBox args={[0.74, 0.66, 0.09]} radius={0.045} smoothness={3} position={[0, 1.42, 0.36]} rotation={[-0.1, 0, 0]} material={mats.chairSeat} castShadow={shadows} />
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 1.1, 0.33]} rotation={[-0.1, 0, 0]} material={mats.chairFrame}>
          <boxGeometry args={[0.05, 0.36, 0.04]} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0]} material={mats.chairFrame}>
        <cylinderGeometry args={[0.035, 0.035, 0.8, 12]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} rotation={[0, i * 1.257, 0]}>
          <mesh position={[0.2, 0.07, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.chairFrame}>
            <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
          </mesh>
          <mesh position={[0.4, 0.035, 0]} material={mats.chairFrame}>
            <sphereGeometry args={[0.035, 10, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const SHELF_COLORS = ['#83d5ff', '#8986ff', '#c3a7ff', '#ff9fb8', '#ffb477', '#ffe58f', '#93e6c0', '#ffffff'];

/** Wall bookshelf with decorative books drawn as one instanced mesh. */
export function Bookshelf({ mats, shadows }: { mats: RoomMats; shadows: boolean }) {
  const W = 1.7;
  const H = 3.0;
  const D = 0.42;
  const shelves = [0.12, 0.85, 1.6, 2.35];
  const books = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; tilt: number; color: string }[] = [];
    shelves.forEach((y, s) => {
      let x = -W / 2 + 0.1;
      let i = 0;
      while (x < W / 2 - 0.2) {
        const seed = Math.sin((s + 1) * 12.9898 + i * 78.233) * 43758.5453;
        const r = seed - Math.floor(seed);
        const w = 0.06 + r * 0.06;
        const h = 0.42 + ((r * 7) % 1) * 0.2;
        if (r > 0.86 && i > 2) {
          x += 0.18; // a gap
        } else {
          out.push({ x: x + w / 2, y: y + 0.03 + h / 2, w, h, tilt: r > 0.8 ? -0.18 : 0, color: SHELF_COLORS[(i + s * 3) % SHELF_COLORS.length]! });
          x += w + 0.008;
        }
        i++;
      }
    });
    return out;
  }, []);

  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    const c = new Color();
    books.forEach((b, i) => {
      o.position.set(b.x, b.y, 0);
      o.rotation.set(0, 0, b.tilt);
      o.scale.set(b.w, b.h, D - 0.1);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.set(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [books]);

  return (
    <group position={[-3.05, 0, -2.6 + D / 2 + 0.01]}>
      {/* Sides, back and shelves */}
      {[-W / 2, W / 2].map((x) => (
        <mesh key={x} position={[x, H / 2, 0]} material={mats.shelf} castShadow={shadows} receiveShadow={shadows}>
          <boxGeometry args={[0.05, H, D]} />
        </mesh>
      ))}
      <mesh position={[0, H / 2, -D / 2 + 0.01]} material={mats.backWall}>
        <boxGeometry args={[W, H, 0.02]} />
      </mesh>
      {[...shelves, H].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={mats.shelf} castShadow={shadows} receiveShadow={shadows}>
          <boxGeometry args={[W, 0.045, D]} />
        </mesh>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, books.length]} castShadow={shadows} receiveShadow={shadows}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <Plant mats={mats} shadows={shadows} position={[0.55, H + 0.02, 0]} scale={0.55} />
    </group>
  );
}
