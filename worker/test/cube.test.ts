import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  applyMove,
  challengeNo,
  cleanName,
  countMoves,
  dailyScramble,
  isSolved,
  kstDay,
  parseMoves,
  solvedCube,
  verifySolve,
  type Move,
} from '../src/cube';

// 화면의 힌트 엔진으로 실제로 풀어서 서버 검증과 맞는지 본다
const require = createRequire(import.meta.url);
const H = require('../../src/hint-engine.js');
const AX = ['x', 'y', 'z'] as const;

function solveWithEngine(day: string): Move[] {
  const st = H.clone(stickersFor(day));
  const out: Move[] = [];
  for (let i = 0; i < 60; i++) {
    const p = H.plan(st, [0, 0, 1], 'D');
    if (p.stage === 8) break;
    for (const m of p.moves) {
      out.push({ axis: AX[m.ax], layer: m.layer, dir: m.q === 3 ? -1 : m.q });
      H.apply(st, m);
    }
  }
  return out;
}
function stickersFor(day: string) {
  const names = ['R', 'L', 'U', 'D', 'F', 'B'];
  const st = solvedCube();
  for (const m of dailyScramble(day)) applyMove(st, m);
  return st.map((s) => ({ p: [...s.p], n: [...s.n], c: names[s.c] }));
}
const wire = (ms: Move[]) => ms.map((m) => [AX.indexOf(m.axis), m.layer, m.dir]);

describe('날짜', () => {
  it('한국 시간 자정에 바뀐다', () => {
    expect(kstDay(Date.parse('2026-11-26T14:59:59Z'))).toBe('2026-11-26');
    expect(kstDay(Date.parse('2026-11-26T15:00:00Z'))).toBe('2026-11-27');
  });
  it('챌린지 번호', () => {
    expect(challengeNo('2026-11-24')).toBe(1);
    expect(challengeNo('2026-11-26')).toBe(3);
  });
});

describe('오늘의 섞기', () => {
  it('같은 날은 같은 섞기, 다른 날은 다른 섞기', () => {
    expect(dailyScramble('2026-11-26')).toEqual(dailyScramble('2026-11-26'));
    expect(dailyScramble('2026-11-26')).not.toEqual(dailyScramble('2026-11-27'));
  });
  it('바깥 면만 25수, 섞인 상태', () => {
    const s = dailyScramble('2026-11-26');
    expect(s).toHaveLength(25);
    expect(s.every((m) => m.layer !== 0)).toBe(true);
    const st = solvedCube();
    s.forEach((m) => applyMove(st, m));
    expect(isSolved(st)).toBe(false);
  });
});

describe('기록 검증', () => {
  it('섞기를 거꾸로 되돌리면 완성', () => {
    const day = '2026-11-26';
    const inv = dailyScramble(day).slice().reverse().map((m) => ({ ...m, dir: -m.dir }));
    expect(verifySolve(day, inv)).toBe(true);
    expect(verifySolve(day, inv.slice(1))).toBe(false);
  });
  it('힌트 엔진으로 푼 이동도 서버에서 완성으로 인정', () => {
    for (const day of ['2026-11-24', '2026-11-26', '2026-12-31', '2027-03-01']) {
      const moves = solveWithEngine(day);
      const parsed = parseMoves(wire(moves));
      expect(parsed).not.toBeNull();
      expect(verifySolve(day, parsed!)).toBe(true);
    }
  });
  it('가운데 줄로 맞춰도(큐브가 통째로 돈 상태) 완성', () => {
    const day = '2026-11-26';
    const inv = dailyScramble(day).slice().reverse().map((m) => ({ ...m, dir: -m.dir }));
    const whole: Move[] = [{ axis: 'y', layer: 1, dir: 1 }, { axis: 'y', layer: 0, dir: 1 }, { axis: 'y', layer: -1, dir: 1 }];
    expect(verifySolve(day, [...inv, ...whole])).toBe(true);
  });
  it('이동 형식', () => {
    expect(parseMoves([[0, 1, 1]])).toEqual([{ axis: 'x', layer: 1, dir: 1 }]);
    expect(parseMoves([[3, 1, 1]])).toBeNull();
    expect(parseMoves([[0, 2, 1]])).toBeNull();
    expect(parseMoves([[0, 1, 3]])).toBeNull();
    expect(parseMoves([])).toBeNull();
    expect(parseMoves('x')).toBeNull();
    expect(countMoves([{ axis: 'x', layer: 1, dir: 2 }, { axis: 'y', layer: -1, dir: -1 }])).toBe(3);
  });
  it('이니셜은 영문 3글자', () => {
    expect(cleanName('abc')).toBe('ABC');
    expect(cleanName('AB')).toBeNull();
    expect(cleanName('AB1')).toBeNull();
    expect(cleanName('가나다')).toBeNull();
  });
});
