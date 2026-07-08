'use strict';

/**
 * HRIS field integration:
 * - employees.work_location
 * - team_members.employee_id, location, work_area
 */
module.exports = {
  up: async (queryInterface) => {
    const safeAddColumn = async (table, column, spec) => {
      try {
        const desc = await queryInterface.describeTable(table);
        if (!desc[column]) {
          await queryInterface.addColumn(table, column, spec);
          console.log(`  ✓ ${table}.${column}`);
        }
      } catch (e) {
        console.warn(`  ⚠ skip ${table}.${column}:`, e.message);
      }
    };

    await safeAddColumn('employees', 'work_location', {
      type: queryInterface.sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'ADMIN_OFFICE',
    });

    await safeAddColumn('employees', 'job_grade_id', {
      type: queryInterface.sequelize.UUID,
      allowNull: true,
    });

    await safeAddColumn('employees', 'org_structure_id', {
      type: queryInterface.sequelize.UUID,
      allowNull: true,
    });

    await safeAddColumn('team_members', 'employee_id', {
      type: queryInterface.sequelize.UUID,
      allowNull: true,
    });
    await safeAddColumn('team_members', 'location', {
      type: queryInterface.sequelize.STRING(100),
      allowNull: true,
    });
    await safeAddColumn('team_members', 'work_area', {
      type: queryInterface.sequelize.STRING(50),
      allowNull: true,
    });

    try {
      await queryInterface.addIndex('team_members', ['employee_id'], {
        name: 'idx_team_members_employee_id',
      });
    } catch { /* index may exist */ }
  },

  down: async (queryInterface) => {
    const safeRemove = async (table, column) => {
      try {
        const desc = await queryInterface.describeTable(table);
        if (desc[column]) await queryInterface.removeColumn(table, column);
      } catch { /* noop */ }
    };
    try {
      await queryInterface.removeIndex('team_members', 'idx_team_members_employee_id');
    } catch { /* noop */ }
    await safeRemove('team_members', 'work_area');
    await safeRemove('team_members', 'location');
    await safeRemove('team_members', 'employee_id');
    await safeRemove('employees', 'work_location');
  },
};
