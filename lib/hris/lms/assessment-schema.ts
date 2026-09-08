const sequelize = require('../../sequelize');

let ensured = false;

/** Idempotent columns for bank↔exam mapping and module exam binding. */
export async function ensureLmsAssessmentSchema(): Promise<void> {
  if (ensured) return;
  await sequelize.query(`
    ALTER TABLE hris_training_exam_questions
      ADD COLUMN IF NOT EXISTS question_bank_id UUID
  `).catch(() => null);
  await sequelize.query(`
    ALTER TABLE hris_training_modules
      ADD COLUMN IF NOT EXISTS exam_id UUID
  `).catch(() => null);
  ensured = true;
}
