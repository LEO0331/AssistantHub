import { DataTypes } from 'sequelize';

// The models describe the existing tables. Schema changes belong in migrations,
// never sequelize.sync({ alter: true }) on a shared database.
export function defineModels(sequelize) {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('viewer', 'recruiter', 'admin'), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false }
  }, { tableName: 'users', timestamps: false });

  const Candidate = sequelize.define('Candidate', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    role: { type: DataTypes.STRING(80), allowNull: false },
    skills: { type: DataTypes.JSON, allowNull: false },
    availability: { type: DataTypes.STRING(40), allowNull: false },
    hourly_rate_usd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false }
  }, { tableName: 'candidates', timestamps: false });

  const Application = sequelize.define('Application', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    candidate_id: { type: DataTypes.UUID, allowNull: false, unique: true },
    status: { type: DataTypes.ENUM('New', 'Contacted', 'Interview', 'Hired', 'Rejected'), allowNull: false, defaultValue: 'New' },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false }
  }, { tableName: 'applications', timestamps: false });

  const AuditEvent = sequelize.define('AuditEvent', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    application_id: { type: DataTypes.UUID, allowNull: false },
    actor_id: { type: DataTypes.UUID, allowNull: false },
    from_status: { type: DataTypes.STRING(32), allowNull: false },
    to_status: { type: DataTypes.STRING(32), allowNull: false },
    reason: { type: DataTypes.STRING(500), allowNull: true },
    request_id: { type: DataTypes.STRING(80), allowNull: false },
    occurred_at: { type: DataTypes.DATE, allowNull: false }
  }, { tableName: 'audit_events', timestamps: false });

  Candidate.hasOne(Application, { foreignKey: 'candidate_id' });
  Application.belongsTo(Candidate, { foreignKey: 'candidate_id' });
  Application.hasMany(AuditEvent, { foreignKey: 'application_id' });
  AuditEvent.belongsTo(Application, { foreignKey: 'application_id' });
  User.hasMany(AuditEvent, { foreignKey: 'actor_id' });
  AuditEvent.belongsTo(User, { foreignKey: 'actor_id' });

  return { User, Candidate, Application, AuditEvent };
}
