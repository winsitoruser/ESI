const db = require('../../../../models');
const { Recipe, RecipeIngredient, Product } = db;

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: `Method ${method} not allowed`
    });
  }

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Recipe ID is required'
    });
  }

  try {
    // Fetch recipe with ingredients
    const recipe = await Recipe.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku']
        },
        {
          model: RecipeIngredient,
          as: 'ingredients',
          include: [
            {
              model: Product,
              as: 'material',
              attributes: ['id', 'name', 'sku', 'unit', 'price']
            }
          ]
        }
      ]
    });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe tidak ditemukan'
      });
    }

    // Generate HTML for PDF
    const html = generateRecipePDFHTML(recipe);

    // Return HTML (client will use browser print or PDF library)
    return res.status(200).json({
      success: true,
      data: {
        recipe,
        html
      }
    });

  } catch (error) {
    console.error('Recipe Export PDF API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

function generateRecipePDFHTML(recipe) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const ingredientsHTML = recipe.ingredients.map(ing => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ing.material?.name || 'N/A'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${ing.quantity} ${ing.unit}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(ing.unit_cost)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(ing.subtotal_cost)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Recipe: ${recipe.name}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #7c3aed;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #7c3aed;
          margin: 0;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .info-item {
          padding: 10px;
          background: #f3f4f6;
          border-radius: 5px;
        }
        .info-label {
          font-weight: bold;
          color: #6b7280;
          font-size: 12px;
        }
        .info-value {
          color: #111827;
          font-size: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #7c3aed;
          color: white;
          padding: 12px 8px;
          text-align: left;
        }
        .total-row {
          font-weight: bold;
          background: #f3f4f6;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${recipe.name}</h1>
        <p style="color: #6b7280;">SKU: ${recipe.code} | Category: ${recipe.category || 'N/A'}</p>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Batch Size</div>
          <div class="info-value">${recipe.batch_size} ${recipe.batch_unit}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Preparation Time</div>
          <div class="info-value">${recipe.total_time_minutes || 0} minutes</div>
        </div>
        <div class="info-item">
          <div class="info-label">Total Cost</div>
          <div class="info-value">${formatCurrency(recipe.total_cost)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Cost per Unit</div>
          <div class="info-value">${formatCurrency(recipe.cost_per_unit)}</div>
        </div>
      </div>

      ${recipe.description ? `
        <div style="margin-bottom: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 5px;">
          <strong>Description:</strong><br>
          ${recipe.description}
        </div>
      ` : ''}

      <h2 style="color: #7c3aed; margin-top: 30px;">Ingredients</h2>
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Unit Cost</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${ingredientsHTML}
          <tr class="total-row">
            <td colspan="3" style="padding: 12px 8px; text-align: right;">TOTAL COST:</td>
            <td style="padding: 12px 8px; text-align: right;">${formatCurrency(recipe.total_cost)}</td>
          </tr>
        </tbody>
      </table>

      ${recipe.instructions ? `
        <h2 style="color: #7c3aed; margin-top: 30px;">Instructions</h2>
        <div style="padding: 15px; background: #f3f4f6; border-radius: 5px;">
          ${recipe.instructions}
        </div>
      ` : ''}

      ${recipe.notes ? `
        <h2 style="color: #7c3aed; margin-top: 30px;">Notes</h2>
        <div style="padding: 15px; background: #fef3c7; border-radius: 5px;">
          ${recipe.notes}
        </div>
      ` : ''}

      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString('id-ID', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p>BEDAGANG Cloud POS - Recipe Management System</p>
        <p style="margin-top: 20px; font-size: 10px;">Version: ${recipe.current_version || 1}</p>
      </div>

      <script>
        // Auto print when loaded (optional)
        // window.onload = () => window.print();
      </script>
    </body>
    </html>
  `;
}
