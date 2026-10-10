'use client';

import { useMemo, useState } from 'react';
import { PresetBar, SimTextInput, SimToggle, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { CALLBACKS, init, isDone, parse, step, type Method, type State } from './logic';

const METHODS = [
  { value: 'map', label: 'map' },
  { value: 'filter', label: 'filter' },
  { value: 'find', label: 'find' },
  { value: 'reduce', label: 'reduce' },
] as const;

const PRESETS: { label: string; value: { text: string; method: Method; cb: string } }[] = [
  // Array p.5: numbers.map(el => el + 1000)
  { label: 'สไลด์ p.5: map', value: { text: '10, 12, 5, 25, 30', method: 'map', cb: 'plus' } },
  // Array p.6: numbers.filter(e => e > 4)
  { label: 'สไลด์ p.6: filter', value: { text: '1, 2, 3, 4, 5, 6, 7', method: 'filter', cb: 'gt4' } },
  // Array p.7: find stops when the criteria is met
  { label: 'สไลด์ p.7: find', value: { text: '1, 2, 3, 4, 5, 6, 7', method: 'find', cb: 'ge4' } },
  // Array p.7–8: reduce with initial value 0
  { label: 'สไลด์ p.7: reduce ผลรวม', value: { text: '2, 4, 8, 16', method: 'reduce', cb: 'sum' } },
  { label: 'สไลด์ p.7: reduce ค่าเฉลี่ย', value: { text: '2, 4, 8, 16', method: 'reduce', cb: 'avg' } },
];

const cellCls = 'grid h-9 min-w-9 place-items-center rounded-sm border px-1.5 font-mono text-[13px]';

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const cur = e.kind === 'visit' ? e.idx : -1;
  const call = `${state.method}(${state.callback.code}${state.method === 'reduce' ? `, ${state.callback.initial}` : ''})`;
  return (
    <div className="flex flex-col gap-3">
      <p className="overflow-x-auto whitespace-nowrap rounded-md bg-code px-3 py-2 font-mono text-[12px] leading-5 text-ink">numbers.{call}</p>
      <div>
        <p className="mb-1 text-[12px] leading-4 text-faint">numbers (array เดิม ไม่ถูกแก้)</p>
        <div className="flex flex-wrap gap-1.5">
          {state.array.map((n, k) => (
            <span key={k} className={`${cellCls} ${k === cur ? 'border-accent bg-accent-soft font-semibold text-accent' : k < state.i ? 'border-line bg-surface-2 text-muted' : 'border-line bg-surface text-ink'}`}>
              {n}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[12px] leading-4 text-faint">{state.method === 'reduce' ? 'acc (ค่าสะสม)' : state.method === 'find' ? 'ผลของ find' : 'array ใหม่ที่กำลังสร้าง'}</p>
        <div className="flex min-h-9 flex-wrap items-center gap-1.5">
          {state.method === 'reduce' ? (
            <span className={`${cellCls} border-ok bg-ok-soft font-semibold text-ok`}>{state.acc}</span>
          ) : state.method === 'find' ? (
            <span className={`${cellCls} ${state.found !== undefined ? 'border-ok bg-ok-soft font-semibold text-ok' : 'border-line bg-surface text-faint'}`}>{state.found ?? (state.finished ? 'undefined' : '…')}</span>
          ) : state.out.length === 0 ? (
            <span className="font-mono text-[13px] text-faint">[ ]</span>
          ) : (
            state.out.map((n, k) => (
              <span key={k} className={`${cellCls} ${k === state.out.length - 1 && e.kind === 'visit' && (state.method === 'map' || e.result === true) ? 'border-ok bg-ok-soft font-semibold text-ok' : 'border-line bg-surface text-ink'}`}>
                {n}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  const m = state.method;
  if (e.kind === 'init') {
    const intro: Record<Method, string> = {
      map: 'map เรียกฟังก์ชันที่เราส่งให้กับทุก element ตามลำดับ แล้วนำค่าที่ฟังก์ชัน return มาเรียงเป็น array ใหม่ที่ยาวเท่าเดิม',
      filter: 'filter เรียกฟังก์ชันกับทุก element ถ้าฟังก์ชัน return true จะเก็บ element นั้นไว้ใน array ใหม่ ถ้า false จะข้าม',
      find: 'find เรียกฟังก์ชันกับ element ทีละตัว และหยุดทันทีเมื่อฟังก์ชัน return true แล้วคืน element ตัวนั้นตัวเดียว',
      reduce: `reduce ส่งค่าสะสม (acc) กับ element ปัจจุบันให้ฟังก์ชัน ค่าที่ return กลายเป็น acc ของรอบถัดไป เริ่มที่ initial value = ${state.callback.initial}`,
    };
    return { title: `numbers.${m}()`, body: intro[m] };
  }
  if (e.kind === 'end') {
    if (m === 'map') return { title: `ได้ array ใหม่ [${state.out.join(', ')}]`, body: 'map คืน array ใหม่ที่มีจำนวน element เท่าเดิม array เดิมไม่ถูกแก้ จึงใช้คู่กับ const ได้ และเป็นวิธีที่ React ใช้แปลงข้อมูลเป็นรายการของ element' };
    if (m === 'filter') return { title: `ได้ array ใหม่ [${state.out.join(', ')}]`, body: `filter คืน array ใหม่ที่มีเฉพาะ element ที่ผ่านเงื่อนไข (${state.out.length} จาก ${state.array.length} ตัว) อาจเป็น array ว่างได้ และ array เดิมไม่ถูกแก้` };
    if (m === 'find') return e.found ? { title: `find คืน ${state.found}`, body: `find คืน element ตัวแรกที่ผ่านเงื่อนไขเพียงตัวเดียว (ไม่ใช่ array) และไม่ดู element ที่เหลืออีก ${state.array.length - state.i} ตัว` } : { title: 'find คืน undefined', body: 'ไม่มี element ใดผ่านเงื่อนไข find จึงคืน undefined (ต่างจาก filter ที่จะคืน array ว่าง)' };
    return { title: `reduce คืน ${state.acc}`, body: 'เมื่อผ่านครบทุก element ค่า acc สุดท้ายคือผลลัพธ์ของ reduce ซึ่งเป็นค่าเดียว (จะเป็นตัวเลข string หรือ object ก็ได้ ขึ้นกับ initial value)' };
  }
  const head = `idx ${e.idx}: el = ${e.el}`;
  if (m === 'map') return { title: `${head} → ${e.result}`, body: `ฟังก์ชันได้รับ el = ${e.el} และ return ${e.result} ค่านี้ถูกใส่ลงตำแหน่ง ${e.idx} ของ array ใหม่` };
  if (m === 'filter') return { title: `${head} → ${e.result}`, body: e.result ? `เงื่อนไขเป็น true จึงเก็บ ${e.el} ไว้ใน array ใหม่` : `เงื่อนไขเป็น false จึงไม่เก็บ ${e.el}` };
  if (m === 'find') return { title: `${head} → ${e.result}`, body: e.result ? `เงื่อนไขเป็น true: พบแล้ว find หยุดทันทีและจะคืน ${e.el}` : 'เงื่อนไขเป็น false จึงไปดูตัวถัดไป' };
  return { title: `${head}, acc = ${e.accBefore} → ${e.result}`, body: `ฟังก์ชันได้รับ acc = ${e.accBefore} และ el = ${e.el} แล้ว return ${e.result} ซึ่งกลายเป็น acc ของรอบถัดไป` };
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  if (e.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (e.kind === 'end') return { tone: state.method === 'find' && !e.found ? 'waiting' : 'done', label: 'ผลลัพธ์' };
  if (state.method === 'filter' || state.method === 'find') return { tone: e.result ? 'done' : 'waiting', label: String(e.result) };
  return { tone: 'active', label: `idx ${e.idx}` };
}
const render = (state: State) => <Canvas state={state} />;

export function ArrayMethodsSim() {
  const first = PRESETS[0]!.value;
  const numbers = useParsedText(first.text, parse);
  const [method, setMethod] = useState<Method>(first.method);
  const [cb, setCb] = useState(first.cb);
  const callback = CALLBACKS[method].find((c) => c.id === cb) ?? CALLBACKS[method][0]!;
  const initialState = useMemo(() => init(numbers.value, method, callback), [numbers.value, method, callback]);

  return (
    <SimulationPlayer
      title="Array: map, filter, find, reduce"
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
            activeIndex={PRESETS.findIndex((p) => p.value.text === numbers.text && p.value.method === method && p.value.cb === callback.id)}
            onPick={(p) => {
              setMethod(p.method);
              setCb(p.cb);
              numbers.apply(p.text);
            }}
          />
          <SimTextInput label="numbers (คั่นด้วย ,)" hint="แก้ตัวเลขได้ แล้ว simulation เริ่มใหม่" text={numbers.text} error={numbers.error} onChange={numbers.apply} rows={1} />
          <SimToggle
            label="method"
            value={method}
            options={METHODS}
            onChange={(m) => {
              setMethod(m);
              setCb(CALLBACKS[m][0]!.id);
            }}
          />
          <SimToggle label="ฟังก์ชันที่ส่งให้" value={callback.id} options={CALLBACKS[method].map((c) => ({ value: c.id, label: c.code }))} onChange={setCb} />
        </div>
      }
      legend={
        <>
          <span>map / filter คืน array ใหม่</span>
          <span>find คืนตัวเดียว · reduce คืนค่าเดียว</span>
        </>
      }
    />
  );
}
