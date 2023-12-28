import { DataTypes, Model, Sequelize } from 'sequelize';

export class OrderBookSnapshot extends Model {}

// @@unique([symbol, E])
export function initOrderBookSnapshot(sequelize: Sequelize) {
  OrderBookSnapshot.init(
    {
      lastUpdateId: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      asks: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      bids: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      E: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      symbol: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'order_book_snapshot',
    },
  );
}
