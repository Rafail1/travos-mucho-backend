import { DataTypes, Model, Sequelize } from 'sequelize';

export class AggTrades extends Model {}

// @@unique([s, a])
// @@index([s, E])
export function initAggTrades(sequelize: Sequelize) {
  AggTrades.init(
    {
      a: {
        type: DataTypes.BIGINT,
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
      p: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      q: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      m: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'agg_trades',
      indexes: [
        {
          unique: true,
          fields: ['s', 'a'],
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
