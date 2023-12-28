import { DataTypes, Model, Sequelize } from 'sequelize';

export class DepthUpdates extends Model {}

// @@unique([s, E])
// @@index([s, E])
export function initDepthUpdates(sequelize: Sequelize) {
  DepthUpdates.init(
    {
      a: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      b: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      E: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      s: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'depth_updates',
    },
  );
}
