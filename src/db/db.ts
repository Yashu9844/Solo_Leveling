import Dexie, { type Table } from 'dexie';
import { SCHEMA_V1 } from './schema';
import type {
  EventRow,
  XpLedgerRow,
  ProfileRow,
  ArcRow,
  QuestTemplateRow,
  QuestInstanceRow,
  ApplicationRow,
  CareerEventRow,
  ResumeVersionRow,
  DsaProblemRow,
  DsaAttemptRow,
  LearningBlockRow,
  SystemDesignStudyRow,
  BuildSessionRow,
  ArtifactRow,
  SkillNodeRow,
  SkillStateRow,
  TrainingSessionRow,
  MetricSampleRow,
  MaintenanceLogRow,
  DayRollupRow,
  PlayerStateRow,
  AttributeSnapshotRow,
  CheckpointRow,
} from './schema';

export class SystemDb extends Dexie {
  event!: Table<EventRow, string>;
  xp_ledger!: Table<XpLedgerRow, string>;
  profile!: Table<ProfileRow, string>;
  arc!: Table<ArcRow, string>;
  quest_template!: Table<QuestTemplateRow, string>;
  quest_instance!: Table<QuestInstanceRow, string>;
  application!: Table<ApplicationRow, string>;
  career_event!: Table<CareerEventRow, string>;
  resume_version!: Table<ResumeVersionRow, string>;
  dsa_problem!: Table<DsaProblemRow, string>;
  dsa_attempt!: Table<DsaAttemptRow, string>;
  learning_block!: Table<LearningBlockRow, string>;
  system_design_study!: Table<SystemDesignStudyRow, string>;
  build_session!: Table<BuildSessionRow, string>;
  artifact!: Table<ArtifactRow, string>;
  skill_node!: Table<SkillNodeRow, string>;
  skill_state!: Table<SkillStateRow, string>;
  training_session!: Table<TrainingSessionRow, string>;
  metric_sample!: Table<MetricSampleRow, string>;
  maintenance_log!: Table<MaintenanceLogRow, string>;
  day_rollup!: Table<DayRollupRow, string>;
  player_state!: Table<PlayerStateRow, string>;
  attribute_snapshot!: Table<AttributeSnapshotRow, string>;
  checkpoint!: Table<CheckpointRow, string>;

  constructor() {
    super('system-arc');
    this.version(1).stores(SCHEMA_V1);
  }
}

export const db = new SystemDb();
