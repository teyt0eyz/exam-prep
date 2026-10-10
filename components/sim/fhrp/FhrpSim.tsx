'use client';

import { useMemo, useState } from 'react';
import { NumberStepper, PresetBar, SimToggle, SimulationPlayer, type SimExplanation, type SimTone } from '@/components/sim/core';
import { IP, TERMS, VIP, init, isDone, step, type Config, type Protocol, type Scenario, type State } from './logic';

const PROTOCOLS = [
  { value: 'hsrp', label: 'HSRP' },
  { value: 'vrrp', label: 'VRRP' },
] as const;
const SCENARIOS = [
  { value: 'fail', label: 'router ล่มแล้วกลับมา' },
  { value: 'wan', label: 'WAN ของตัวหลักขาด' },
] as const;
const ONOFF = [
  { value: 'off', label: 'ปิด' },
  { value: 'on', label: 'เปิด' },
] as const;
const DEC = [0, 10, 30, 50].map((v) => ({ value: String(v), label: v === 0 ? 'ไม่ track' : `−${v}` }));

const PRESETS: { label: string; value: Config }[] = [
  // FHRP p.9–10 / IVR p.29: R1 priority raised, preempt on
  { label: 'สไลด์ p.9: HSRP failover', value: { protocol: 'hsrp', p1: 110, p2: 100, preempt: true, scenario: 'fail', decrement: 0 } },
  // FHRP p.7: preempt is off by default in HSRP
  { label: 'สไลด์ p.7: HSRP preempt ปิด', value: { protocol: 'hsrp', p1: 110, p2: 100, preempt: false, scenario: 'fail', decrement: 0 } },
  // FHRP p.11: VRRP master down interval with priority 100
  { label: 'สไลด์ p.11: VRRP 3.609 วินาที', value: { protocol: 'vrrp', p1: 110, p2: 100, preempt: true, scenario: 'fail', decrement: 0 } },
  // IVR p.31: tracking, 120 − 30 = 90 < 100
  { label: 'สไลด์ IVR p.31: tracking', value: { protocol: 'hsrp', p1: 120, p2: 100, preempt: true, scenario: 'wan', decrement: 30 } },
  { label: 'blackhole: ไม่มี tracking', value: { protocol: 'hsrp', p1: 120, p2: 100, preempt: true, scenario: 'wan', decrement: 0 } },
];

function Canvas({ state }: { state: State }) {
  const c = state.config;
  const p = state.phases[state.i]!;
  const t = TERMS[c.protocol];
  return (
    <div className="flex flex-col gap-3">
      <div className={`rounded-md border px-3 py-2 text-center font-mono text-[12px] leading-5 ${p.reachable ? 'border-ok bg-ok-soft text-ok' : 'border-bad bg-bad-soft text-bad'}`}>
        Internet / WAN — {p.reachable ? 'client ออกได้' : 'client ออกไม่ได้'}
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {(['R1', 'R2'] as const).map((r) => {
          const role = !p.up[r] ? 'ล่ม' : p.forwarder === r ? t.active : t.standby;
          return (
            <li key={r} className={`rounded-md border p-2 ${!p.up[r] ? 'border-bad bg-bad-soft' : p.forwarder === r ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}>
              <p className="flex items-center justify-between font-mono text-[13px] font-semibold leading-5">
                {r}
                <span className={`rounded-sm px-1.5 text-[10px] font-medium ${p.forwarder === r && p.up[r] ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}>{role}</span>
              </p>
              <p className="font-mono text-[11px] leading-[18px] text-muted">{IP[r]}</p>
              <p className="font-mono text-[12px] leading-5 text-muted">
                priority <b className="text-ink">{p.prio[r]}</b>
              </p>
              <p className={`font-mono text-[11px] leading-[18px] ${p.wan[r] ? 'text-ok' : 'text-bad'}`}>WAN: {p.wan[r] ? 'up' : 'down'}</p>
            </li>
          );
        })}
      </ul>
      <div className="rounded-md border border-line bg-surface px-3 py-2 font-mono text-[11px] leading-[18px] text-muted">
        <p>
          Virtual IP <b className="text-ink">{VIP}</b> · Virtual MAC <b className="text-ink">{t.mac}</b>
        </p>
        <p>
          client 192.168.10.100 → gateway {VIP} → {p.forwarder ?? 'ไม่มี router รับ'}
        </p>
        <p>
          {t.hello} → {t.mcast}
        </p>
      </div>
    </div>
  );
}

const explain = (state: State): SimExplanation => ({ title: state.phases[state.i]!.title, body: state.phases[state.i]!.body });
function status(state: State): { tone: SimTone; label: string } {
  const p = state.phases[state.i]!;
  return { tone: state.i === 0 ? 'normal' : p.tone, label: p.reachable ? `${p.forwarder} forward` : p.forwarder ? 'blackhole' : 'ขาดช่วง' };
}
const render = (state: State) => <Canvas state={state} />;

export function FhrpSim() {
  const [config, setConfig] = useState<Config>(PRESETS[0]!.value);
  const initialState = useMemo(() => init(config), [config]);
  const set = <K extends keyof Config>(key: K, value: Config[K]) => setConfig((c) => ({ ...c, [key]: value }));

  return (
    <SimulationPlayer
      title="FHRP failover"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => JSON.stringify(p.value) === JSON.stringify(config))} onPick={setConfig} />
          <SimToggle label="โพรโทคอล" value={config.protocol} options={PROTOCOLS} onChange={(v: Protocol) => set('protocol', v)} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberStepper label="priority ของ R1" value={config.p1} min={50} max={250} onChange={(v) => set('p1', v)} />
            <NumberStepper label="priority ของ R2" value={config.p2} min={50} max={250} onChange={(v) => set('p2', v)} />
          </div>
          <SimToggle label="preempt" value={config.preempt ? 'on' : 'off'} options={ONOFF} onChange={(v) => set('preempt', v === 'on')} />
          <SimToggle label="เหตุการณ์" value={config.scenario} options={SCENARIOS} onChange={(v: Scenario) => set('scenario', v)} />
          {config.scenario === 'wan' ? <SimToggle label="tracking decrement" value={String(config.decrement)} options={DEC} onChange={(v) => set('decrement', Number(v))} /> : null}
        </div>
      }
      legend={
        <>
          <span>default priority 100</span>
          <span>HSRP: Hello 3 / Hold 10 · VRRP: 1 / ~3.6</span>
        </>
      }
    />
  );
}
