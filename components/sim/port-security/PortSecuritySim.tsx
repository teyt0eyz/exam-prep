'use client';

import { useMemo, useState } from 'react';
import { CodeTrace, NumberStepper, OpChips, PresetBar, SimTextInput, SimToggle, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { init, isDone, parse, step, type Mode, type State } from './logic';

const MODES = [
  { value: 'off', label: 'ไม่เปิด' },
  { value: 'protect', label: 'Protect' },
  { value: 'restrict', label: 'Restrict' },
  { value: 'shutdown', label: 'Shutdown' },
] as const;
const LEARN = [
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'sticky', label: 'Sticky' },
] as const;

const FLOOD = 'A1, A2, A3, A4, A5, A6, A7, A8';
const PRESETS: { label: string; value: { text: string; mode: Mode; maximum: number; sticky: boolean } }[] = [
  // CH1 p.31: maximum 2, sticky, violation restrict
  { label: 'สไลด์ p.31: max 2 sticky restrict', value: { text: 'AA, BB, AA, CC, BB, DD', mode: 'restrict', maximum: 2, sticky: true } },
  // CH1 p.32: the default mode puts the port in err-disabled
  { label: 'สไลด์ p.32: Shutdown (default)', value: { text: 'AA, BB, AA', mode: 'shutdown', maximum: 1, sticky: false } },
  { label: 'สไลด์ p.32: Protect', value: { text: 'AA, BB, AA, CC', mode: 'protect', maximum: 1, sticky: false } },
  // CH1 p.26: MAC flooding against an unprotected port
  { label: 'สไลด์ p.26: MAC flooding', value: { text: FLOOD, mode: 'off', maximum: 1, sticky: false } },
  { label: 'MAC flooding + Port Security', value: { text: FLOOD, mode: 'shutdown', maximum: 2, sticky: false } },
];

const CAPACITY = 5;

