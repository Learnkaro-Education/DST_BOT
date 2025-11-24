import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const LinkButtons = sequelize.define(
  "LinkButtons",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false }
  },
  {
    tableName: "LinkButtons",
    freezeTableName: true,
  }
);

export default LinkButtons;