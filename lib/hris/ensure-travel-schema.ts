/**
 * Idempotent travel_requests / travel_expenses columns for multi-city itinerary.
 */

async function tableColumns(sequelize: any, table: string): Promise<Set<string>> {
  const [rows] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :table`,
    { replacements: { table } },
  );
  return new Set((rows || []).map((r: any) => String(r.column_name)));
}

async function hasTable(sequelize: any, table: string): Promise<boolean> {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :table LIMIT 1`,
    { replacements: { table } },
  );
  return (rows || []).length > 0;
}

let ready = false;

export async function ensureTravelSchema(sequelize: any): Promise<void> {
  if (!sequelize || ready) return;
  try {
    if (await hasTable(sequelize, 'travel_requests')) {
      const cols = await tableColumns(sequelize, 'travel_requests');
      const add = async (col: string, ddl: string) => {
        if (!cols.has(col)) {
          await sequelize.query(`ALTER TABLE travel_requests ADD COLUMN ${ddl}`);
          cols.add(col);
        }
      };
      await add('departure_city', 'departure_city VARCHAR(100)');
      await add('transportation', "transportation VARCHAR(50) DEFAULT 'flight'");
      await add('travel_type', "travel_type VARCHAR(30) DEFAULT 'domestic'");
      await add('trip_type', "trip_type VARCHAR(20) DEFAULT 'single'");
      await add('itinerary', "itinerary JSONB DEFAULT '[]'::jsonb");
      await add('advance_amount', 'advance_amount NUMERIC(15,2) DEFAULT 0');
      await add('actual_cost', 'actual_cost NUMERIC(15,2) DEFAULT 0');
      await add('accommodation_needed', 'accommodation_needed BOOLEAN DEFAULT true');
      await add('departure_date', 'departure_date DATE');
      await add('return_date', 'return_date DATE');
      await add('start_date', 'start_date DATE');
      await add('end_date', 'end_date DATE');
      await add('completed_at', 'completed_at TIMESTAMPTZ');
      if (cols.has('start_date')) {
        await sequelize.query(`
          UPDATE travel_requests SET departure_date = start_date
          WHERE departure_date IS NULL AND start_date IS NOT NULL
        `).catch(() => {});
        await sequelize.query(`
          UPDATE travel_requests SET return_date = end_date
          WHERE return_date IS NULL AND end_date IS NOT NULL
        `).catch(() => {});
      }
      if (cols.has('departure_date')) {
        await sequelize.query(`
          UPDATE travel_requests SET start_date = departure_date
          WHERE start_date IS NULL AND departure_date IS NOT NULL
        `).catch(() => {});
        await sequelize.query(`
          UPDATE travel_requests SET end_date = return_date
          WHERE end_date IS NULL AND return_date IS NOT NULL
        `).catch(() => {});
      }
    }

    if (await hasTable(sequelize, 'travel_expenses')) {
      const cols = await tableColumns(sequelize, 'travel_expenses');
      const add = async (col: string, ddl: string) => {
        if (!cols.has(col)) {
          await sequelize.query(`ALTER TABLE travel_expenses ADD COLUMN ${ddl}`);
          cols.add(col);
        }
      };
      await add('itinerary_stop_id', 'itinerary_stop_id VARCHAR(80)');
      await add('cost_line_id', 'cost_line_id VARCHAR(80)');
      await add('receipt_number', 'receipt_number VARCHAR(100)');
      await add('planned_amount', 'planned_amount NUMERIC(15,2) DEFAULT 0');
      await add('notes', 'notes TEXT');
      await add('tenant_id', 'tenant_id UUID');
    }
    ready = true;
  } catch (e) {
    console.warn('ensureTravelSchema:', (e as any)?.message || e);
  }
}
