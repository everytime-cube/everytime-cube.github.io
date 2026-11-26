import { DurableObject } from 'cloudflare:workers';
import type { Env } from './index';
import { countMoves, dailyScramble, type Move, verifySolve } from './cube';

/** 하루 기본 도전 횟수 (보상형 광고로 하루 한 번 +1) */
export const BASE_ATTEMPTS = 1;
/** 날짜 객체는 이 기간 뒤 지운다 */
const KEEP_MS = 40 * 864e5;
/** 랭킹에 보여 줄 수 */
const TOP = 50;

export class ChallengeError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export interface Status {
  day: string;
  used: number;
  bonus: boolean;
  left: number;
  max: number;
  best: { ms: number; moves: number; name: string; rank: number } | null;
  /** 시작했지만 아직 제출하지 않은 도전이 있으면 (앱을 껐다 켠 경우) */
  open: boolean;
}

export interface RankRow {
  rank: number;
  name: string;
  ms: number;
  moves: number;
  me: boolean;
}

/** 날짜 하나 = Durable Object 하나. 날짜(YYYY-MM-DD)로 찾는다. */
export class CubeDaily extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS attempts (device TEXT PRIMARY KEY, used INTEGER NOT NULL DEFAULT 0, bonus INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, device TEXT NOT NULL, started_at INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS records (device TEXT PRIMARY KEY, name TEXT NOT NULL, ms INTEGER NOT NULL, moves INTEGER NOT NULL, at INTEGER NOT NULL);
    `);
  }

  private async keepAlarm(): Promise<void> {
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + KEEP_MS);
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }

  private attempts(device: string): { used: number; bonus: boolean } {
    const row = this.sql.exec<{ used: number; bonus: number }>('SELECT used, bonus FROM attempts WHERE device = ?', device).toArray()[0];
    return { used: row?.used ?? 0, bonus: !!row?.bonus };
  }

  private rankOf(device: string): RankRow | null {
    const me = this.sql.exec<{ name: string; ms: number; moves: number; at: number }>('SELECT name, ms, moves, at FROM records WHERE device = ?', device).toArray()[0];
    if (!me) return null;
    const ahead = this.sql
      .exec<{ n: number }>(
        'SELECT COUNT(*) AS n FROM records WHERE ms < ? OR (ms = ? AND moves < ?) OR (ms = ? AND moves = ? AND at < ?)',
        me.ms, me.ms, me.moves, me.ms, me.moves, me.at,
      )
      .one().n;
    return { rank: ahead + 1, name: me.name, ms: me.ms, moves: me.moves, me: true };
  }

  async status(day: string, device: string): Promise<Status> {
    const a = this.attempts(device);
    const max = BASE_ATTEMPTS + (a.bonus ? 1 : 0);
    const mine = this.rankOf(device);
    const open = this.sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM runs WHERE device = ? AND done = 0', device).one().n > 0;
    return {
      day,
      used: a.used,
      bonus: a.bonus,
      left: Math.max(0, max - a.used),
      max,
      best: mine ? { ms: mine.ms, moves: mine.moves, name: mine.name, rank: mine.rank } : null,
      open,
    };
  }

  /** 도전 시작: 횟수를 쓰고 섞기를 알려 준다. 시작 시각은 서버 시계로 남긴다. */
  async start(day: string, device: string, now: number): Promise<{ runId: string; scramble: Move[]; status: Status }> {
    const a = this.attempts(device);
    const max = BASE_ATTEMPTS + (a.bonus ? 1 : 0);
    if (a.used >= max) throw new ChallengeError(409, a.bonus ? '오늘 도전을 모두 썼어요. 내일 다시 도전하세요' : '오늘 도전을 모두 썼어요');
    this.sql.exec(
      'INSERT INTO attempts (device, used, bonus) VALUES (?, 1, 0) ON CONFLICT(device) DO UPDATE SET used = used + 1',
      device,
    );
    // 끝내지 않은 지난 도전은 포기로 정리
    this.sql.exec('UPDATE runs SET done = 1 WHERE device = ? AND done = 0', device);
    const runId = `${day}.${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    this.sql.exec('INSERT INTO runs (id, device, started_at) VALUES (?, ?, ?)', runId, device, now);
    await this.keepAlarm();
    return { runId, scramble: dailyScramble(day), status: await this.status(day, device) };
  }

  /** 보상형 광고를 본 뒤 하루 한 번 도전 +1 */
  async bonus(day: string, device: string): Promise<Status> {
    const a = this.attempts(device);
    if (a.bonus) throw new ChallengeError(409, '오늘은 이미 한 번 더 도전을 받았어요');
    this.sql.exec(
      'INSERT INTO attempts (device, used, bonus) VALUES (?, 0, 1) ON CONFLICT(device) DO UPDATE SET bonus = 1',
      device,
    );
    await this.keepAlarm();
    return this.status(day, device);
  }

  /** 포기: 진행 중인 도전을 끝낸 것으로 (횟수는 이미 썼다) */
  async giveUp(day: string, device: string): Promise<Status> {
    this.sql.exec('UPDATE runs SET done = 1 WHERE device = ? AND done = 0', device);
    return this.status(day, device);
  }

  /**
   * 기록 제출: 서버가 섞기 + 이동을 재생해서 완성인지 보고, 시간은 서버가 잰 시간보다 길 수 없다.
   * 기기마다 가장 좋은 기록 하나만 랭킹에 남긴다.
   */
  async submit(
    day: string,
    device: string,
    runId: string,
    name: string,
    ms: number,
    moves: Move[],
    now: number,
  ): Promise<{ rank: number; total: number; improved: boolean; moves: number; status: Status; top: RankRow[] }> {
    const run = this.sql
      .exec<{ device: string; started_at: number; done: number }>('SELECT device, started_at, done FROM runs WHERE id = ?', runId)
      .toArray()[0];
    if (!run || run.device !== device) throw new ChallengeError(404, '도전 기록을 찾지 못했어요');
    if (run.done) throw new ChallengeError(409, '이미 끝난 도전이에요');
    const count = countMoves(moves);
    if (!verifySolve(day, moves)) throw new ChallengeError(400, '큐브가 완성되지 않은 기록이에요');
    const elapsed = now - run.started_at;
    // 화면 시간은 섞기 연출·카운트다운 뒤부터 재니 서버 시간보다 짧아야 한다 (통신 지연 여유 3초)
    if (!Number.isInteger(ms) || ms < 1000 || ms > elapsed + 3000) throw new ChallengeError(400, '시간 기록이 올바르지 않아요');
    if (ms < count * 40) throw new ChallengeError(400, '시간 기록이 올바르지 않아요');
    this.sql.exec('UPDATE runs SET done = 1 WHERE id = ?', runId);
    const prev = this.sql.exec<{ ms: number; moves: number }>('SELECT ms, moves FROM records WHERE device = ?', device).toArray()[0];
    const improved = !prev || ms < prev.ms || (ms === prev.ms && count < prev.moves);
    if (improved) {
      this.sql.exec(
        'INSERT INTO records (device, name, ms, moves, at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(device) DO UPDATE SET name = excluded.name, ms = excluded.ms, moves = excluded.moves, at = excluded.at',
        device, name, ms, count, now,
      );
    } else {
      this.sql.exec('UPDATE records SET name = ? WHERE device = ?', name, device);
    }
    const mine = this.rankOf(device)!;
    const total = this.sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM records').one().n;
    return { rank: mine.rank, total, improved, moves: count, status: await this.status(day, device), top: this.top(device) };
  }

  private top(device: string): RankRow[] {
    return this.sql
      .exec<{ device: string; name: string; ms: number; moves: number }>(
        `SELECT device, name, ms, moves FROM records ORDER BY ms, moves, at LIMIT ${TOP}`,
      )
      .toArray()
      .map((r, i) => ({ rank: i + 1, name: r.name, ms: r.ms, moves: r.moves, me: r.device === device }));
  }

  async ranking(device: string): Promise<{ top: RankRow[]; me: RankRow | null; total: number }> {
    const total = this.sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM records').one().n;
    return { top: this.top(device), me: this.rankOf(device), total };
  }
}
