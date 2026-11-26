/**
 * 3×3 큐브 규칙 (서버용): 오늘의 문제 만들기, 이동 재생, 완성 확인.
 * 화면(src/src.html)과 같은 좌표계를 쓴다. x 오른쪽, y 위, z 앞. 줄은 -1·0·1.
 * dir은 축 기준 오른손 법칙 방향 90° 회전 수 (±1, ±2).
 */

export type Axis = 'x' | 'y' | 'z';
export interface Move {
  axis: Axis;
  layer: number;
  dir: number;
}

const AXES: Axis[] = ['x', 'y', 'z'];

/** 한국 시간 날짜 (YYYY-MM-DD). 챌린지는 자정(한국 시간)에 바뀐다. */
export function kstDay(now: number): string {
  return new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 첫 챌린지(2026-11-24)부터 몇 번째인지 */
export function challengeNo(day: string): number {
  return Math.floor((Date.parse(day) - Date.parse('2026-11-24')) / 864e5) + 1;
}

export function isDay(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 날짜로 정해지는 오늘의 섞기 (바깥 면만 25수). 화면의 미리보기 모드와 같은 계산. */
export function dailyScramble(day: string): Move[] {
  const key = Number(day.replace(/-/g, ''));
  const rnd = mulberry32((key * 2654435761) % 4294967296);
  const out: Move[] = [];
  let prev: Move | null = null;
  for (let i = 0; i < 25; i++) {
    let m: Move;
    do {
      m = { axis: AXES[(rnd() * 3) | 0], layer: rnd() < 0.5 ? -1 : 1, dir: rnd() < 0.5 ? 1 : -1 };
      if (rnd() < 0.2) m.dir = 2;
    } while (prev && prev.axis === m.axis && prev.layer === m.layer);
    prev = m;
    out.push(m);
  }
  return out;
}

// ---- 스티커 모델 ----
type Vec = [number, number, number];
interface Sticker {
  p: Vec;
  n: Vec;
  c: number;
}

function rot(v: Vec, ax: number, q: number): Vec {
  let [x, y, z] = v;
  for (let i = 0; i < q; i++) {
    if (ax === 0) [y, z] = [-z, y];
    else if (ax === 1) [x, z] = [z, -x];
    else [x, y] = [-y, x];
  }
  return [x, y, z];
}

export function solvedCube(): Sticker[] {
  const faces: Vec[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const st: Sticker[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const p: Vec = [x, y, z];
        faces.forEach((n, c) => {
          const ai = n.findIndex((v) => v !== 0);
          if (p[ai] === n[ai]) st.push({ p: [...p], n: [...n], c });
        });
      }
  return st;
}

export function applyMove(st: Sticker[], m: Move): void {
  const ax = AXES.indexOf(m.axis);
  const q = ((m.dir % 4) + 4) % 4;
  for (const s of st) {
    if (s.p[ax] === m.layer) {
      s.p = rot(s.p, ax, q);
      s.n = rot(s.n, ax, q);
    }
  }
}

/** 면마다 색이 한 가지면 완성 (큐브를 통째로 돌린 상태도 완성) */
export function isSolved(st: Sticker[]): boolean {
  const seen = new Map<string, number>();
  for (const s of st) {
    const k = s.n.join(',');
    const c = seen.get(k);
    if (c === undefined) seen.set(k, s.c);
    else if (c !== s.c) return false;
  }
  return true;
}

/** 화면이 보낸 이동 [축 0~2, 줄 -1~1, 방향 ±1·±2] 확인 */
export function parseMoves(v: unknown, max = 3000): Move[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > max) return null;
  const out: Move[] = [];
  for (const m of v) {
    if (!Array.isArray(m) || m.length !== 3) return null;
    const [a, l, d] = m;
    if (![0, 1, 2].includes(a) || ![-1, 0, 1].includes(l) || ![-2, -1, 1, 2].includes(d)) return null;
    out.push({ axis: AXES[a], layer: l, dir: d });
  }
  return out;
}

/** 이동 수: 화면과 같이 반 바퀴는 2로 센다 */
export function countMoves(moves: Move[]): number {
  return moves.reduce((n, m) => n + Math.abs(m.dir), 0);
}

/** 오늘의 섞기 + 제출한 이동을 재생해서 완성되는지 */
export function verifySolve(day: string, moves: Move[]): boolean {
  const st = solvedCube();
  for (const m of dailyScramble(day)) applyMove(st, m);
  for (const m of moves) applyMove(st, m);
  return isSolved(st);
}

export function isDevice(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(v);
}

/** 랭킹 이니셜: 영문 3글자 */
export function cleanName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : null;
}
