// migrations/20250818135124-add-mobile-columns-to-transactions.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    
    await queryInterface.addColumn("Transactions", "provider", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Transactions", "phone", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("Transactions", "provider");
    await queryInterface.removeColumn("Transactions", "phone");
  },
};
