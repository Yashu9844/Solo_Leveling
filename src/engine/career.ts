export interface ApplicationFixture {
  id: string;
  local_date: string;
  why_line: string;
  quality_pass: boolean;
  followed_up_at?: string;
  followup_due_at?: string;
}

export interface CareerEventFixture {
  kind: string;
  local_date: string;
}

export interface FunnelResult {
  applications: number;
  responses: number;
  calls: number;
  loops: number;
  offers: number;
  response_rate: number;
}

/**
 * Pure. Applies the application quality gate: company + role recorded, a
 * resume version selected, and a why_line >= 15 chars that does not
 * duplicate the previous application's line on the same day.
 * TODO: Slice 6
 */
export function passesQualityGate(
  application: ApplicationFixture,
  previousWhyLineToday: string | undefined
): boolean {
  throw new Error('Not implemented — Slice 6');
}

/** Pure. Career Funnel conversion maths — external, never scored. TODO: Slice 6 */
export function funnelFrom(
  applications: ApplicationFixture[],
  events: CareerEventFixture[]
): FunnelResult {
  throw new Error('Not implemented — Slice 6');
}

/** Pure. Share of applications >= 14 days old that were followed up or closed. TODO: Slice 6 */
export function followThroughRate(applications: ApplicationFixture[], asOf: string): number {
  throw new Error('Not implemented — Slice 6');
}
