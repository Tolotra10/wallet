import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'digital_wallet',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

// Fonction pour créer la base si elle n'existe pas
export async function createDatabaseIfNotExists() {
  // On crée une connexion *sans* base pour créer la DB
  const sequelizeWithoutDB = new Sequelize('', process.env.DB_USER || 'root', process.env.DB_PASSWORD || '', {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  });

  try {
    await sequelizeWithoutDB.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    console.log(`✅ Base "${process.env.DB_NAME}" créée ou déjà existante.`);
  } catch (error) {
    console.error('❌ Erreur lors de la création de la base :', error);
    throw error;
  } finally {
    await sequelizeWithoutDB.close();
  }
}

// Fonction de test de connexion (comme avant)
export async function testDBConnection() {
  try {
    await sequelize.authenticate();
    console.log(`✅ Connexion DB réussie : ${process.env.DB_NAME}`);
  } catch (err) {
    console.error('❌ Impossible de se connecter à la base de données:', err);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
}

export { sequelize };
