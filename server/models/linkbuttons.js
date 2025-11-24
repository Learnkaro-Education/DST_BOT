import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const LinkButtons = sequelize.define(
  "LinkButtons",
  {
    text: { type: DataTypes.STRING, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false }
  },
  {
    tableName: "LinkButtons",
    freezeTableName: true,
    timestamps: false,
  }
);

export default LinkButtons;