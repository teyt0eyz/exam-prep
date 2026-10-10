'use client';

import { useMemo } from 'react';
import { PresetBar, SimTextInput, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { AGE_MAX, AGE_MIN, count, init, isDone, parseCustomers, step, type Checked, type Customer, type Issue, type State } from './logic';

const PRESETS = [
  // Data Analysis p.50–52: customer data before cleaning, one of each kind of problem
  {
    label: 'สไลด์ p.52: ปัญหาครบทุกแบบ',
    value: ['C001, Anna, 28, Female', 'C002, Ben, 34, male', 'C003, Chai, , Male', 'C002, Ben, 34, male', 'C004, Dao, 250, Female', 'C005, Eve, 41, F'].join('\n'),
  },
  { label: 'ข้อมูลสะอาดแล้ว', value: ['C001, Anna, 28, Female', 'C002, Ben, 34, Male', 'C003, Chai, 45, Male'].join('\n') },
  { label: 'อายุผิดปกติ (ตรวจด้วย Max / Min)', value: ['C001, Anna, 28, Female', 'C002, Ben, -5, Male', 'C003, Chai, 19, Male', 'C004, Dao, 999, Female'].join('\n') },
];

const LABEL: Record<Issue, string> = { ok: 'ผ่าน', duplicate: 'Duplicate', missing: 'Missing value', error: 'Error', format: 'Formatting' };
const TONE: Record<Issue, string> = {
  ok: 'bg-ok-soft text-ok',
  duplicate: 'bg-bad-soft text-bad',
  missing: 'bg-warn-soft text-warn',
  error: 'bg-bad-soft text-bad',
  format: 'bg-accent-soft text-accent',
};
const COLUMNS: { key: keyof Customer; label: string }[] = [
  { key: 'id', label: 'Customer ID' },
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Gender' },
];
const cell = 'border-b border-line px-2 py-1.5 text-left';

function Canvas({ state }: { state: State }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-max border-collapse font-mono text-[12px] leading-5">
          <thead>
            <tr className="bg-surface-2">
              {COLUMNS.map((c) => (
                <th key={c.key} className={cell}>{c.label}</th>
              ))}
              <th className={cell}>ผลตรวจ</th>
            </tr>
          </thead>
          <tbody>
            {state.rows.map((row, i) => {
              const result: Checked | undefined = state.results[i];
              const current = i === state.pc - 1 && !state.summarised;
              return (
                <tr key={i} className={`${current ? 'bg-surface-2 font-semibold' : ''} ${result?.issue === 'duplicate' ? 'line-through decoration-bad' : ''}`}>
                  {COLUMNS.map((c) => {
                    const flagged = result?.column === c.key;
                    const text = flagged && result?.fixed ? `${row[c.key]} → ${result.fixed}` : row[c.key] || '(ว่าง)';
                    return (
                      <td key={c.key} className={`${cell} ${flagged && result ? TONE[result.issue] : ''} ${row[c.key] === '' && !flagged ? 'text-faint' : ''}`}>{text}</td>
                    );
                  })}
                  <td className={`${cell} no-underline`}>
                    {result ? <span className={`inline-block rounded-sm px-1.5 ${TONE[result.issue]}`}>{LABEL[result.issue]}</span> : <span className="text-faint">รอตรวจ</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {state.summarised ? (
        <p className="px-1 font-mono text-[12px] leading-5 text-muted">
          ผ่าน {count(state, 'ok')} · Duplicate {count(state, 'duplicate')} · Missing {count(state, 'missing')} · Error {count(state, 'error')} · Formatting {count(state, 'format')}
        </p>
      ) : null}
    </div>
  );
}

function explain(state: State): SimExplanation {
  if (state.pc === 0) {
    return {
      title: 'ตรวจข้อมูลทีละแถวก่อนวิเคราะห์',
      body: 'การทำความสะอาดข้อมูลเป็นขั้นตอนสำคัญก่อนวิเคราะห์ จะตรวจตามลำดับ: แถวซ้ำ (Duplicates) → ค่าว่าง (Missing Values) → ค่าผิดปกติ (Errors) → รูปแบบไม่ตรงกัน (Formatting)',
    };
  }
  if (state.summarised) {
    const clean = count(state, 'ok') + count(state, 'format');
    return {
      title: `ตรวจครบ ${state.rows.length} แถว`,
      body: `ใช้วิเคราะห์ต่อได้ทันที ${clean} แถว (รวมแถวที่ปรับรูปแบบแล้ว) แถวซ้ำถูกตัดออก ส่วนแถวที่มีค่าว่างหรือค่าผิดปกติต้องตัดสินใจว่าจะแก้ เติม หรือตัดทิ้ง ถ้าปล่อยไว้ผลวิเคราะห์จะเกิด Bias เช่น ค่าเฉลี่ยอายุเพี้ยนจากค่า 250`,
    };
  }
  const i = state.pc - 1;
  const row = state.rows[i]!;
  const result = state.results[i]!;
  const head = `แถว ${i + 1} (${row.id})`;
  switch (result.issue) {
    case 'duplicate':
      return { title: `${head}: ซ้ำ`, body: `Customer ID ${row.id} มีอยู่แล้วในแถวก่อนหน้า (Identify Duplicates) ถ้าไม่ตัดออก ลูกค้าคนนี้จะถูกนับสองครั้ง ทำให้จำนวนลูกค้าและยอดรวมสูงเกินจริง ใน Excel ใช้ Remove Duplicates ได้` };
    case 'missing':
      return { title: `${head}: ค่าว่างในคอลัมน์ ${result.column}`, body: 'Handle Missing Values: ต้องตัดสินใจว่าจะเติมค่า (ถ้าหาได้) หรือตัดแถวทิ้ง ถ้าปล่อยว่างไว้ การคำนวณ เช่น ค่าเฉลี่ย จะข้ามแถวนี้โดยเราไม่รู้ตัว' };
    case 'error':
      return result.column === 'age'
        ? { title: `${head}: อายุ ${row.age} ผิดปกติ`, body: `Identify Errors: อายุควรอยู่ในช่วง ${AGE_MIN}–${AGE_MAX} สไลด์แนะนำให้ใช้ MAX และ MIN กับข้อมูลตัวเลข (Numerical) ถ้า MAX หรือ MIN ออกมาเป็นค่าที่เป็นไปไม่ได้ แสดงว่ามีค่าผิดอยู่ในคอลัมน์` }
        : { title: `${head}: Gender "${row.gender}" ไม่รู้จัก`, body: 'Identify Errors: ค่านี้ไม่อยู่ในหมวดหมู่ที่ควรมี สไลด์แนะนำให้ใช้ Filter กับข้อมูลหมวดหมู่ (Categorical) รายการใน Filter จะแสดงค่าที่ไม่ซ้ำทั้งหมด ทำให้เห็นค่าแปลกปลอมทันที' };
    case 'format':
      return { title: `${head}: ปรับรูปแบบ ${row.gender} → ${result.fixed}`, body: `Data Formatting: "${row.gender}" กับ "${result.fixed}" หมายถึงสิ่งเดียวกันแต่เขียนต่างกัน ถ้าไม่ปรับให้ตรงกัน Pivot Table จะแยกเป็นคนละกลุ่ม ตรวจเจอได้ด้วย Filter เช่นกัน` };
    default:
      return { title: `${head}: ผ่าน`, body: 'ไม่ซ้ำ ไม่มีค่าว่าง ค่าอยู่ในช่วงที่เป็นไปได้ และรูปแบบตรงกับที่กำหนด' };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  if (state.pc === 0) return { tone: 'normal', label: 'เริ่มต้น' };
  if (state.summarised) return { tone: 'done', label: 'ตรวจครบ' };
  const issue = state.results[state.pc - 1]!.issue;
  const tone: SimTone = issue === 'ok' ? 'done' : issue === 'missing' ? 'waiting' : issue === 'format' ? 'active' : 'error';
  return { tone, label: LABEL[issue] };
}
const render = (state: State) => <Canvas state={state} />;

export function CleanDataSim() {
  const data = useParsedText(PRESETS[0]!.value, parseCustomers);
  const initialState = useMemo(() => init(data.value), [data.value]);
  return (
    <SimulationPlayer
      title="Clean Data: ตรวจข้อมูลทีละแถว"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => p.value === data.text)} onPick={data.apply} />
          <SimTextInput label="Customer Data (แถวละ 1 คน)" hint="Customer ID, Name, Age, Gender — เว้นช่องว่างได้เพื่อจำลอง missing value" text={data.text} error={data.error} onChange={data.apply} rows={5} />
        </div>
      }
      legend={
        <>
          <span className="text-bad">แดง = ซ้ำ / ค่าผิด</span>
          <span className="text-warn">เหลือง = ค่าว่าง</span>
          <span className="text-accent">สีเน้น = ปรับรูปแบบ</span>
        </>
      }
    />
  );
}
