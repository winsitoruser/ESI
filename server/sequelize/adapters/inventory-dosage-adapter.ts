/**
 * Inventory Dosage Adapter
 * Handles database operations for dosage forms (for pharmacy products)
 */

import db from '@/models';

/**
 * Get all dosage forms
 */
export async function getAllDosageForms(tenantId?: string) {
  try {
    // Placeholder - dosage forms might be stored in product attributes or separate table
    const dosageForms = [
      { id: 1, name: 'Tablet', description: 'Solid dosage form' },
      { id: 2, name: 'Capsule', description: 'Gelatin capsule' },
      { id: 3, name: 'Syrup', description: 'Liquid dosage form' },
      { id: 4, name: 'Injection', description: 'Injectable solution' },
      { id: 5, name: 'Cream', description: 'Topical cream' },
      { id: 6, name: 'Ointment', description: 'Topical ointment' }
    ];

    return dosageForms;
  } catch (error) {
    console.error('Error fetching dosage forms:', error);
    return [];
  }
}

/**
 * Get dosage form by ID
 */
export async function getDosageFormById(dosageId: number, tenantId?: string) {
  try {
    const dosageForms = await getAllDosageForms(tenantId);
    return dosageForms.find(d => d.id === dosageId) || null;
  } catch (error) {
    console.error('Error fetching dosage form by ID:', error);
    return null;
  }
}

export default {
  getAllDosageForms,
  getDosageFormById
};
