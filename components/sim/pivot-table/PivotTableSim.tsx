'use client';

import { useMemo, useState } from 'react';
import { PresetBar, SimTextInput, SimToggle, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { AGG_LABEL, FIELD_LABEL, ROW_FIELDS, VALUE_FIELDS, fmt, grandTotal, groupValue, init, isDone, parseInvoices, step, type Agg, type Config, type State } from './logic';

// Shaped like the course's Invoice data: 3 branches, Member/Normal, 3 payment types.
const DATA = [
  'กรุงเทพ, Member, Cash, 7, 26',
  'เชียงใหม่, Normal, E-wallet, 5, 4',
  'กรุงเทพ, Normal, Credit card, 8, 23',
  'ภูเก็ต, Member, Cash, 6, 30',
  'เชียงใหม่, Member, E-wallet, 10, 17',
  'ภูเก็ต, Normal, Credit card, 2, 9',
  'กรุงเทพ, Member, E-wallet, 4, 12',
  'ภูเก็ต, Member, Cash, 3, 15',
].join('\n');

const PRESETS: { label: string; value: Config }[] = [
  // Pivot p.14: total Gross Income of each Branch
  { label: 'สไลด์ p.14: Gross income ต่อ Branch', value: { rowField: 'branch', valueField: 'income', agg: 'sum' } },
  { label: 'นับจำนวน Invoice ต่อ Payment', value: { rowField: 'payment', valueField: 'income', agg: 'count' } },
  { label: 'Quantity เฉลี่ยต่อ Customer type', value: { rowField: 'customer', valueField: 'quantity', agg: 'average' } },
];

const cell = 'border-b border-line px-2 py-1.5 text-left';
const isValue = (f: string) => (VALUE_FIELDS as readonly string[]).includes(f);

function Canvas({ state }: { state: State }) {
  const { config, event } = state;
  const total = grandTotal(state.groups, config.agg);
  const sumTotal = state.groups.reduce((n, g) => n + g.sum, 0);
  const activeKey = event.kind === 'add' ? event.key : null;
  // The fields in use come first so they stay visible on a narrow screen.
  const columns = [config.rowField, config.valueField, ...ROW_FIELDS.filter((f) => f !== config.rowField), ...VALUE_FIELDS.filter((f) => f !== config.valueField)];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0">
        <p className="mb-1 text-[12px] font-medium leading-[18px] text-faint">ข้อมูลต้นทาง (1 แถว = 1 Invoice)</p>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-max border-collapse font-mono text-[12px] leading-5">
            <thead>
              <tr className="bg-surface-2">
                <th className={cell}>#</th>
                {columns.map((f) => (
                  <th key={f} className={`${cell} ${isValue(f) ? 'text-right' : ''} ${f === config.rowField || f === config.valueField ? 'text-accent' : ''}`}>{FIELD_LABEL[f]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.invoices.map((inv, i) => {
                const current = event.kind === 'add' && event.row === i;
                return (
                  <tr key={i} className={current ? 'bg-accent-soft font-semibold text-accent' : i < state.pc ? 'text-faint' : ''}>
                    <td className={cell}>{i + 1}</td>
                    {columns.map((f) => (
                      <td key={f} className={`${cell} ${isValue(f) ? 'text-right' : ''}`}>{inv[f]}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="min-w-0">
        <p className="mb-1 text-[12px] font-medium leading-[18px] text-faint">
          Pivot Table · Rows: <b className="text-ink">{FIELD_LABEL[config.rowField]}</b> · Values: <b className="text-ink">{AGG_LABEL[config.agg]} of {FIELD_LABEL[config.valueField]}</b>
        </p>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse font-mono text-[13px] leading-6">
            <thead>
              <tr className="bg-surface-2">
                <th className={cell}>Row Labels</th>
                <th className={`${cell} text-right`}>{AGG_LABEL[config.agg]}</th>
                {state.showTotal && config.agg === 'sum' ? <th className={`${cell} text-right`}>% of Grand Total</th> : null}
              </tr>
            </thead>
            <tbody>
              {state.groups.length === 0 ? (
                <tr>
                  <td className={`${cell} text-faint`} colSpan={2}>(ยังไม่มีกลุ่ม)</td>
                </tr>
              ) : null}
              {state.groups.map((g) => (
                <tr key={g.key} className={g.key === activeKey ? 'bg-ok-soft font-semibold text-ok' : ''}>
                  <td className={cell}>{g.key}</td>
                  <td className={`${cell} text-right`}>{fmt(groupValue(g, config.agg))}</td>
                  {state.showTotal && config.agg === 'sum' ? (
                    <td className={`${cell} text-right`}>{sumTotal === 0 ? '0' : ((g.sum / sumTotal) * 100).toFixed(1)}%</td>
                  ) : null}
                </tr>
              ))}
              {state.showTotal ? (
                <tr className="bg-accent-soft font-semibold text-accent">
                  <td className={cell}>Grand Total</td>
                  <td className={`${cell} text-right`}>{fmt(total)}</td>
                  {config.agg === 'sum' ? <td className={`${cell} text-right`}>100.0%</td> : null}
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const { config, event } = state;
  const row = FIELD_LABEL[config.rowField];
  const value = FIELD_LABEL[config.valueField];
  if (event.kind === 'init') {
    return {
      title: `ลาก ${row} ไปที่ Rows และ ${value} ไปที่ Values`,
      body: `Pivot Table จะอ่านข้อมูลต้นทางทีละแถว จัดแถวที่มี ${row} เหมือนกันไว้กลุ่มเดียวกัน แล้วคำนวณ ${AGG_LABEL[config.agg]} ของ ${value} ในแต่ละกลุ่ม ข้อมูลต้นทางไม่ถูกแก้`,
    };
  }
  if (event.kind === 'total') {
    const total = fmt(grandTotal(state.groups, config.agg));
    return {
      title: `Grand Total = ${total}`,
      body:
        config.agg === 'sum'
          ? `อ่านครบทุกแถวแล้ว Grand Total คือผลรวมของทุกกลุ่ม และเมื่อเลือก Show Values As → % of Grand Total แต่ละกลุ่มจะแสดงเป็นสัดส่วนของ ${total} ทำให้เปรียบเทียบได้ทันทีว่ากลุ่มใดมีส่วนแบ่งมากที่สุด`
          : config.agg === 'count'
            ? `อ่านครบทุกแถวแล้ว Grand Total ของ Count คือจำนวนแถวทั้งหมด (${total} Invoice) สังเกตว่า Count นับจำนวนแถว ไม่ได้บวกค่าของ ${value}`
            : `อ่านครบทุกแถวแล้ว Grand Total ของ Average คือค่าเฉลี่ยของทุกแถวรวมกัน (${total}) ไม่ใช่ค่าเฉลี่ยของค่าเฉลี่ยแต่ละกลุ่ม`,
    };
  }
  const group = state.groups.find((g) => g.key === event.key)!;
  const now = fmt(groupValue(group, config.agg));
  const how =
    config.agg === 'sum'
      ? `บวก ${value} ${event.amount} เข้าไป ผลรวมของกลุ่มเป็น ${now}`
      : config.agg === 'count'
        ? `นับเพิ่ม 1 แถว กลุ่มนี้มี ${now} แถว`
        : `ผลรวม ${fmt(group.sum)} ÷ ${group.count} แถว = ค่าเฉลี่ย ${now}`;
  return {
    title: `แถว ${event.row + 1}: ${row} = ${event.key}`,
    body: event.isNew
      ? `ยังไม่มีกลุ่ม "${event.key}" จึงสร้างแถวใหม่ใน Pivot Table แล้ว${how}`
      : `มีกลุ่ม "${event.key}" อยู่แล้ว จึงไม่สร้างแถวใหม่ แต่${how} — นี่คือการ "สรุป" ข้อมูลหลายแถวให้เหลือแถวเดียวต่อกลุ่ม`,
  };
}

function status(state: State): { tone: SimTone; label: string } {
  if (state.event.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (state.event.kind === 'total') return { tone: 'done', label: 'สรุปครบ' };
  return state.event.isNew ? { tone: 'active', label: 'กลุ่มใหม่' } : { tone: 'active', label: 'รวมเข้ากลุ่มเดิม' };
}
const render = (state: State) => <Canvas state={state} />;

export function PivotTableSim() {
  const data = useParsedText(DATA, parseInvoices);
  const [config, setConfig] = useState<Config>(PRESETS[0]!.value);
  const initialState = useMemo(() => init(data.value, config), [data.value, config]);
  const set = <K extends keyof Config>(key: K, value: Config[K]) => setConfig((c) => ({ ...c, [key]: value }));

  return (
    <SimulationPlayer
      title="Pivot Table: สรุปข้อมูลทีละแถว"
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
            activeIndex={PRESETS.findIndex((p) => p.value.rowField === config.rowField && p.value.valueField === config.valueField && p.value.agg === config.agg)}
            onPick={setConfig}
          />
          <SimToggle label="Rows" value={config.rowField} options={ROW_FIELDS.map((f) => ({ value: f, label: FIELD_LABEL[f] }))} onChange={(v) => set('rowField', v)} />
          <SimToggle label="Values" value={config.valueField} options={VALUE_FIELDS.map((f) => ({ value: f, label: FIELD_LABEL[f] }))} onChange={(v) => set('valueField', v)} />
          <SimToggle label="Summarize by" value={config.agg} options={(['sum', 'count', 'average'] as Agg[]).map((a) => ({ value: a, label: AGG_LABEL[a] }))} onChange={(v) => set('agg', v)} />
          <SimTextInput label="ข้อมูล Invoice (แถวละ 1 รายการ)" hint="Branch, Customer type, Payment, Quantity, Gross income" text={data.text} error={data.error} onChange={data.apply} rows={5} />
        </div>
      }
      legend={
        <>
          <span className="text-accent">สีเน้น = แถวที่กำลังอ่าน</span>
          <span className="text-ok">เขียว = กลุ่มที่ถูกอัปเดต</span>
        </>
      }
    />
  );
}
