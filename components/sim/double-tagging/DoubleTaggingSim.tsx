'use client';

import { useMemo, useState } from 'react';
import { PresetBar, SimToggle, SimulationPlayer, type SimExplanation, type SimTone } from '@/components/sim/core';
import { init, isDone, step, type Config, type State } from './logic';

const opt = (vs: number[]) => vs.map((v) => ({ value: String(v), label: String(v) }));
const ONOFF = [
  { value: 'off', label: 'ปิด' },
  { value: 'on', label: 'เปิด' },
] as const;

const PRESETS: { label: string; value: Config }[] = [
  // Vlan.pdf p.33–34: attacker sits in the native VLAN (default VLAN 1)
  { label: 'สไลด์ p.34: Native VLAN 1', value: { attacker: 1, native: 1, target: 20, tagNative: false } },
  // Vlan.pdf p.38: native VLAN moved to an unused VLAN
  { label: 'สไลด์ p.38: Native VLAN 999', value: { attacker: 1, native: 999, target: 20, tagNative: false } },
  // IVR p.7: vlan dot1q tag native
  { label: 'สไลด์ IVR p.7: tag native', value: { attacker: 1, native: 1, target: 20, tagNative: true } },
];

const NODES = ['ผู้โจมตี', 'SW1', 'trunk', 'SW2', 'เหยื่อ'];

function Canvas({ state }: { state: State }) {
  const c = state.config;
  const s = state.stages[state.i];
  const at = s?.at ?? 0;
  const tags = s?.tags ?? [c.attacker, c.target];
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-5 gap-1 text-center font-mono text-[11px] leading-4" aria-label="เส้นทางของ frame">
        {NODES.map((n, k) => (
          <li key={n} aria-current={k === at ? 'step' : undefined} className={`rounded-md border px-0.5 py-1.5 ${k === at ? (s?.tone === 'error' ? 'border-bad bg-bad-soft text-bad' : s?.tone === 'done' ? 'border-ok bg-ok-soft text-ok' : 'border-accent bg-accent-soft text-accent') : 'border-line bg-surface text-muted'}`}>
            <b className="block text-[11px]">{n}</b>
            {k === 0 ? `VLAN ${c.attacker}` : k === 2 ? `native ${c.native}` : k === 4 ? `VLAN ${c.target}` : ' '}
          </li>
        ))}
      </ol>
      <div className="overflow-x-auto rounded-md border border-line bg-surface p-2">
        <p className="mb-1 text-[11px] leading-4 text-faint">frame ณ จุดนี้</p>
        <div className="flex min-w-max font-mono text-[11px] leading-[30px]">
          <span className="border border-line px-2 text-muted">Dest</span>
          <span className="border border-l-0 border-line px-2 text-muted">Src</span>
          {tags.map((t, k) => (
            <span key={k} className={`border border-l-0 px-2 font-semibold ${t === c.target ? 'border-bad bg-bad-soft text-bad' : 'border-accent bg-accent-soft text-accent'}`}>
              {tags.length === 2 ? (k === 0 ? 'outer' : 'inner') : 'tag'} · VID {t}
            </span>
          ))}
          <span className="border border-l-0 border-line px-2 text-muted">Data</span>
          <span className="border border-l-0 border-line px-2 text-muted">FCS</span>
        </div>
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const s = state.stages[state.i];
  if (!s) return { title: 'Double tagging', body: 'ผู้โจมตีต่ออยู่กับ access port ของ SW1 และต้องการส่ง frame เข้า VLAN อื่นบน SW2 โดยไม่ผ่าน router วิธีนี้อาศัยพฤติกรรมของ Native VLAN บน trunk ที่ไม่ใส่ tag' };
  return { title: s.title, body: s.body };
}

function status(state: State): { tone: SimTone; label: string } {
  const s = state.stages[state.i];
  if (!s) return { tone: 'normal', label: 'เริ่มต้น' };
  if (isDone(state)) return { tone: s.tone, label: s.tone === 'error' ? 'โจมตีสำเร็จ' : 'ป้องกันได้' };
  return { tone: s.tone, label: `${s.tags.length} tag` };
}

const render = (state: State) => <Canvas state={state} />;

export function DoubleTaggingSim() {
  const [config, setConfig] = useState<Config>(PRESETS[0]!.value);
  const initialState = useMemo(() => init(config), [config]);

  return (
    <SimulationPlayer
      title="VLAN hopping: Double tagging"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => JSON.stringify(p.value) === JSON.stringify(config))} onPick={setConfig} />
          <SimToggle label="VLAN ของพอร์ตผู้โจมตี" value={String(config.attacker)} options={opt([1, 10])} onChange={(v) => setConfig((c) => ({ ...c, attacker: Number(v) }))} />
          <SimToggle label="Native VLAN ของ trunk" value={String(config.native)} options={opt([1, 10, 999])} onChange={(v) => setConfig((c) => ({ ...c, native: Number(v) }))} />
          <SimToggle label="VLAN เป้าหมาย" value={String(config.target)} options={opt([20, 30])} onChange={(v) => setConfig((c) => ({ ...c, target: Number(v) }))} />
          <SimToggle label="vlan dot1q tag native" value={config.tagNative ? 'on' : 'off'} options={ONOFF} onChange={(v) => setConfig((c) => ({ ...c, tagNative: v === 'on' }))} />
        </div>
      }
      legend={
        <>
          <span className="text-bad">แดง = tag ของ VLAN เป้าหมาย</span>
          <span>ทำได้ทิศทางเดียว</span>
        </>
      }
    />
  );
}
