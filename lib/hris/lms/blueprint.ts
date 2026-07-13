/**
 * Exam blueprint — adaptive question selection from bank
 */
export interface BlueprintSection {
  category: string;
  count: number;
  difficulty?: string;
  psychometric_type?: string;
}

export function buildBlueprintQuery(sections: BlueprintSection[]): { sql: string; repl: Record<string, unknown> }[] {
  return sections.map((sec, i) => {
    let where = 'WHERE tenant_id = :tid AND status = :st';
    const repl: Record<string, unknown> = { st: 'active', lim: sec.count };
    if (sec.category) { where += ` AND category = :cat${i}`; repl[`cat${i}`] = sec.category; }
    if (sec.difficulty) { where += ` AND difficulty = :diff${i}`; repl[`diff${i}`] = sec.difficulty; }
    if (sec.psychometric_type) { where += ` AND psychometric_type = :pt${i}`; repl[`pt${i}`] = sec.psychometric_type; }
    return {
      sql: `SELECT * FROM hris_lms_question_bank ${where} ORDER BY RANDOM() LIMIT :lim`,
      repl,
    };
  });
}

export async function selectQuestionsFromBlueprint(
  sequelize: any,
  tenantId: string,
  sections: BlueprintSection[],
): Promise<any[]> {
  const selected: any[] = [];
  let num = 1;
  for (const { sql, repl } of buildBlueprintQuery(sections)) {
    const [rows] = await sequelize.query(sql, { replacements: { ...repl, tid: tenantId } }).catch(() => [[]]);
    for (const q of rows) {
      selected.push({
        question_number: num++,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        score: q.score,
        difficulty: q.difficulty,
        bank_question_id: q.id,
      });
    }
  }
  return selected;
}
