'use client';

import { useMemo, useState } from 'react';
import { CodeTrace, PresetBar, SimToggle, SimulationPlayer, type SimExplanation, type SimTone } from '@/components/sim/core';
import { ACL, HOSTS, SERVICES, init, isDone, step, type Config, type HostId, type Service, type State } from './logic';

const SRC = [
  { value: 'staff', label: 'Staff (VLAN 10)' },
  { value: 'kali', label: 'Kali (VLAN 99)' },
] as const;
const DST = [
  { value: 'server', label: 'Server (VLAN 20)' },
  { value: 'kali', label: 'Kali (VLAN 99)' },
  { value: 'staff', label: 'Staff (VLAN 10)' },
] as const;
const SVC = (Object.keys(SERVICES) as Service[]).map((k) => ({ value: k, label: SERVICES[k] }));
const ONOFF = [
  { value: 'off', label: 'ไม่มี ACL' },
  { value: 'on', label: 'มี ACL' },
] as const;

const PRESETS: { label: string; value: Config }[] = [
  // IVR p.5–6: plain ROAS
  { label: 'สไลด์ p.6: ข้าม VLAN', value: { src: 'staff', dst: 'server', service: 'icmp', acl: false } },
  // IVR p.15–16: only TCP 80/443 from VLAN 10 to the web server
  { label: 'สไลด์ p.15: ACL ยอม TCP 80', value: { src: 'staff', dst: 'server', service: 'http', acl: true } },
  { label: 'สไลด์ p.15: ACL ทิ้ง SSH', value: { src: 'staff', dst: 'server', service: 'ssh', acl: true } },
  // IVR p.19: fping from Kali is not covered by the ACL on .10
  { label: 'สไลด์ p.19: ping จาก Kali', value: { src: 'kali', dst: 'server', service: 'icmp', acl: true } },
];

const PATH = ['ต้นทาง', 'Switch', 'trunk ↑', 'Router', 'trunk ↓', 'Switch', 'ปลายทาง'];

function Canvas({ state }: { state: State }) {
  const c = state.config;
  const s = state.stages[state.i];
  const at = s?.at ?? 0;
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-7 gap-0.5 text-center text-[9px] leading-3" aria-label="เส้นทางของ packet">
        {PATH.map((n, k) => (
          <li key={k} aria-current={k === at ? 'step' : undefined} className={`rounded-sm border px-0.5 py-1.5 ${k === at ? (s?.tone === 'error' ? 'border-bad bg-bad-soft text-bad' : s?.tone === 'done' ? 'border-ok bg-ok-soft text-ok' : 'border-accent bg-accent-soft text-accent') : 'border-line bg-surface text-muted'}`}>
            {n}
          </li>
        ))}
      </ol>
      <p className="px-1 font-mono text-[12px] leading-5 text-muted">
        {HOSTS[c.src].ip} → {HOSTS[c.dst].ip} · {SERVICES[c.service]} · frame: <b className={s && s.tag !== null ? 'text-accent' : 'text-ink'}>{s && s.tag !== null ? `tag VID ${s.tag}` : 'untagged'}</b>
      </p>
      <div className="overflow-x-auto rounded-md border border-line">
        <p className="bg-surface-2 px-2 text-[12px] font-medium leading-7 text-muted">Router: sub-interface และ routing table</p>
        <table className="w-full min-w-max border-collapse text-left font-mono text-[11px] leading-[24px]">
          <tbody>
            {(Object.keys(HOSTS) as HostId[]).map((h) => {
              const v = HOSTS[h];
              return (
                <tr key={h} className={`border-t border-line ${s?.sub === v.vlan ? 'bg-accent-soft' : ''}`}>
                  <td className="px-2">C</td>
                  <td className="px-2">{v.net}</td>
                  <td className="px-2">Gi0/0/0.{v.vlan}</td>
                  <td className="px-2 text-muted">dot1Q {v.vlan}</td>
                  <td className="px-2 text-muted">{v.gw}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {c.acl ? <CodeTrace lines={ACL} active={s?.aclLine !== undefined ? [s.aclLine] : []} label="Extended ACL (ผูกขาเข้า Gi0/0/0.10)" /> : null}
    </div>
  );
}

function explain(state: State): SimExplanation {
  const s = state.stages[state.i];
  const c = state.config;
  if (c.src === c.dst) return { title: 'ต้นทางกับปลายทางเป็นเครื่องเดียวกัน', body: 'เลือกปลายทางที่อยู่คนละ VLAN กับต้นทาง' };
  if (!s) return { title: 'Router-on-a-Stick', body: 'router ต่อกับ switch ด้วย trunk เส้นเดียว และมี sub-interface หนึ่งตัวต่อ VLAN แต่ละตัวถือ IP ของ default gateway ของ VLAN นั้น ดูว่า packet ข้าม VLAN ถูกใส่และลอก tag ที่ใดบ้าง' };
  return { title: s.title, body: s.body };
}

function status(state: State): { tone: SimTone; label: string } {
  const s = state.stages[state.i];
  if (!s) return { tone: 'normal', label: 'เริ่มต้น' };
  if (isDone(state)) return { tone: s.tone, label: s.tone === 'done' ? 'ส่งถึง' : 'ACL drop' };
  return { tone: s.tone, label: s.aclLine !== undefined ? 'ตรวจ ACL' : s.tag !== null ? `tag ${s.tag}` : 'Layer 3' };
}

const render = (state: State) => <Canvas state={state} />;

export function RoasSim() {
  const [config, setConfig] = useState<Config>(PRESETS[0]!.value);
  const safe = useMemo(() => (config.src === config.dst ? { ...config, dst: config.src === 'server' ? ('staff' as const) : ('server' as const) } : config), [config]);
  const initialState = useMemo(() => init(safe), [safe]);

  return (
    <SimulationPlayer
      title="Router-on-a-Stick"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => JSON.stringify(p.value) === JSON.stringify(config))} onPick={setConfig} />
          <SimToggle label="ต้นทาง" value={config.src as 'staff' | 'kali'} options={SRC} onChange={(v) => setConfig((c) => ({ ...c, src: v, dst: c.dst === v ? 'server' : c.dst }))} />
          <SimToggle label="ปลายทาง" value={safe.dst} options={DST.filter((d) => d.value !== config.src)} onChange={(v) => setConfig((c) => ({ ...c, dst: v }))} />
          <SimToggle label="บริการ" value={config.service} options={SVC} onChange={(v) => setConfig((c) => ({ ...c, service: v }))} />
          <SimToggle label="Extended ACL" value={config.acl ? 'on' : 'off'} options={ONOFF} onChange={(v) => setConfig((c) => ({ ...c, acl: v === 'on' }))} />
        </div>
      }
      legend={
        <>
          <span>C = connected</span>
          <span>trunk เส้นเดียว ใช้ทั้งขาขึ้นและขาลง</span>
        </>
      }
    />
  );
}
