const { Sequelize } = require('sequelize');
const config = require('./index');

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'mysql',
    
    // Connection pool configuration
    pool: {
      max: 10,        // Maximum number of connections in pool
      min: 0,         // Minimum number of connections in pool
      acquire: 30000, // Maximum time (ms) to acquire a connection
      idle: 10000,    // Maximum time (ms) a connection can be idle
    },
    
    // Character set configuration for full Unicode support (including emoji)
    dialectOptions: {
      charset: 'utf8mb4',
    },
    
    // Define default charset for models
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: true, // Use snake_case for column names
      paranoid: true,    // Enable soft delete (deleted_at)
    },
    
    // Logging configuration
    logging: config.server.env === 'development' ? console.log : false,
    
    // Timezone configuration
    timezone: '+08:00',
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection,
};
