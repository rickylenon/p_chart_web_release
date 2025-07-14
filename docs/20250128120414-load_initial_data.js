/**
 * Migration: Load Initial Data
 * 
 * This migration populates the database with initial seed data for:
 * 1. Operation Steps - The sequential manufacturing process steps
 * 2. Defects - Possible defects that can occur during manufacturing
 * 
 * Operation Steps follow this specific sequence:
 * - OP10: Cable Cutting (Initial process)
 * - OP15: 1st Side Process
 * - OP20: 2nd Side Process
 * - OP30: Taping Process
 * - OP40: QC Sampling (Final quality check)
 * 
 * This sequence matches the manufacturing process defined in lib/models/operation.dart
 * and represents the official production flow.
 * 
 * Defects are loaded from an external data file (../data/defects.js) and include
 * detailed information about possible manufacturing defects, their categories,
 * and whether they are reworkable.
 */

module.exports = {
    /**
     * Up Migration
     * Adds the initial seed data to the database
     * 
     * @param {Object} queryInterface - Sequelize Query Interface
     * @param {Object} Sequelize - Sequelize instance
     */
    async up(queryInterface, Sequelize) {
        // First, clear any existing operation steps to prevent duplicates or incorrect data
        await queryInterface.bulkDelete('operation_steps', null, {});

        // Load operation steps in sequential order
        // Each step has a label, operation number, and step order (0-based index)
        // These steps match the official process defined in lib/models/operation.dart
        console.log('Loading operation steps...');
        await queryInterface.bulkInsert('operation_steps', [
            { label: 'Cable Cutting OP10', operation_number: 'OP10', step_order: 0 },
            { label: '1st Side Process OP15', operation_number: 'OP15', step_order: 1 },
            { label: '2nd Side Process OP20', operation_number: 'OP20', step_order: 2 },
            { label: 'Taping Process OP30', operation_number: 'OP30', step_order: 3 },
            { label: 'QC Sampling OP40', operation_number: 'OP40', step_order: 4 }
        ], { ignoreDuplicates: true }); // Prevents duplicate entries if data already exists

        // Load defects from external data file
        // Each defect includes category, operation, name, description, reworkable status, and machine
        console.log('Loading defects...');
        const defectsData = require('../data/defects');
        for (const defect of defectsData) {
            await queryInterface.bulkInsert('defects', [{
                category: defect.category,
                applicable_operation: defect.applicable_operation,
                name: defect.name,
                description: defect.description || '', // Default to empty string if no description
                reworkable: defect.reworkable || false, // Default to false if not specified
                machine: defect.machine
            }], { ignoreDuplicates: true });
        }
    },

    /**
     * Down Migration
     * Removes all seeded data from the database
     * 
     * @param {Object} queryInterface - Sequelize Query Interface
     * @param {Object} Sequelize - Sequelize instance
     */
    async down(queryInterface, Sequelize) {
        // Remove all seeded data from both tables
        await queryInterface.bulkDelete('operation_steps', null, {});
        await queryInterface.bulkDelete('defects', null, {});
    }
};