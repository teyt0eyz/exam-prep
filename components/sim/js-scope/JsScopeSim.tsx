'use client';

import { useMemo, useState } from 'react';
import { CodeTrace, PresetBar, SimToggle, SimulationPlayer, type SimExplanation, type SimTone } from '@/components/sim/core';
import { init, isDone, step, type Keyword, type Scenario, type State } from './logic';

const KEYWORDS = [
  { value: 'var', label: 'var' },
  { value: 'let', label: 'let' },
  { value: 'const', label: 'const' },
] as const;
const SCENARIOS = [
  { value: 'scope', label: 'Scope' },
  { value: 'redeclare', label: 'Redeclaration' },
  { value: 'reassign', label: 'Reassignment' },
  { value: 'init', label: 'Initialization' },
] as const;

const PRESETS: { label: string; value: { scenario: Scenario; keyword: Keyword } }[] = [
  // Variable p.3: "var is globally and function scoped"
  { label: 'สไลด์ p.3: Play with var', value: { scenario: 'scope', keyword: 'var' } },
  // Variable p.4: "let and const is block scoped"
  { label: 'สไลด์ p.4: Play with let', value: { scenario: 'scope', keyword: 'let' } },
  // Variable p.5
  { label: 'สไลด์ p.5: var ประกาศซ้ำ', value: { scenario: 'redeclare', keyword: 'var' } },
  { label: 'สไลด์ p.5: const กำหนดค่าใหม่', value: { scenario: 'reassign', keyword: 'const' } },
  { label: 'สไลด์ p.5: const ไม่มีค่าเริ่มต้น', value: { scenario: 'init', keyword: 'const' } },
];

function Canvas({ state }: { state: State }) {
  return (
    <div className="flex flex-col gap-3">
      <CodeTrace lines={state.lines.map((l) => l.code || ' ')} active={state.at >= 0 ? [state.at] : []} label="script.js" startAt={1} />
      <div className="rounded-md border border-line bg-code px-3 py-2">
        <p className="text-[12px] font-medium leading-[18px] text-faint">console</p>
        {state.output.length === 0 ? <p className="font-mono text-[12px] leading-5 text-faint">(ยังไม่มี output)</p> : null}
        <ul className="font-mono text-[12px] leading-5">
          {state.output.map((o, k) => (
            <li key={k} className={/Error/.test(o) ? 'break-words text-bad' : 'text-ink'}>
              {o}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const run = state.lines[state.at]?.run;
  if (!run) return { title: 'เทียบ var, let และ const', body: 'สามคำนี้ใช้ประกาศตัวแปรเหมือนกัน แต่ต่างกันสี่เรื่อง: scope (ใช้ได้ที่ใด), redeclaration (ประกาศซ้ำ), reassignment (กำหนดค่าใหม่) และ initialization (ค่าเริ่มต้น) เลือกเรื่องและ keyword แล้วไล่ทีละบรรทัด' };
  return { title: run.title, body: run.body };
}
function status(state: State): { tone: SimTone; label: string } {
  const run = state.lines[state.at]?.run;
  if (!run) return { tone: 'normal', label: 'เริ่มต้น' };
  return run.ok ? { tone: run.output ? 'done' : 'active', label: run.output ? 'พิมพ์ค่า' : 'ทำงาน' } : { tone: 'error', label: 'Error' };
}
const render = (state: State) => <Canvas state={state} />;

export function JsScopeSim() {
  const [scenario, setScenario] = useState<Scenario>(PRESETS[0]!.value.scenario);
  const [keyword, setKeyword] = useState<Keyword>(PRESETS[0]!.value.keyword);
  const initialState = useMemo(() => init(scenario, keyword), [scenario, keyword]);

  return (
    <SimulationPlayer
      title="var, let และ const"
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
            activeIndex={PRESETS.findIndex((p) => p.value.scenario === scenario && p.value.keyword === keyword)}
            onPick={(p) => {
              setScenario(p.scenario);
              setKeyword(p.keyword);
            }}
          />
          <SimToggle label="เรื่อง" value={scenario} options={SCENARIOS} onChange={setScenario} />
          <SimToggle label="keyword" value={keyword} options={KEYWORDS} onChange={setKeyword} />
        </div>
      }
      legend={
        <>
          <span>var: function scope</span>
          <span>let / const: block scope</span>
        </>
      }
    />
  );
}
