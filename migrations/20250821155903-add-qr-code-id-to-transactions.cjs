'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. D'abord ajouter la colonne sans la contrainte de clé étrangère
    await queryInterface.sequelize.query(`
      ALTER TABLE transactions 
      ADD COLUMN qr_code_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL
    `);

    // 2. Créer l'index
    await queryInterface.addIndex('transactions', ['qr_code_id'], {
      name: 'transactions_qr_code_id'
    });

    // 3. Ajouter la contrainte de clé étrangère
    await queryInterface.sequelize.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT transactions_qr_code_id_fk 
      FOREIGN KEY (qr_code_id) 
      REFERENCES pending_qr_transactions(id) 
      ON DELETE SET NULL 
      ON UPDATE CASCADE
    `);
  },

  async down(queryInterface, Sequelize) {
    // 1. Supprimer la contrainte de clé étrangère
    await queryInterface.sequelize.query(`
      ALTER TABLE transactions 
      DROP FOREIGN KEY transactions_qr_code_id_fk
    `);

    // 2. Supprimer l'index
    await queryInterface.removeIndex('transactions', 'transactions_qr_code_id');

    // 3. Supprimer la colonne
    await queryInterface.removeColumn('transactions', 'qr_code_id');
  }
};