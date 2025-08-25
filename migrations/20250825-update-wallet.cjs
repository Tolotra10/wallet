'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('wallets', 'wallet_number', {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('wallets', 'wallet_number', {
      type: Sequelize.STRING(20), // valeur originale
      allowNull: false,
      unique: true
    });
  }
};
