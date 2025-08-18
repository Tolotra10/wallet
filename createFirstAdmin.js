// createFirstAdmin.js
import { sequelize } from './config/database.js';
import { AdminUser } from './models/AdminUser.js';

(async () => {
  try {
    // Connexion à la base
    await sequelize.authenticate();
    console.log('✅ Connexion à la base réussie');

    // Synchroniser le modèle (⚠️ ne fait pas de DROP TABLE)
    await sequelize.sync();

    // Création du super_admin
    const admin = await AdminUser.create({
      username: 'superadmin',
      email: 'tolotra1010.perso@gmail.com',
      password_hash: 'SuperMotDePasseSecurise123!',
      first_name: 'Super',
      last_name: 'Admin',
      role: 'super_admin',
      permissions: ['*'], // tous les droits
      is_active: true
    });

    console.log('✅ Super admin créé avec succès :');
    console.log(admin.toJSON());
  } catch (error) {
    console.error('❌ Erreur lors de la création du super admin :', error.message);
  } finally {
    await sequelize.close();
    process.exit();
  }
})();
