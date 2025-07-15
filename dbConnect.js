// dbconnect.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('internship', 'root', 'CHIrag@23', {
    host:'localhost',
    port: 3306,
    dialect:'mysql'
});

// NOTE: Ensure tasks table has a taskDescription column (TEXT or VARCHAR). If not, add it via migration:
// ALTER TABLE tasks ADD COLUMN taskDescription TEXT;

// test the connection immediately upon loading
const dbConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Unable to connect to database!', error);
    }
};

module.exports = { dbConnection,sequelize };
