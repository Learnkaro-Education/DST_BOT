    import { Sequelize } from "sequelize";

    export const sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
            {
                host: process.env.DB_HOST,
                dialect: "postgres",
                port: process.env.DB_PORT,
                logging: false,
            }
    );

    sequelize.authenticate()
    .then(() => console.log("DB Connected"))
    .catch(err => console.error("DB Error:", err));
