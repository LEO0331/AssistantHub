import { DataTypes } from 'sequelize';

// Additive migration. MySQL DDL implicitly commits; a failure between table
// creation and index creation needs manual inspection and migration repair.
// NEVER run destructive rollback/sync({alter:true}) on shared databases.
export async function up(qi) {
  await qi.createTable('idempotency_records', {
    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
    actor_id: {
      type: DataTypes.UUID, allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'RESTRICT', onUpdate: 'CASCADE'
    },
    idempotency_key: { type: DataTypes.STRING(64), allowNull: false },
    application_id: { type: DataTypes.UUID, allowNull: false },
    payload_hash: { type: DataTypes.CHAR(64), allowNull: false },
    response_body: { type: DataTypes.JSON, allowNull: true },
    request_id: { type: DataTypes.UUID, allowNull: false },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false }
  });
  await qi.addIndex('idempotency_records', ['actor_id', 'idempotency_key'], {
    unique: true, name: 'uq_idempotency_actor_key'
  });
  await qi.addIndex('idempotency_records', ['expires_at'], {
    name: 'idx_idempotency_expiry'
  });
  // Intentionally no FK on application_id: FK shared locks can deadlock two
  // different idempotency keys attempting optimistic writes to the same row.
  // The application UUID is validated and checked inside the same transaction.
}

export async function down() {
  throw new Error('Idempotency history rollback would destroy replay protection; restore a backup instead');
}
