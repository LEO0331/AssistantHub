import { DataTypes } from 'sequelize';

// MySQL DDL implicitly commits. Umzug tracks successful migrations, but this
// multi-table migration is NOT atomic. In case of an interrupted fresh setup,
// recreate the *disposable* development/test DB after investigation; never
// auto-drop or sync/alter shared production data.
const id = () => ({ type: DataTypes.UUID, allowNull: false, primaryKey: true });
const stamp = () => ({ type: DataTypes.DATE, allowNull: false });

export async function up(qi) {
  await qi.createTable('users', {
    id: id(),
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('viewer', 'recruiter', 'admin'), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: stamp(),
    updated_at: stamp()
  });
  await qi.createTable('candidates', {
    id: id(),
    name: { type: DataTypes.STRING(120), allowNull: false },
    role: { type: DataTypes.STRING(80), allowNull: false },
    skills: { type: DataTypes.JSON, allowNull: false },
    availability: { type: DataTypes.STRING(40), allowNull: false },
    hourly_rate_usd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    created_at: stamp(),
    updated_at: stamp()
  });
  await qi.addIndex('candidates', ['role', 'availability'], { name: 'idx_candidates_role_availability' });

  await qi.createTable('applications', {
    id: id(),
    candidate_id: {
      type: DataTypes.UUID, allowNull: false, unique: true,
      references: { model: 'candidates', key: 'id' },
      onDelete: 'RESTRICT', onUpdate: 'CASCADE'
    },
    status: {
      type: DataTypes.ENUM('New', 'Contacted', 'Interview', 'Hired', 'Rejected'),
      allowNull: false, defaultValue: 'New'
    },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    created_at: stamp(),
    updated_at: stamp()
  });
  await qi.createTable('audit_events', {
    id: id(),
    application_id: {
      type: DataTypes.UUID, allowNull: false,
      references: { model: 'applications', key: 'id' },
      onDelete: 'RESTRICT', onUpdate: 'CASCADE'
    },
    actor_id: {
      type: DataTypes.UUID, allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'RESTRICT', onUpdate: 'CASCADE'
    },
    from_status: { type: DataTypes.STRING(32), allowNull: false },
    to_status: { type: DataTypes.STRING(32), allowNull: false },
    reason: { type: DataTypes.STRING(500), allowNull: true },
    request_id: { type: DataTypes.STRING(80), allowNull: false },
    occurred_at: stamp()
  });
  await qi.addIndex('audit_events', ['application_id', 'occurred_at'], { name: 'idx_audit_application_time' });
}

export async function down() {
  throw new Error('Destructive migration rollback is intentionally disabled; restore a database backup instead');
}
