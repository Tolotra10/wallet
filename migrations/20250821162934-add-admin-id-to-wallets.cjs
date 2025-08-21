'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ajouter la colonne avec CHAR(36) + utf8mb4_bin
    await queryInterface.addColumn('wallets', 'admin_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
    });

    // Harmoniser charset et collation avec admin_users.id
    await queryInterface.sequelize.query(`
      ALTER TABLE wallets 
      MODIFY admin_id CHAR(36) 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_bin NULL;
    `);

    // Ajouter la clé étrangère
    await queryInterface.sequelize.query(`
      ALTER TABLE wallets
      ADD CONSTRAINT fk_wallets_admin
      FOREIGN KEY (admin_id) REFERENCES admin_users(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE wallets DROP FOREIGN KEY fk_wallets_admin;
    `);
    await queryInterface.removeColumn('wallets', 'admin_id');
  }
};
