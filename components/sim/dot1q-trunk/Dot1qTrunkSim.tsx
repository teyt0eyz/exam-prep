'use client';

import { useMemo, useState } from 'react';
import { PresetBar, SimToggle, SimulationPlayer, type SimExplanation, type SimTone } from '@/components/sim/core';
import { init, isDone, step, type Config, type State } from './logic';

const VLANS = [1, 10, 20, 999].map((v) => ({ value: String(v), label: String(v) }));

const PRESETS: { label: string; value: Config }[] = [
  // Vlan.pdf p.6–7: tagged frame on the trunk
  { label: 'สไลด์ p.7: VLAN 10 ติด tag', value: { vlanA: 10, vlanB: 10, native1: 999, native2: 999 } },
  // Vlan.pdf p.20: native VLAN frames are untagged
  { label: 'สไลด์ p.20: Native VLAN ไม่ติด tag', value: { vlanA: 1, vlanB: 1, native1: 1, native2: 1 } },
  // Vlan.pdf p.21: native VLAN mismatch leaks traffic
  { label: 'สไลด์ p.21: Native mismatch', value: { vlanA: 1, vlanB: 999, native1: 1, native2: 999 } },
  { label: 'ต่าง VLAN คุยกันไม่ได้', value: { vlanA: 10, vlanB: 20, native1: 999, native2: 999 } },
];

const NODES = ['A', 'SW1', 'trunk', 'SW2', 'B'];

function Canvas({ state }: { state: State }) {
  const c = state.config;
  const s = state.stages[state.i];
  const at = s?.at ?? 0;
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-5 gap-1 text-center font-mono text-[11px] leading-4" aria-label="เส้นทางของ frame">
        {NODES.map((n, k) => (
          <li key={n} aria-current={k === at ? 'step' : undefined} className={`rounded-md border px-0.5 py-1.5 ${k === at ? (s?.tone === 'error' ? 'border-bad bg-bad-soft text-bad' : 'border-accent bg-accent-soft text-accent') : 'border-line bg-surface text-muted'}`}>
            <b className="block text-[12px]">{n}</b>
            {k === 0 ? `VLAN ${c.vlanA}` : k === 1 ? `native ${c.native1}` : k === 2 ? '802.1Q' : k === 3 ? `native ${c.native2}` : `VLAN ${c.vlanB}`}
          </li>
        ))}
      </ol>
      <div className="overflow-x-auto rounded-md border border-line bg-surface p-2">
        <p className="mb-1 text-[11px] leading-4 text-faint">frame ณ จุดนี้</p>
        <div className="flex min-w-max font-mono text-[11px] leading-[30px]">
          <span className="border border-line px-2 text-muted">Dest MAC</span>
          <span className="border border-l-0 border-line px-2 text-muted">Src MAC</span>
          {s && s.tag !== null ? <span className="border border-l-0 border-accent bg-accent-soft px-2 font-semibold text-accent">802.1Q · VID {s.tag}</span> : null}
          <span className="border border-l-0 border-line px-2 text-muted">Type</span>
          <span className="border border-l-0 border-line px-2 text-muted">Data</span>
          <span className="border border-l-0 border-line px-2 text-muted">FCS</span>
        </div>
        <p className="mt-1 text-[12px] leading-5 text-muted">
          {s ? (s.tag === null ? 'untagged' : 'tagged (+4 byte)') : 'untagged'}
          {s && s.vlan !== null ? ` · switch ถือว่าเป็น VLAN ${s.vlan}` : ''}
        </p>
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const s = state.stages[state.i];
  if (!s) return { title: 'A จะส่ง frame ไปหา B ผ่าน trunk', body: 'A ต่อกับ access port ของ SW1 และ B ต่อกับ access port ของ SW2 สอง switch เชื่อมกันด้วย trunk แบบ 802.1Q ดูว่า tag ถูกใส่และลอกที่จุดใด และ Native VLAN มีผลอย่างไร' };
  return { title: s.title, body: s.body };
}

function status(state: State): { tone: SimTone; label: string } {
  const s = state.stages[state.i];
  if (!s) return { tone: 'normal', label: 'เริ่มต้น' };
  if (isDone(state)) return { tone: s.tone, label: s.tone === 'done' ? 'ส่งถึง B' : s.tone === 'error' ? 'รั่วข้าม VLAN' : 'ไม่ถึง B' };
  return { tone: s.tone, label: s.tag === null ? 'untagged' : `tag ${s.tag}` };
}

const render = (state: State) => <Canvas state={state} />;

export function Dot1qTrunkSim() {
  const [config, setConfig] = useState<Config>(PRESETS[0]!.value);
  const initialState = useMemo(() => init(config), [config]);
  const set = (key: keyof Config) => (v: string) => setConfig((c) => ({ ...c, [key]: Number(v) }));

  return (
    <SimulationPlayer
      title="802.1Q tagging บน trunk"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => JSON.stringify(p.value) === JSON.stringify(config))} onPick={setConfig} />
          <SimToggle label="VLAN ของ A (access port บน SW1)" value={String(config.vlanA)} options={VLANS} onChange={set('vlanA')} />
          <SimToggle label="Native VLAN ฝั่ง SW1" value={String(config.native1)} options={VLANS} onChange={set('native1')} />
          <SimToggle label="Native VLAN ฝั่ง SW2" value={String(config.native2)} options={VLANS} onChange={set('native2')} />
          <SimToggle label="VLAN ของ B (access port บน SW2)" value={String(config.vlanB)} options={VLANS} onChange={set('vlanB')} />
        </div>
      }
      legend={
        <>
          <span>tag 4 byte = TPID + Priority + CFI + VLAN ID</span>
        </>
      }
    />
  );
}
