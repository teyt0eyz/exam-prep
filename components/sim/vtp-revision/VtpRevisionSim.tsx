'use client';

import { useMemo, useState } from 'react';
import { NumberStepper, PresetBar, SimToggle, SimulationPlayer, type SimExplanation, type SimTone } from '@/components/sim/core';
import { init, isDone, step, type Config, type State, type VtpMode } from './logic';

const MODES = [
  { value: 'server', label: 'Server' },
  { value: 'client', label: 'Client' },
  { value: 'transparent', label: 'Transparent' },
] as const;
const RESET = [
  { value: 'off', label: 'ไม่ทำ' },
  { value: 'on', label: 'reset ก่อนต่อ' },
] as const;

const PRESETS: { label: string; value: Config }[] = [
  // Vlan.pdf p.13: an old switch with a higher revision wipes the domain
  { label: 'สไลด์ p.13: switch เก่า revision สูง', value: { oldMode: 'client', oldRevision: 12, reset: false } },
  // Vlan.pdf p.14: prevention
  { label: 'สไลด์ p.14: reset revision ก่อน', value: { oldMode: 'client', oldRevision: 12, reset: true } },
  { label: 'สไลด์ p.14: ใช้ Transparent', value: { oldMode: 'transparent', oldRevision: 12, reset: false } },
  { label: 'revision ต่ำกว่า', value: { oldMode: 'server', oldRevision: 3, reset: false } },
];

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const touched = e.kind === 'sync' ? e.to : e.kind === 'create' ? 'SW1' : e.kind === 'reset' || e.kind === 'connect' ? 'OLD' : e.kind === 'ignore' ? e.who : '';
  const from = e.kind === 'sync' ? e.from : '';
  return (
    <div className="flex flex-col gap-2">
      <ul className="grid grid-cols-2 gap-2" aria-label="switch ในโดเมน LABCORP">
        {state.switches.map((sw) => {
          const bad = e.kind === 'sync' && e.to === sw.name && e.lost.length > 0;
          return (
            <li key={sw.name} className={`rounded-md border p-2 ${!sw.connected ? 'border-dashed border-line bg-surface opacity-70' : bad ? 'border-bad bg-bad-soft' : sw.name === touched ? 'border-accent bg-accent-soft' : sw.name === from ? 'border-warn bg-warn-soft' : 'border-line bg-surface'}`}>
              <p className="flex items-center justify-between font-mono text-[13px] font-semibold leading-5">
                {sw.name}
                <span className="rounded-sm bg-surface-2 px-1.5 text-[10px] font-medium text-muted">{sw.mode}</span>
              </p>
              <p className="font-mono text-[12px] leading-5 text-muted">
                revision <b className="text-ink">{sw.revision}</b>
              </p>
              <p className="font-mono text-[11px] leading-[18px] text-muted">VLAN {sw.vlans.join(', ')}</p>
              {!sw.connected ? <p className="text-[10px] leading-4 text-faint">ยังไม่ได้ต่อ trunk</p> : null}
            </li>
          );
        })}
      </ul>
      <p className="px-1 text-center font-mono text-[11px] leading-4 text-faint">SW1 ── SW2 ── SW3 ── OLD (trunk, domain LABCORP)</p>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return { title: 'โดเมน VTP ชื่อ LABCORP', body: 'SW1 เป็น Server ส่วน SW2, SW3 เป็น Client ทุกตัวมี VLAN database ตรงกันที่ revision 5 switch ชื่อ OLD เคยใช้ที่อื่นและยังมี VLAN database เก่า (VLAN 1, 99) ค้างอยู่ กำลังจะถูกนำมาต่อ' };
    case 'create':
      return { title: `ผู้ดูแลสร้าง VLAN ${e.vlan} บน SW1 → revision ${e.revision}`, body: 'สร้าง แก้ หรือลบ VLAN ได้เฉพาะบน Server (หรือ Transparent สำหรับตัวเอง) ทุกครั้งที่ VLAN database เปลี่ยน configuration revision number เพิ่มขึ้นหนึ่ง แล้ว Server ส่ง advertisement ออกทาง trunk' };
    case 'sync':
      return e.lost.length > 0
        ? { title: `${e.to} ถูกเขียนทับด้วย database ของ ${e.from} (revision ${e.revision} > ${e.old})`, body: `${e.to} เชื่อ revision ที่สูงกว่าเสมอ ไม่สนว่าผู้ส่งเป็น server หรือ client จึงแทน VLAN database ทั้งชุด: VLAN ${e.lost.join(', ')} หายไป${e.gained.length > 0 ? ` และได้ VLAN ${e.gained.join(', ')} มาแทน` : ''} พอร์ตที่เคยอยู่ใน VLAN ที่หายไปจะใช้งานไม่ได้` }
        : { title: `${e.to} synchronize กับ ${e.from}: revision ${e.old} → ${e.revision}`, body: `advertisement มี revision ${e.revision} สูงกว่าที่ ${e.to} มีอยู่ (${e.old}) จึงรับ VLAN database ใหม่${e.gained.length > 0 ? ` (ได้ VLAN ${e.gained.join(', ')} เพิ่ม)` : ''} และส่งต่อออก trunk อื่น` };
    case 'reset':
      return { title: `reset revision ของ OLD: ${e.from} → 0`, body: 'เปลี่ยนชื่อ VTP domain ของ OLD เป็นชื่ออื่นชั่วคราวแล้วเปลี่ยนกลับ การเปลี่ยน domain ทำให้ revision number กลับเป็น 0 เป็นขั้นที่ต้องทำก่อนต่อ switch ที่เคยใช้งานมาแล้วเข้าโดเมน' };
    case 'connect':
      return { title: 'ต่อ OLD เข้ากับ SW3 ด้วย trunk', body: `OLD มี revision ${e.revision} ส่วนโดเมนอยู่ที่ revision ${e.domain} domain name และ password ตรงกัน ทั้งสองฝั่งจึงแลก advertisement กัน และจะเทียบ revision` };
    case 'ignore':
      return e.reason === 'transparent'
        ? { title: `${e.who} เป็น Transparent: ไม่ synchronize`, body: `${e.who} ไม่รับ VLAN database จากโดเมนและไม่ส่ง database ของตัวเองให้ใคร ทำเพียงส่งต่อ (forward) advertisement ที่ได้รับ VLAN ของมันมีผลเฉพาะในตัวเอง โดเมนจึงปลอดภัยไม่ว่า revision ของมันจะเป็นเท่าใด` }
        : { title: `${e.who} ไม่เปลี่ยนแปลง`, body: `advertisement ที่ได้รับมี revision ${e.revision} ${e.reason === 'equal' ? 'เท่ากับ' : 'ต่ำกว่า'}ของตัวเอง (${e.domain}) จึงไม่มีอะไรต้อง synchronize` };
    case 'result':
      return e.wiped
        ? { title: 'ทั้งโดเมนถูกเขียนทับ', body: 'แม้ SW1 จะเป็น Server ก็ยังถูก database จาก switch ที่ revision สูงกว่าเขียนทับ VLAN 10, 20, 30, 40 หายจากทุกตัว ป้องกัน: ตรวจ show vtp status ก่อนต่อ, reset revision ด้วยการเปลี่ยน domain ชั่วคราว หรือตั้ง switch ใหม่เป็น Transparent' }
        : { title: 'โดเมนปลอดภัย', body: 'VLAN database ของ SW1, SW2, SW3 ยังครบ switch ที่ต่อเข้ามาไม่ได้มี revision สูงกว่าโดเมน หรือไม่เข้าร่วมการ synchronize' };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return { tone: 'normal', label: 'เริ่มต้น' };
    case 'sync':
      return e.lost.length > 0 ? { tone: 'error', label: 'ถูกเขียนทับ' } : { tone: 'active', label: 'synchronize' };
    case 'result':
      return e.wiped ? { tone: 'error', label: 'VLAN หาย' } : { tone: 'done', label: 'ปลอดภัย' };
    case 'ignore':
      return { tone: 'done', label: 'ไม่เปลี่ยน' };
    default:
      return { tone: 'waiting', label: e.kind === 'create' ? 'revision +1' : e.kind === 'reset' ? 'reset' : 'ต่อ trunk' };
  }
}

const render = (state: State) => <Canvas state={state} />;

export function VtpRevisionSim() {
  const [config, setConfig] = useState<Config>(PRESETS[0]!.value);
  const initialState = useMemo(() => init(config), [config]);

  return (
    <SimulationPlayer
      title="VTP revision number"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => JSON.stringify(p.value) === JSON.stringify(config))} onPick={setConfig} />
          <SimToggle label="mode ของ OLD" value={config.oldMode} options={MODES} onChange={(v: VtpMode) => setConfig((c) => ({ ...c, oldMode: v }))} />
          <NumberStepper label="revision ของ OLD" value={config.oldRevision} min={0} max={20} onChange={(v) => setConfig((c) => ({ ...c, oldRevision: v }))} />
          <SimToggle label="ก่อนต่อเข้าโดเมน" value={config.reset ? 'on' : 'off'} options={RESET} onChange={(v) => setConfig((c) => ({ ...c, reset: v === 'on' }))} />
        </div>
      }
      legend={
        <>
          <span>revision สูงกว่า = ชนะ</span>
          <span>ไม่สนว่าเป็น server หรือ client</span>
        </>
      }
    />
  );
}
