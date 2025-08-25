'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('merchants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      merchant_id: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      business_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      business_type: {
        type: Sequelize.ENUM('restaurant', 'retail', 'service', 'online', 'healthcare', 'education', 'other'),
        allowNull: false
      },
      contact_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      address: {
        type: Sequelize.JSON,
        allowNull: false
      },
      website: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      logo_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'suspended'),
        defaultValue: 'pending'
      },
      kyc_status: {
        type: Sequelize.ENUM('pending', 'verified', 'rejected'),
        defaultValue: 'pending'
      },
      kyc_documents: {
        type: Sequelize.JSON,
        allowNull: true
      },
      commission_rate: {
        type: Sequelize.DECIMAL(5,2),
        defaultValue: 2.50
      },
      settlement_frequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly'),
        defaultValue: 'weekly'
      },
      bank_details: {
        type: Sequelize.JSON,
        allowNull: true
      },
      api_key: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      webhook_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      monthly_volume: {
        type: Sequelize.DECIMAL(15,2),
        defaultValue: 0.00
      },
      total_transactions: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('merchants', ['merchant_id']);
    await queryInterface.addIndex('merchants', ['email']);
    await queryInterface.addIndex('merchants', ['status']);
    await queryInterface.addIndex('merchants', ['kyc_status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('merchants');
  }
};
