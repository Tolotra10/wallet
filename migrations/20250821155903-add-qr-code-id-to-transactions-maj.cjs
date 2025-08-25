'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('qr_codes', 'merchant_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'merchants',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('qr_codes', 'merchant_id');
  }
};
