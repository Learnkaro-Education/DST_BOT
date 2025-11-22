    import { DataTypes } from "sequelize";
    import { sequelize } from "../db.js";

    export const Schedule = sequelize.define("Schedule", {
    channelId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    imageUrl: DataTypes.STRING,
    caption: DataTypes.TEXT,
    });

