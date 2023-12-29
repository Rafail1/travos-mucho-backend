import { DataTypes, Model, Sequelize } from 'sequelize';

export class DepthUpdates extends Model {
  a: Array<[string, string]>;
  b: Array<[string, string]>;
  E: Date;
  s: string;
}

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
      indexes: [
        {
          unique: true,
          fields: ['s', 'E'],
        },
        {
          name: 'time_index',
          using: 'BTREE',
          fields: [
            'E',
            {
              name: 'time',
              order: 'ASC',
            },
          ],
        },
      ],
    },
  );
}
