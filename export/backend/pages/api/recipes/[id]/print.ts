import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import db from '../../../../../models';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    
    // Get recipe with all details
    const recipe = await db.Recipe.findByPk(id as string, {
      include: [
        {
          model: db.Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'sku'],
          required: false
        },
        {
          model: db.RecipeIngredient,
          as: 'ingredients',
          required: false,
          include: [
            {
              model: db.Product,
              as: 'material',
              attributes: ['id', 'name', 'unit'],
              required: false
            }
          ]
        }
      ]
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Generate HTML for printing
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Resep: ${recipe.name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .info-box {
            border: 1px solid #ddd;
            padding: 15px;
            text-align: center;
        }
        .info-box h3 {
            margin: 0 0 5px 0;
            font-size: 14px;
            color: #666;
        }
        .info-box p {
            margin: 0;
            font-size: 18px;
            font-weight: bold;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            font-size: 20px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .ingredients-table {
            width: 100%;
            border-collapse: collapse;
        }
        .ingredients-table th,
        .ingredients-table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        .ingredients-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .instructions ol {
            padding-left: 20px;
        }
        .instructions li {
            margin-bottom: 10px;
        }
        .cost-summary {
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 5px;
        }
        .cost-summary table {
            width: 100%;
        }
        .cost-summary td {
            padding: 5px 0;
        }
        .cost-summary .total {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #333;
            padding-top: 10px;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${recipe.name}</h1>
        <p>Kategori: ${recipe.category || 'Uncategorized'}</p>
        <p>Kode: ${recipe.code}</p>
    </div>

    <div class="info-grid">
        <div class="info-box">
            <h3>Waktu Persiapan</h3>
            <p>${recipe.preparation_time_minutes || 0} menit</p>
        </div>
        <div class="info-box">
            <h3>Waktu Masak</h3>
            <p>${recipe.cooking_time_minutes || 0} menit</p>
        </div>
        <div class="info-box">
            <h3>Total Waktu</h3>
            <p>${recipe.total_time_minutes || 0} menit</p>
        </div>
        <div class="info-box">
            <h3>Jumlah Porsi</h3>
            <p>${recipe.batch_size || 1} ${recipe.batch_unit}</p>
        </div>
    </div>

    <div class="section">
        <h2>Bahan-bahan</h2>
        <table class="ingredients-table">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Nama Bahan</th>
                    <th>Jumlah</th>
                    <th>Unit</th>
                    <th>Cost</th>
                </tr>
            </thead>
            <tbody>
                ${recipe.ingredients?.map((ing: any, index: number) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${ing.material?.name || 'N/A'}</td>
                        <td>${ing.quantity}</td>
                        <td>${ing.unit}</td>
                        <td>Rp ${(ing.subtotal_cost || 0).toLocaleString('id-ID')}</td>
                    </tr>
                `).join('') || '<tr><td colspan="5">Tidak ada bahan</td></tr>'}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Cara Memasak</h2>
        <div class="instructions">
            ${recipe.instructions ? `
                <ol>
                    ${recipe.instructions.split('\n').filter((i: string) => i.trim()).map((instruction: string) => 
                        `<li>${instruction}</li>`
                    ).join('')}
                </ol>
            ` : '<p>Tidak ada instruksi</p>'}
        </div>
    </div>

    <div class="section cost-summary">
        <h2>Ringkasan Biaya</h2>
        <table>
            <tr>
                <td>Total Cost Bahan:</td>
                <td>Rp ${(recipe.total_cost || 0).toLocaleString('id-ID')}</td>
            </tr>
            <tr>
                <td>Cost per Porsi:</td>
                <td>Rp ${((recipe.total_cost || 0) / (recipe.batch_size || 1)).toLocaleString('id-ID')}</td>
            </tr>
            ${recipe.product ? `
                <tr>
                    <td>Harga Jual:</td>
                    <td>Rp ${recipe.product.price.toLocaleString('id-ID')}</td>
                </tr>
                <tr class="total">
                    <td>Margin:</td>
                    <td>${(((recipe.product.price - (recipe.total_cost || 0)) / recipe.product.price * 100).toFixed(1))}%</td>
                </tr>
            ` : ''}
        </table>
    </div>

    <div class="footer">
        <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
        <p>Generated by BEDAGANG F&B Dashboard</p>
    </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (error: any) {
    console.error('Print recipe error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
