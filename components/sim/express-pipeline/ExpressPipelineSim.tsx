'use client';

import { useMemo } from 'react';
import { PresetBar, SimTextInput, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { STAGES, STAGE_CODE, TOKEN, init, isDone, parseRequest, step, type Stage, type State } from './logic';

const PRESETS = [
  { label: 'POST สำเร็จ → 201', value: `POST /users\nAuthorization: ${TOKEN}\nbody: {"name":"Ann"}` },
  { label: 'ไม่มี token → 401', value: 'POST /users\nbody: {"name":"Ann"}' },
  { label: 'ข้อมูลไม่ครบ → 400', value: `POST /users\nAuthorization: ${TOKEN}\nbody: {"email":"a@b.c"}` },
  { label: 'GET id ที่ไม่มี → 404', value: 'GET /users/9' },
  { label: 'ไม่มี route → 404', value: 'GET /products' },
];

const WHY: Record<Stage, string> = {
  json: 'express.json() อ่าน body ที่เป็นข้อความ JSON แล้วแปลงเป็น object ไว้ใน req.body ต้องวางก่อนทุก route ที่ใช้ req.body',
  logger: 'logger เป็น middleware ที่เขียนเอง: บันทึก method กับ path แล้วเรียก next() เสมอ ไม่เคยตอบ response',
  auth: 'requireAuth ตรวจ header Authorization: ไม่มี token ตอบ 401 (ยังไม่ได้ยืนยันตัวตน) มี token แต่ไม่ถูกต้องหรือไม่มีสิทธิ์ตอบ 403',
  validate: 'validateUser ตรวจข้อมูลที่ client ส่งมาก่อนถึง handler ถ้าไม่ครบตอบ 400 Bad Request เพราะความผิดอยู่ที่ฝั่ง client',
  route: 'route handler คือปลายทางที่ method และ path ตรงกัน ทำงานกับข้อมูลแล้วตอบ response พร้อม status code ที่เหมาะสม',
  notFound: 'middleware ตัวสุดท้ายที่ไม่มี path: ถ้า request มาถึงตรงนี้แปลว่าไม่มี route ใดรับ จึงตอบ 404',
};

function Canvas({ state }: { state: State }) {
  const res = state.response;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-line bg-code px-3 py-2 font-mono text-[12px] leading-6">
        <p><b>{state.req.method}</b> {state.req.path}</p>
        <p className="text-muted">Authorization: {state.req.auth || <span className="text-faint">(ไม่มี)</span>}</p>
        <p className="break-all text-muted">body: {state.req.rawBody || <span className="text-faint">(ไม่มี)</span>}</p>
        <p className="break-all text-muted">req.body: {state.parsed ?? <span className="text-faint">undefined</span>}</p>
      </div>
      <ol className="flex flex-col gap-1.5">
        {STAGES.map((stage, i) => {
          const here = i === state.at;
          const passed = i < state.at;
          const tone = here ? (state.note === 'respond' ? (res && res.status >= 400 ? 'border-bad bg-bad-soft text-bad' : 'border-ok bg-ok-soft text-ok') : 'border-accent bg-accent-soft text-accent') : passed ? 'border-line bg-surface text-muted' : 'border-dashed border-line text-faint';
          return (
            <li key={stage} className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 font-mono text-[12px] leading-5 ${tone}`}>
              <span className={here ? 'font-semibold' : ''}>{i + 1}. {STAGE_CODE[stage]}</span>
              <span className="flex-none">{here ? (state.note === 'respond' ? 'ตอบกลับ' : state.note === 'skip' ? 'ข้าม → next()' : 'next()') : passed ? '✓' : ''}</span>
            </li>
          );
        })}
      </ol>
      <div className={`rounded-md border px-3 py-2 font-mono text-[13px] leading-6 ${res ? (res.status >= 400 ? 'border-bad bg-bad-soft' : 'border-ok bg-ok-soft') : 'border-line bg-surface'}`}>
        <p className="font-sans text-[12px] font-medium leading-[18px] text-faint">Response</p>
        {res ? (
          <>
            <p className={`font-semibold ${res.status >= 400 ? 'text-bad' : 'text-ok'}`}>HTTP {res.status}</p>
            <p className="break-all">{res.body || '(ไม่มี body)'}</p>
          </>
        ) : (
          <p className="text-faint">(ยังไม่มีใครตอบ)</p>
        )}
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  if (state.at < 0) return { title: 'request เข้ามาที่ server', body: 'Express ส่ง request ผ่าน middleware ตามลำดับที่เขียน app.use ไว้ แต่ละตัวเลือกได้สองทาง: เรียก next() เพื่อส่งต่อ หรือตอบ response เพื่อจบตรงนั้น' };
  const stage = STAGES[state.at]!;
  const res = state.response;
  if (state.note === 'respond' && res) {
    const meaning: Record<number, string> = { 200: 'สำเร็จ', 201: 'สร้าง resource ใหม่สำเร็จ', 204: 'สำเร็จ ไม่มีข้อมูลส่งกลับ', 400: 'request ไม่ถูกต้อง', 401: 'ยังไม่ได้ยืนยันตัวตน', 403: 'ไม่มีสิทธิ์', 404: 'ไม่พบ' };
    return { title: `${STAGE_CODE[stage]} ตอบ ${res.status}`, body: `${WHY[stage]} — ${res.status} หมายถึง ${meaning[res.status] ?? ''} เมื่อมีการตอบ response แล้ว ขั้นที่เหลือด้านล่างจะไม่ถูกเรียก` };
  }
  if (state.note === 'skip') {
    const reason: Record<Stage, string> = {
      json: 'request นี้ไม่มี body จึงไม่มีอะไรให้แปลง req.body เป็น object ว่าง',
      logger: '',
      auth: 'ระบบนี้ให้อ่านข้อมูล (GET) ได้โดยไม่ต้องล็อกอิน จึงไม่ตรวจ token',
      validate: 'route นี้ไม่ได้รับข้อมูลใหม่ จึงไม่มีอะไรให้ตรวจ',
      route: 'ไม่มี route ที่ method และ path ตรงกับ request นี้',
      notFound: '',
    };
    return { title: `${STAGE_CODE[stage]}: ไม่เกี่ยวกับ request นี้`, body: `${reason[stage]} จึงเรียก next() ส่งต่อ` };
  }
  return { title: `${STAGE_CODE[stage]} → next()`, body: WHY[stage] };
}

function status(state: State): { tone: SimTone; label: string } {
  if (state.at < 0) return { tone: 'normal', label: 'เริ่มต้น' };
  const res = state.response;
  if (res) return { tone: res.status >= 400 ? 'error' : 'done', label: `HTTP ${res.status}` };
  return { tone: 'active', label: 'next()' };
}
const render = (state: State) => <Canvas state={state} />;

export function ExpressPipelineSim() {
  const request = useParsedText(PRESETS[0]!.value, parseRequest);
  const initialState = useMemo(() => init(request.value), [request.value]);
  return (
    <SimulationPlayer
      title="Request ผ่าน middleware ของ Express"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => p.value === request.text)} onPick={request.apply} />
          <SimTextInput label="Request (แก้ได้)" hint={`บรรทัดแรก: METHOD /path · ตามด้วย Authorization: ${TOKEN} และ body: {"name":"Ann"} (ไม่บังคับ) · มี user id 1 และ 2`} text={request.text} error={request.error} onChange={request.apply} rows={3} />
        </div>
      }
      legend={
        <>
          <span className="text-accent">สีเน้น = ส่งต่อด้วย next()</span>
          <span className="text-ok">เขียว = ตอบสำเร็จ</span>
          <span className="text-bad">แดง = ตอบ error</span>
        </>
      }
    />
  );
}
