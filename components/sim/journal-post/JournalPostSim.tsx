'use client';

import { useMemo } from 'react';
import { PresetBar, SimTextInput, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { balance, init, isDone, money, parseLines, step, type State } from './logic';

const PRESETS = [
  // Accounting ch.2.3 p.3: a balanced entry is posted to the ledger and trial balance
  { label: 'สไลด์ ch.3: รายการที่ดุล', value: ['Dr, เงินสด, 10000', 'Cr, รายได้ค่าบริการ, 10000'].join('\n') },
  { label: 'หลายบัญชี (Dr 2 / Cr 1)', value: ['Dr, เงินสด, 3000', 'Dr, ลูกหนี้การค้า, 7000', 'Cr, รายได้ขาย, 10000'].join('\n') },
  { label: 'ไม่ดุล: Post ไม่ได้', value: ['Dr, ค่าเช่า, 5000', 'Cr, เงินสด, 4500'].join('\n') },
];

const cell = 'border-b border-line px-2 py-1.5';

function Canvas({ state }: { state: State }) {
  const reading = state.phase === 'read';
  const trialDr = state.ledger.reduce((n, a) => n + Math.max(balance(a), 0), 0);
  const trialCr = state.ledger.reduce((n, a) => n + Math.max(-balance(a), 0), 0);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0">
        <p className="mb-1 text-[12px] font-medium leading-[18px] text-faint">สมุดรายวัน (Journal)</p>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse font-mono text-[12px] leading-5">
            <thead>
              <tr className="bg-surface-2">
                <th className={`${cell} text-left`}>บัญชี</th>
                <th className={`${cell} text-right`}>Dr</th>
                <th className={`${cell} text-right`}>Cr</th>
              </tr>
            </thead>
            <tbody>
              {state.lines.map((line, i) => (
                <tr key={i} className={i === state.current ? 'bg-accent-soft font-semibold text-accent' : !reading && i < state.pc ? 'text-faint' : ''}>
                  <td className={`${cell} text-left ${line.side === 'Cr' ? 'pl-6' : ''}`}>{line.account}</td>
                  <td className={`${cell} text-right`}>{line.side === 'Dr' ? money(line.amount) : ''}</td>
                  <td className={`${cell} text-right`}>{line.side === 'Cr' ? money(line.amount) : ''}</td>
                </tr>
              ))}
              <tr className={`font-semibold ${state.phase === 'rejected' ? 'bg-bad-soft text-bad' : state.phase !== 'read' ? 'bg-ok-soft text-ok' : ''}`}>
                <td className={`${cell} text-left`}>รวม</td>
                <td className={`${cell} text-right`}>{money(state.totalDr)}</td>
                <td className={`${cell} text-right`}>{money(state.totalCr)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="min-w-0">
        <p className="mb-1 text-[12px] font-medium leading-[18px] text-faint">{state.phase === 'trial' ? 'งบทดลอง (Trial Balance)' : 'บัญชีแยกประเภท (General Ledger)'}</p>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse font-mono text-[12px] leading-5">
            <thead>
              <tr className="bg-surface-2">
                <th className={`${cell} text-left`}>บัญชี</th>
                <th className={`${cell} text-right`}>Dr</th>
                <th className={`${cell} text-right`}>Cr</th>
              </tr>
            </thead>
            <tbody>
              {state.ledger.length === 0 ? (
                <tr>
                  <td className={`${cell} text-left text-faint`} colSpan={3}>{state.phase === 'rejected' ? '(ไม่มีการบันทึก)' : '(ยังไม่ได้ Post)'}</td>
                </tr>
              ) : null}
              {state.ledger.map((a) => {
                const active = state.current !== null && state.phase === 'post' && state.lines[state.current]?.account === a.name;
                const b = balance(a);
                const dr = state.phase === 'trial' ? Math.max(b, 0) : a.debit;
                const cr = state.phase === 'trial' ? Math.max(-b, 0) : a.credit;
                return (
                  <tr key={a.name} className={active ? 'bg-ok-soft font-semibold text-ok' : ''}>
                    <td className={`${cell} text-left`}>{a.name}</td>
                    <td className={`${cell} text-right`}>{dr ? money(dr) : ''}</td>
                    <td className={`${cell} text-right`}>{cr ? money(cr) : ''}</td>
                  </tr>
                );
              })}
              {state.phase === 'trial' ? (
                <tr className="bg-accent-soft font-semibold text-accent">
                  <td className={`${cell} text-left`}>รวม</td>
                  <td className={`${cell} text-right`}>{money(trialDr)}</td>
                  <td className={`${cell} text-right`}>{money(trialCr)}</td>
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
  const line = state.current === null ? null : state.lines[state.current]!;
  switch (state.phase) {
    case 'read':
      if (!line) return { title: 'กดปุ่ม Post', body: 'ปุ่ม Post ผูกกับโค้ด VBA ที่ทำสองขั้นตามสไลด์: (1) ตรวจว่ารายการ Dr และ Cr ดุลกัน (2) สรุปรายการไปบัญชีแยกประเภทและงบทดลอง เริ่มจากวน For loop อ่านสมุดรายวันทีละบรรทัด' };
      return { title: `อ่าน ${line.side} ${line.account} ${money(line.amount)}`, body: `For loop อ่านค่าจากเซลล์ด้วย Range(...).Value แล้วบวกสะสมในตัวแปรฝั่ง ${line.side} ตอนนี้ Dr รวม ${money(state.totalDr)} · Cr รวม ${money(state.totalCr)}` };
    case 'rejected':
      return { title: 'ไม่ดุล: ยกเลิกการ Post', body: `Dr รวม ${money(state.totalDr)} ไม่เท่ากับ Cr รวม ${money(state.totalCr)} (ต่างกัน ${money(Math.abs(state.totalDr - state.totalCr))}) โค้ดจึงแจ้งเตือนด้วย MsgBox และไม่บันทึกอะไรเลย การตรวจก่อนบันทึกกันไม่ให้ข้อมูลผิดไหลเข้าบัญชีแยกประเภทและงบการเงิน` };
    case 'check':
      return { title: 'ดุล: Dr = Cr', body: `Dr รวม ${money(state.totalDr)} เท่ากับ Cr รวม ${money(state.totalCr)} ตามหลักบัญชีคู่ จึงผ่านขั้นที่ 1 และเริ่มสรุปรายการไปบัญชีแยกประเภทได้` };
    case 'post':
      return { title: `ผ่านรายการไปบัญชี ${line!.account}`, body: `นำ ${money(line!.amount)} ไปลงฝั่ง ${line!.side} ของบัญชี "${line!.account}" ในบัญชีแยกประเภท ชื่อบัญชีต้องตรงกับผังบัญชี (ข้อมูล Master) ซึ่งในหน้าบันทึกคุมด้วย Data validation และดึงรายละเอียดด้วย XLOOKUP` };
    default:
      return { title: 'สรุปงบทดลอง', body: 'งบทดลองนำยอดคงเหลือของทุกบัญชีมาเรียงกัน ผลรวมฝั่ง Dr ต้องเท่ากับฝั่ง Cr เสมอ ถ้าทุกรายการที่ Post ดุล จากนั้นจึงนำไปจัดทำงบการเงิน ลำดับทั้งหมดคือ สมุดรายวัน → แยกประเภท → งบทดลอง → งบการเงิน' };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  switch (state.phase) {
    case 'read':
      return state.current === null ? { tone: 'normal', label: 'เริ่มต้น' } : { tone: 'active', label: 'ตรวจ Dr / Cr' };
    case 'rejected':
      return { tone: 'error', label: 'ไม่ดุล' };
    case 'check':
      return { tone: 'done', label: 'ดุล' };
    case 'post':
      return { tone: 'active', label: 'ผ่านรายการ' };
    default:
      return { tone: 'done', label: 'งบทดลอง' };
  }
}
const render = (state: State) => <Canvas state={state} />;

export function JournalPostSim() {
  const lines = useParsedText(PRESETS[0]!.value, parseLines);
  const initialState = useMemo(() => init(lines.value), [lines.value]);
  return (
    <SimulationPlayer
      title="ปุ่ม Post: จากสมุดรายวันสู่งบทดลอง"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => p.value === lines.text)} onPick={lines.apply} />
          <SimTextInput label="รายการในสมุดรายวัน (บรรทัดละ 1 รายการ)" hint="Dr หรือ Cr, ชื่อบัญชี, จำนวนเงิน เช่น Dr, เงินสด, 10000" text={lines.text} error={lines.error} onChange={lines.apply} rows={4} />
        </div>
      }
      legend={
        <>
          <span className="text-accent">สีเน้น = บรรทัดที่กำลังทำ</span>
          <span className="text-ok">เขียว = ดุล / บัญชีที่ถูกลง</span>
          <span className="text-bad">แดง = ไม่ดุล</span>
        </>
      }
    />
  );
}
