const db = require('../../../models');
const { Product } = db;

export default async function handler(req, res) {
  const { method, query } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: `Method ${method} not allowed`
    });
  }

  try {
    const { sku } = query;

    if (!sku) {
      return res.status(400).json({
        success: false,
        message: 'SKU parameter is required'
      });
    }

    // Check if SKU exists
    const existingProduct = await Product.findOne({
      where: { sku: sku }
    });

    return res.status(200).json({
      success: true,
      available: !existingProduct,
      message: existingProduct 
        ? 'SKU sudah digunakan' 
        : 'SKU tersedia'
    });

  } catch (error) {
    console.error('Check SKU API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
