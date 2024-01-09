import { DataTypes, Model, Sequelize } from 'sequelize';

export class Borders extends Model {
  s: string;
  min: number;
  max: number;
}

// @@unique([symbol, E])
export function initBorders(sequelize: Sequelize) {
  Borders.init(
    {
      s: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      min: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      max: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      E: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Borders',
      timestamps: false,
    },
  );
}
