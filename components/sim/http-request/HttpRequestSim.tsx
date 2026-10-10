'use client';

import { useMemo, useState } from 'react';
import { CodeTrace, PresetBar, SimTextInput, SimToggle, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { init, isDone, parseUrl, step, type Outcome, type State } from './logic';

const OUTCOMES = [
  { value: '200', label: '200' },
  { value: '301', label: '301' },
  { value: '404', label: '404' },
  { value: '500', label: '500' },
] as const;
const CACHE = [
  { value: 'miss', label: 'ยังไม่รู้ IP' },
  { value: 'hit', label: 'มีใน cache' },
] as const;

const PRESETS: { label: string; value: { url: string; outcome: Outcome; cached: boolean } }[] = [
  // HTTP p.31–33: www.example.com → 3.165.82.61, then the eight steps
  { label: 'สไลด์ p.33: เปิดเว็บครั้งแรก', value: { url: 'https://www.example.com/', outcome: '200', cached: false } },
  // HTTP p.21–23: the MDN conversation
  { label: 'สไลด์ p.21: GET / ของ MDN', value: { url: 'http://developer.mozilla.org/', outcome: '200', cached: true } },
  // HTTP p.25–26: status code groups
  { label: 'สไลด์ p.25: 404 Not Found', value: { url: 'https://www.example.com/no-such-page', outcome: '404', cached: true } },
  { label: 'สไลด์ p.25: 301 redirect', value: { url: 'http://www.example.com/old', outcome: '301', cached: true } },
];

const LABEL: Record<string, string> = { url: 'URL', cache: 'cache', dns: 'DNS', tcp: 'TCP', request: 'request', response: 'response', redirect: 'redirect', parse: 'parse', render: 'render', close: 'ปิด' };

function Canvas({ state }: { state: State }) {
  const s = state.stages[state.i];
  // keep the last message on screen while later stages talk about it
  const shown = [...state.stages.slice(0, state.i + 1)].reverse().find((x) => x.message)?.message;
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-wrap justify-center gap-1.5" aria-label="ขั้นตอนของ request">
        {state.stages.map((x, k) => (
          <li key={k} aria-current={k === state.i ? 'step' : undefined} className={`rounded-sm border px-2 font-mono text-[11px] leading-[24px] ${k === state.i ? (x.tone === 'error' ? 'border-bad bg-bad text-accent-ink' : 'border-accent bg-accent text-accent-ink') : k < state.i ? 'border-line bg-surface-2 text-muted' : 'border-line bg-surface text-faint'}`}>
            {k + 1}. {LABEL[x.key]}
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center font-mono text-[12px]">
        <div className={`rounded-md border px-2 py-2 ${s && ['url', 'cache', 'parse', 'render'].includes(s.key) ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted'}`}>Client (browser)</div>
        <span className="text-faint">{s?.key === 'request' || s?.key === 'tcp' || s?.key === 'dns' ? '──▶' : s?.key === 'response' || s?.key === 'redirect' ? '◀──' : '· · ·'}</span>
        <div className={`rounded-md border px-2 py-2 ${s && ['response', 'redirect'].includes(s.key) ? (s.tone === 'error' ? 'border-bad bg-bad-soft text-bad' : 'border-accent bg-accent-soft text-accent') : 'border-line bg-surface text-muted'}`}>{s?.key === 'dns' ? 'DNS server' : 'Web server'}</div>
      </div>
      {shown ? <CodeTrace lines={shown.lines.map((l) => l || ' ')} active={s?.message === shown ? shown.active : []} label={shown.label} /> : null}
    </div>
  );
}

function explain(state: State): SimExplanation {
  const s = state.stages[state.i];
  if (!s) return { title: 'พิมพ์ URL แล้วกด Enter', body: 'ระหว่างกด Enter กับหน้าเว็บปรากฏ มีหลายอย่างเกิดขึ้นตามลำดับ: หา IP address, เปิด connection, ส่ง request, รับ response แล้วจึง render กด step เพื่อดูทีละขั้น' };
  return { title: s.title, body: s.body };
}
function status(state: State): { tone: SimTone; label: string } {
  const s = state.stages[state.i];
  if (!s) return { tone: 'normal', label: 'เริ่มต้น' };
  return { tone: s.tone, label: LABEL[s.key]! };
}
const render = (state: State) => <Canvas state={state} />;

export function HttpRequestSim() {
  const first = PRESETS[0]!.value;
  const url = useParsedText(first.url, parseUrl);
  const [outcome, setOutcome] = useState<Outcome>(first.outcome);
  const [cached, setCached] = useState(first.cached);
  const initialState = useMemo(() => init(url.value, outcome, cached), [url.value, outcome, cached]);

  return (
    <SimulationPlayer
      title="ชีวิตของ HTTP request"
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
            activeIndex={PRESETS.findIndex((p) => p.value.url === url.text && p.value.outcome === outcome && p.value.cached === cached)}
            onPick={(p) => {
              setOutcome(p.outcome);
              setCached(p.cached);
              url.apply(p.url);
            }}
          />
          <SimTextInput label="URL" hint="ขึ้นต้นด้วย http:// หรือ https:// — ลองเปลี่ยน protocol แล้วดู port" text={url.text} error={url.error} onChange={url.apply} rows={1} />
          <SimToggle label="IP ของ host นี้" value={cached ? 'hit' : 'miss'} options={CACHE} onChange={(v) => setCached(v === 'hit')} />
          <SimToggle label="status code ที่ server ตอบ" value={outcome} options={OUTCOMES} onChange={setOutcome} />
        </div>
      }
      legend={
        <>
          <span>HTTP port 80 · HTTPS port 443</span>
          <span>2xx สำเร็จ · 3xx redirect · 4xx ฝั่งผู้ขอ · 5xx ฝั่ง server</span>
        </>
      }
    />
  );
}
