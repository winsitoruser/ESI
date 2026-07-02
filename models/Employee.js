'use strict';

module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define('Employee', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Employee ID number (e.g., EMP001)'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Link to User account for authentication'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: true
    },
    placeOfBirth: {
      type: DataTypes.STRING,
      allowNull: true
    },
    nationalId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'NIK/KTP number'
    },
    religion: {
      type: DataTypes.STRING,
      allowNull: true
    },
    maritalStatus: {
      type: DataTypes.ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'),
      allowNull: true
    },
    position: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Job position/title'
    },
    department: {
      type: DataTypes.ENUM(
        'MANAGEMENT', 'OPERATIONS', 'SALES', 'FINANCE', 'ADMINISTRATION',
        'WAREHOUSE', 'KITCHEN', 'CUSTOMER_SERVICE', 'IT', 'HR',
        'CLINICAL', 'PHARMACY', 'MARKETING', 'LOGISTICS', 'PRODUCTION'
      ),
      allowNull: false
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      comment: 'Branch assignment for this employee'
    },
    workLocation: {
      type: DataTypes.ENUM(
        'MAIN_STORE', 'WAREHOUSE', 'CASHIER_FRONT', 'KITCHEN',
        'FRONT_DESK', 'ADMIN_OFFICE', 'FINANCE_DEPT', 'FIELD',
        'MAIN_PHARMACY', 'CLINIC_PHARMACY', 'CASHIER_PHARMACY',
        'GENERAL_CLINIC', 'SPECIALIST_CLINIC', 'REGISTRATION',
        'LAB_SECTION', 'INVENTORY', 'MULTIPLE', 'REMOTE'
      ),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM(
        'ADMIN', 'MANAGER', 'SUPERVISOR', 'STAFF', 'CASHIER',
        'INVENTORY_MANAGER', 'WAREHOUSE_STAFF', 'DRIVER', 'CHEF', 'WAITER',
        'DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST', 'SALES_REP'
      ),
      allowNull: false,
      comment: 'System role for permissions'
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'),
      allowNull: false,
      defaultValue: 'ACTIVE'
    },
    joinDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Employment end date if terminated'
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Medical specialization for doctors'
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Professional license number (SIP/SIPA/STR)'
    },
    biography: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    emergencyContactName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emergencyContactRelationship: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emergencyContactPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    baseSalary: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Base salary amount'
    },
    salaryGrade: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Salary grade level'
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Multi-tenant support'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'employees',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['employeeId', 'tenantId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['branchId']
      },
      {
        fields: ['department']
      },
      {
        fields: ['workLocation']
      },
      {
        fields: ['status']
      },
      {
        fields: ['tenantId']
      }
    ]
  });

  Employee.associate = (models) => {
    // Relasi dengan User untuk authentication
    Employee.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    });

    // Relasi dengan Branch
    if (models.Branch) {
      Employee.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch',
        constraints: false
      });
    }

    // Relasi dengan Employee sub-models
    Employee.hasMany(models.EmployeeEducation, {
      foreignKey: 'employeeId',
      as: 'education'
    });

    Employee.hasMany(models.EmployeeWorkExperience, {
      foreignKey: 'employeeId',
      as: 'workExperience'
    });

    Employee.hasMany(models.EmployeeCertification, {
      foreignKey: 'employeeId',
      as: 'certifications'
    });

    Employee.hasMany(models.EmployeeSkill, {
      foreignKey: 'employeeId',
      as: 'skills'
    });

    // Relasi dengan Transaction (sebagai employee yang melayani)
    if (models.Transaction) {
      Employee.hasMany(models.Transaction, {
        foreignKey: 'employeeId',
        as: 'transactions',
        constraints: false
      });
    }

    // Relasi dengan DoctorSchedule (untuk dokter)
    if (models.DoctorSchedule) {
      Employee.hasMany(models.DoctorSchedule, {
        foreignKey: 'doctorId',
        as: 'schedules',
        constraints: false
      });
    }

    // Relasi dengan Appointment (sebagai dokter)
    if (models.Appointment) {
      Employee.hasMany(models.Appointment, {
        foreignKey: 'doctorId',
        as: 'appointments',
        constraints: false
      });
    }

    // Relasi dengan Prescription (sebagai dokter)
    if (models.Prescription) {
      Employee.hasMany(models.Prescription, {
        foreignKey: 'doctorId',
        as: 'prescriptions',
        constraints: false
      });
    }

    // Relasi dengan MedicalRecord (sebagai dokter)
    if (models.MedicalRecord) {
      Employee.hasMany(models.MedicalRecord, {
        foreignKey: 'doctorId',
        as: 'medicalRecords',
        constraints: false
      });
    }

    // Relasi dengan Receipt (sebagai creator/approver)
    if (models.Receipt) {
      Employee.hasMany(models.Receipt, {
        foreignKey: 'createdBy',
        as: 'createdReceipts',
        constraints: false
      });

      Employee.hasMany(models.Receipt, {
        foreignKey: 'approvedBy',
        as: 'approvedReceipts',
        constraints: false
      });
    }

    // Relasi dengan Return (sebagai creator)
    if (models.Return) {
      Employee.hasMany(models.Return, {
        foreignKey: 'createdBy',
        as: 'returns',
        constraints: false
      });
    }

    // Relasi dengan Approval (sebagai submitter/approver)
    if (models.Approval) {
      Employee.hasMany(models.Approval, {
        foreignKey: 'submittedById',
        as: 'submittedApprovals',
        constraints: false
      });

      Employee.hasMany(models.Approval, {
        foreignKey: 'approvedById',
        as: 'approvedApprovals',
        constraints: false
      });
    }
  };

  return Employee;
};
