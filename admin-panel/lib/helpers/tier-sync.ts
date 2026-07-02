/**
 * Helper functions for syncing customer tier with loyalty program
 */

const Customer = require('../../models/Customer');
const LoyaltyTier = require('../../models/LoyaltyTier');

/**
 * Calculate and update customer tier based on total spending
 * @param customerId - Customer UUID
 * @returns Updated customer with new tier
 */
export async function syncCustomerTier(customerId: string) {
  try {
    const customer = await Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get all active tiers sorted by minSpending descending
    const tiers = await LoyaltyTier.findAll({
      where: { isActive: true },
      order: [['minSpending', 'DESC']]
    });

    if (tiers.length === 0) {
      console.warn('No active tiers found, skipping tier sync');
      return customer;
    }

    // Find appropriate tier based on totalSpent
    const totalSpent = parseFloat(customer.totalSpent) || 0;
    let newTier = tiers[tiers.length - 1]; // Default to lowest tier

    for (const tier of tiers) {
      if (totalSpent >= parseFloat(tier.minSpending)) {
        newTier = tier;
        break;
      }
    }

    const oldTier = customer.membershipLevel;
    const tierChanged = oldTier !== newTier.tierName;

    // Update customer tier and discount
    await customer.update({
      membershipLevel: newTier.tierName,
      discount: parseFloat(newTier.discountPercentage),
      type: totalSpent > 0 ? 'member' : 'walk-in' // Auto set to member if has spending
    });

    if (tierChanged) {
      console.log(`Customer ${customer.name} tier updated: ${oldTier} → ${newTier.tierName}`);
    }

    return customer;
  } catch (error) {
    console.error('Error syncing customer tier:', error);
    throw error;
  }
}

/**
 * Calculate points earned based on tier multiplier
 * @param amount - Transaction amount
 * @param tierName - Customer's tier name
 * @returns Points earned
 */
export async function calculatePointsEarned(amount: number, tierName: string): Promise<number> {
  try {
    const tier = await LoyaltyTier.findOne({
      where: { 
        tierName,
        isActive: true 
      }
    });

    if (!tier) {
      // Default multiplier if tier not found
      return Math.floor(amount / 10000); // 1 point per 10,000
    }

    const multiplier = parseFloat(tier.pointMultiplier) || 1.0;
    const basePoints = Math.floor(amount / 10000);
    
    return Math.floor(basePoints * multiplier);
  } catch (error) {
    console.error('Error calculating points:', error);
    return Math.floor(amount / 10000); // Fallback to base calculation
  }
}

/**
 * Get tier discount percentage
 * @param tierName - Customer's tier name
 * @returns Discount percentage
 */
export async function getTierDiscount(tierName: string): Promise<number> {
  try {
    const tier = await LoyaltyTier.findOne({
      where: { 
        tierName,
        isActive: true 
      }
    });

    if (!tier) {
      return 0;
    }

    return parseFloat(tier.discountPercentage) || 0;
  } catch (error) {
    console.error('Error getting tier discount:', error);
    return 0;
  }
}

/**
 * Check if customer qualifies for tier upgrade
 * @param customerId - Customer UUID
 * @returns Upgrade information
 */
export async function checkTierUpgrade(customerId: string) {
  try {
    const customer = await Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    const tiers = await LoyaltyTier.findAll({
      where: { isActive: true },
      order: [['minSpending', 'DESC']]
    });

    const totalSpent = parseFloat(customer.totalSpent) || 0;
    let correctTier = tiers[tiers.length - 1];

    for (const tier of tiers) {
      if (totalSpent >= parseFloat(tier.minSpending)) {
        correctTier = tier;
        break;
      }
    }

    const currentTier = tiers.find((t: any) => t.tierName === customer.membershipLevel);
    const currentLevel = currentTier ? currentTier.tierLevel : 0;
    const correctLevel = correctTier.tierLevel;

    return {
      needsUpgrade: customer.membershipLevel !== correctTier.tierName,
      currentTier: customer.membershipLevel,
      correctTier: correctTier.tierName,
      currentLevel,
      correctLevel,
      totalSpent,
      nextTier: correctLevel < tiers.length ? tiers.find((t: any) => t.tierLevel === correctLevel + 1) : null
    };
  } catch (error) {
    console.error('Error checking tier upgrade:', error);
    throw error;
  }
}