function Canvas({ state }: { state: State }) {
  const off = state.mode === 'off';
  const config = off
    ? ['interface fastEthernet 0/1', ' switchport mode access']
    : [
        'interface fastEthernet 0/1',
        ' switchport mode access',
        ' switchport port-security',
        ` switchport port-security maximum ${state.maximum}`,
        ...(state.sticky ? [' switchport port-security mac-address sticky', ...state.secure.map((m) => ` switchport port-security mac-address sticky ${m}`)] : []),
        ` switchport port-security violation ${state.mode}`,
      ];
  const stickyLines = state.sticky && !off ? state.secure.map((_, k) => 5 + k) : [];
  const portTone = state.errDisabled ? 'border-bad bg-bad-soft text-bad' : state.failOpen ? 'border-warn bg-warn-soft text-warn' : 'border-ok bg-ok-soft text-ok';

  return (
    <div className="flex flex-col gap-3">
      <OpChips ops={state.macs.map((m) => m)} current={state.i - 1} />
      <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[13px] leading-[26px]">
        <span className={`rounded-md border px-3 ${portTone}`}>Fa0/1: {state.errDisabled ? 'err-disabled' : state.failOpen ? 'up (fail-open)' : 'up'}</span>
        {off ? null : <span className="rounded-md border border-line bg-surface px-3 text-muted">violation count: {state.violations}</span>}
        <span className="rounded-md border border-line bg-surface px-3 text-muted">frame ที่ถูกทิ้ง: {state.dropped}</span>
      </div>
      <div className="overflow-hidden rounded-md border border-line">
        <p className="bg-surface-2 px-2 text-[12px] font-medium leading-7 text-muted">{off ? `CAM table (จุได้ ${CAPACITY} รายการในตัวอย่างนี้)` : `Secure MAC (สูงสุด ${state.maximum})`}</p>
        <div className="flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5">
          {state.secure.length === 0 ? <span className="text-[12px] text-faint">ว่าง</span> : null}
          {state.secure.map((m) => (
            <span key={m} className="rounded-sm bg-accent-soft px-2 font-mono text-[12px] leading-[24px] text-accent">
              {m}
            </span>
          ))}
          {Array.from({ length: Math.max((off ? state.capacity : state.maximum) - state.secure.length, 0) }, (_, k) => (
            <span key={k} className="rounded-sm border border-dashed border-line px-2 font-mono text-[12px] leading-[22px] text-faint">
              –
            </span>
          ))}
        </div>
      </div>
      <CodeTrace lines={config} active={stickyLines} label="running-config" />
      {state.log.length > 0 ? (
        <div className="rounded-md border border-line bg-code px-3 py-2">
          <p className="text-[12px] font-medium leading-[18px] text-faint">syslog / SNMP trap</p>
          <ul className="break-all font-mono text-[11px] leading-[18px] text-warn">
            {state.log.map((l, k) => (
              <li key={k}>{l}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return state.mode === 'off'
        ? { title: 'พอร์ตไม่ได้เปิด Port Security', body: 'switch เรียน Source MAC ของทุก frame ที่เข้ามาโดยไม่จำกัดจำนวนต่อพอร์ต ข้อจำกัดเดียวคือขนาดของ CAM table ทั้งตัว ซึ่งผู้โจมตีใช้เป็นช่องทางของ MAC flooding' }
        : { title: `Port Security: maximum ${state.maximum}, violation ${state.mode}`, body: `พอร์ตรับได้สูงสุด ${state.maximum} MAC address เรียนแบบ ${state.sticky ? 'Sticky (เรียนแล้วบันทึกลง config อัตโนมัติ)' : 'Dynamic (เรียนชั่วคราว)'} และเมื่อมี MAC เกินจำนวนจะทำตาม violation mode` };
    case 'learn':
      return { title: `MAC ${e.mac}: เรียนเป็น secure MAC ตัวที่ ${e.count}`, body: `ยังไม่ถึง maximum (${state.maximum}) จึงรับ MAC นี้และให้ frame ผ่าน${state.sticky ? ' — เพราะเป็น Sticky จึงมีบรรทัดใหม่เพิ่มใน running-config ถ้าบันทึก config รายการนี้จะอยู่ถาวรแม้ reboot' : ' — เป็น Dynamic จึงอยู่ในตารางชั่วคราว หายเมื่อพอร์ต down หรือ reboot'}` };
    case 'pass':
      return { title: `MAC ${e.mac}: ผ่าน`, body: 'เป็น secure MAC ที่พอร์ตรู้จักแล้ว traffic เดิมจึงผ่านตามปกติ' };
    case 'violation': {
      const body = {
        protect: 'Protect: ทิ้ง frame เงียบ ๆ ไม่มี log ไม่เพิ่ม counter และพอร์ตไม่ปิด ผู้ดูแลจึงไม่รู้เลยว่ามีเหตุการณ์เกิดขึ้น — สไลด์แนะนำว่าไม่ควรใช้ Protect เพียงอย่างเดียว',
        restrict: 'Restrict: ทิ้ง frame ที่ผิดปกติ พร้อมส่ง log (SNMP/Syslog) และเพิ่ม violation counter แต่พอร์ตไม่ปิด MAC ที่ถูกต้องยังใช้งานได้ต่อ',
        shutdown: 'Shutdown (ค่า default): ทิ้ง frame ส่ง log และเปลี่ยนพอร์ตเป็น err-disabled ทันที traffic ทั้งหมดบนพอร์ตนี้หยุด รวมถึงของ MAC ที่ถูกต้อง จนกว่าจะกู้คืน',
        off: '',
      }[state.mode];
      return { title: `MAC ${e.mac}: security violation`, body: `พอร์ตมี secure MAC ครบ ${state.maximum} ตัวแล้ว และ ${e.mac} ไม่อยู่ในรายการ · ${body}` };
    }
    case 'down':
      return { title: `MAC ${e.mac}: พอร์ตปิดอยู่`, body: 'พอร์ตเป็น err-disabled จึงไม่รับ frame ใดเลย แม้เป็น MAC ที่ถูกต้อง กู้คืนด้วย shutdown แล้ว no shutdown บน interface หรือตั้ง errdisable recovery cause psecure-violation กับ errdisable recovery interval 60 ให้เปิดกลับเอง' };
    case 'cam-learn':
      return { title: `MAC ${e.mac}: เรียนลง CAM table (${e.count}/${state.capacity})`, body: 'ไม่มีการจำกัดจำนวนต่อพอร์ต switch จึงเรียน Source MAC ปลอมทุกตัวที่ผู้โจมตีส่งมา ตารางค่อย ๆ เต็ม' };
    case 'cam-known':
      return { title: `MAC ${e.mac}: อยู่ในตารางแล้ว`, body: 'รีเซ็ต aging timer ของรายการนี้' };
    case 'cam-full':
      return { title: `MAC ${e.mac}: CAM table เต็ม → fail-open`, body: 'ตารางไม่มีที่ให้เรียน MAC ใหม่ (รวมถึง MAC ของเครื่องจริง) switch จึงเข้าสภาวะ fail-open: flood ทุก frame ที่ไม่รู้ปลายทางออกทุกพอร์ตเหมือน hub ผู้โจมตีจึงดักฟัง traffic ของเครื่องอื่นได้ ป้องกันด้วย Port Security' };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return { tone: 'normal', label: 'เริ่มต้น' };
    case 'violation':
      return { tone: 'error', label: state.mode === 'shutdown' ? 'err-disabled' : 'violation' };
    case 'down':
      return { tone: 'error', label: 'err-disabled' };
    case 'cam-full':
      return { tone: 'error', label: 'fail-open' };
    case 'pass':
    case 'cam-known':
      return { tone: 'done', label: 'ผ่าน' };
    default:
      return { tone: 'active', label: 'เรียน MAC' };
  }
}

const render = (state: State) => <Canvas state={state} />;

export function PortSecuritySim() {
  const first = PRESETS[0]!.value;
  const macs = useParsedText(first.text, parse);
  const [mode, setMode] = useState<Mode>(first.mode);
  const [maximum, setMaximum] = useState(first.maximum);
  const [sticky, setSticky] = useState(first.sticky);
  const initialState = useMemo(() => init(macs.value, mode, maximum, sticky, CAPACITY), [macs.value, mode, maximum, sticky]);

  return (
    <SimulationPlayer
      title="Port Security และ MAC flooding"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar
            presets={PRESETS}
            activeIndex={PRESETS.findIndex((p) => p.value.text === macs.text && p.value.mode === mode && p.value.maximum === maximum && p.value.sticky === sticky)}
            onPick={(p) => {
              setMode(p.mode);
              setMaximum(p.maximum);
              setSticky(p.sticky);
              macs.apply(p.text);
            }}
          />
          <SimTextInput label="Source MAC ของ frame ที่เข้าพอร์ต Fa0/1 ตามลำดับ" hint="MAC แบบย่อ คั่นด้วย , เช่น AA, BB, AA" text={macs.text} error={macs.error} onChange={macs.apply} />
          <SimToggle label="violation mode" value={mode} options={MODES} onChange={setMode} />
          {mode !== 'off' ? (
            <>
              <NumberStepper label="maximum" value={maximum} min={1} max={4} onChange={setMaximum} />
              <SimToggle label="การเรียน MAC" value={sticky ? 'sticky' : 'dynamic'} options={LEARN} onChange={(v) => setSticky(v === 'sticky')} />
            </>
          ) : null}
        </div>
      }
      legend={
        <>
          <span>default: maximum 1, violation shutdown</span>
        </>
      }
    />
  );
}
