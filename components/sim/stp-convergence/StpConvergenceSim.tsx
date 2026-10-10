'use client';

import { useMemo, useState } from 'react';
import { NumberStepper, PresetBar, SimToggle, SimulationPlayer, type SimExplanation, type SimTone } from '@/components/sim/core';
import { init, isDone, step, type Protocol, type State } from './logic';

const PROTOCOLS = [
  { value: 'stp', label: 'STP 802.1D' },
  { value: 'rstp', label: 'RSTP 802.1w' },
] as const;

const PRESETS: { label: string; value: { protocol: Protocol; maxAge: number; forwardDelay: number } }[] = [
  // STP p.20: 20 + 15 + 15 = about 50 seconds
  { label: 'สไลด์ p.20: STP ~50 วินาที', value: { protocol: 'stp', maxAge: 20, forwardDelay: 15 } },
  // STP p.21–22: RSTP
  { label: 'สไลด์ p.22: RSTP', value: { protocol: 'rstp', maxAge: 20, forwardDelay: 15 } },
];

const yes = (on: boolean) => <span className={on ? 'font-semibold text-ok' : 'text-faint'}>{on ? 'ทำ' : 'ไม่ทำ'}</span>;

function Canvas({ state }: { state: State }) {
  const p = state.phases[state.i]!;
  const total = state.phases[state.phases.length - 1]!.to || 1;
  const timed = state.phases.filter((x) => x.to > x.from);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[13px] leading-[26px]">
        <span className={`rounded-md border px-3 font-semibold ${p.tone === 'done' ? 'border-ok bg-ok-soft text-ok' : p.tone === 'error' ? 'border-bad bg-bad-soft text-bad' : 'border-accent bg-accent-soft text-accent'}`}>{p.state}</span>
        <span className="rounded-md border border-line bg-surface px-3 text-muted">
          เวลาหลังลิงก์ล่ม: {state.protocol === 'rstp' ? (p.to === 0 ? '0' : '< 10') : p.to} วินาที
        </span>
      </div>
      {state.protocol === 'stp' ? (
        <div>
          <div className="flex h-9 overflow-hidden rounded-md border border-line" role="img" aria-label={`timeline: ${timed.map((x) => `${x.state} ${x.from}-${x.to}`).join(', ')}`}>
            {timed.map((x) => {
              const idx = state.phases.indexOf(x);
              return (
                <div key={idx} style={{ width: `${((x.to - x.from) / total) * 100}%` }} className={`grid place-items-center border-r border-canvas text-[10px] font-medium leading-3 ${idx === state.i ? 'bg-accent text-accent-ink' : idx < state.i ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-faint'}`}>
                  {x.state}
                  <br />
                  {x.to - x.from}s
                </div>
              );
            })}
          </div>
          <div className="flex justify-between font-mono text-[10px] leading-4 text-faint">
            <span>0</span>
            {timed.map((x) => (
              <span key={x.to}>{x.to}s</span>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-md bg-surface-2 px-3 py-2 text-center text-[12px] leading-5 text-muted">RSTP ไม่รอ timer: Discarding → Learning → Forwarding ด้วย Proposal/Agreement</p>
      )}
      <div className="overflow-hidden rounded-md border border-line">
        <table className="w-full border-collapse text-center text-[13px] leading-[28px]">
          <thead>
            <tr className="bg-surface-2 text-[11px] text-muted">
              <th className="px-2 font-medium">รับ/ส่ง BPDU</th>
              <th className="px-2 font-medium">เรียน MAC</th>
              <th className="px-2 font-medium">ส่ง data frame</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{yes(p.bpdu)}</td>
              <td>{yes(p.learn)}</td>
              <td>{yes(p.forward)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const explain = (state: State): SimExplanation => ({ title: state.phases[state.i]!.title, body: state.phases[state.i]!.body });
const status = (state: State): { tone: SimTone; label: string } => {
  const p = state.phases[state.i]!;
  return state.i === 0 ? { tone: 'normal', label: p.state } : { tone: p.tone, label: p.state };
};
const render = (state: State) => <Canvas state={state} />;

export function StpConvergenceSim() {
  const first = PRESETS[0]!.value;
  const [protocol, setProtocol] = useState<Protocol>(first.protocol);
  const [maxAge, setMaxAge] = useState(first.maxAge);
  const [forwardDelay, setForwardDelay] = useState(first.forwardDelay);
  const initialState = useMemo(() => init(protocol, maxAge, forwardDelay), [protocol, maxAge, forwardDelay]);

  return (
    <SimulationPlayer
      title="STP: Port state และ convergence"
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
            activeIndex={PRESETS.findIndex((p) => p.value.protocol === protocol && p.value.maxAge === maxAge && p.value.forwardDelay === forwardDelay)}
            onPick={(p) => {
              setProtocol(p.protocol);
              setMaxAge(p.maxAge);
              setForwardDelay(p.forwardDelay);
            }}
          />
          <SimToggle label="โพรโทคอล" value={protocol} options={PROTOCOLS} onChange={setProtocol} />
          {protocol === 'stp' ? (
            <>
              <NumberStepper label="Max Age (วินาที)" value={maxAge} min={6} max={40} onChange={setMaxAge} />
              <NumberStepper label="Forward Delay (วินาที)" value={forwardDelay} min={4} max={30} onChange={setForwardDelay} />
            </>
          ) : null}
        </div>
      }
      legend={
        <>
          <span>default: Hello 2, Forward Delay 15, Max Age 20</span>
        </>
      }
    />
  );
}
