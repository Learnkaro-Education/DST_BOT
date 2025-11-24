const Channel = sequelize.define("Channel", {
    code: { type: DataTypes.STRING, allowNull: false },
    channel_id: { type: DataTypes.STRING, allowNull: false },
}, {
    tableName: "Channels", 
    freezeTableName: true   
});
