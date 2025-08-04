const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// user tablosu
const User = sequelize.define('User', { 
  id: {
    type: Sequelize.INTEGER, 
    primaryKey: true,
    autoIncrement: true 
  },
  username: {
    type: Sequelize.STRING, 
    allowNull: false, 
    unique: true, 
    validate: {
      len: [3, 30]
    }
  },
  email: {
    type: Sequelize.STRING, 
    allowNull: false, 
    unique: true, 
    validate: {
      isEmail: true
    }
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false 
  },
  isActive: {
    type: Sequelize.BOOLEAN, 
    defaultValue: true 
  },
  preferredModel: {
    type: Sequelize.STRING, 
    defaultValue: 'openai/gpt-3.5-turbo' 
  },
  preferredLanguage: {
    type: Sequelize.STRING, 
    defaultValue: 'tr' 
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10); //bcrypt ile hash'lenerek veritabanına yazılır.
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10); //güncellenirken de aynı
      }
    }
  }
});

// Database sync function
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    await sequelize.sync({ alter: true }); //Model değişikliklerine göre tabloyu günceller (veri kaybı olmadan).
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  User,
  syncDatabase
}; 