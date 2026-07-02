import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import axios from 'axios';

interface ProductInfo {
  id: string;
  name: string;
  category: string;
  price: number;
  discountPercent?: number;
  discountedPrice?: number;
  stock: number;
  location: string;
  isAvailable: boolean;
  isBehindCounter: boolean;
  needsPrescription: boolean;
  alternatives?: Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
  }>;
}

interface AIResponse {
  analysis: string;
  possibleConditions: Array<{
    name: string;
    probability: number;
    description: string;
  }>;
  recommendations: Array<ProductInfo & {
    reason: string;
    confidence: number;
  }>;
  healthAdvice: Array<{
    type: 'lifestyle' | 'medication' | 'consultation';
    text: string;
    importance: 'low' | 'medium' | 'high';
  }>;
  needsMedicalAttention: boolean;
  warningMessage?: string;
  similarQueries?: string[];
  isFromMock: boolean;
}

// Mock medical conditions database for matching with products
const medicalConditions = [
  {
    id: 'cond001',
    name: 'Flu biasa',
    tags: ['flu', 'pilek', 'demam', 'batuk', 'hidung tersumbat', 'bersin'],
    description: 'Infeksi virus yang umum dengan gejala seperti demam, hidung tersumbat, bersin, dan nyeri tenggorokan.',
    suggestedProducts: ['p001', 'p002', 'p003', 'p007', 'p009'],
    needsMedicalAttention: false,
    probability: 0
  },
  {
    id: 'cond002',
    name: 'Alergi musiman',
    tags: ['alergi', 'bersin', 'gatal', 'mata berair', 'hidung tersumbat'],
    description: 'Reaksi alergi terhadap serbuk sari atau alergen di udara yang menyebabkan bersin, hidung tersumbat, dan mata berair.',
    suggestedProducts: ['p003', 'p004', 'p008'],
    needsMedicalAttention: false,
    probability: 0
  },
  {
    id: 'cond003',
    name: 'Sakit kepala tegang',
    tags: ['sakit kepala', 'pusing', 'tegang', 'nyeri kepala'],
    description: 'Sakit kepala yang disebabkan oleh ketegangan otot di leher dan kepala.',
    suggestedProducts: ['p001', 'p005'],
    needsMedicalAttention: false,
    probability: 0
  },
  {
    id: 'cond004',
    name: 'Migrain',
    tags: ['migren', 'migrain', 'sakit kepala berdenyut', 'mual', 'sensitif cahaya'],
    description: 'Sakit kepala berdenyut berulang yang sering disertai dengan mual dan sensitivitas terhadap cahaya dan suara.',
    suggestedProducts: ['p001', 'p006'],
    needsMedicalAttention: true,
    probability: 0
  },
  {
    id: 'cond005',
    name: 'Maag/Gastritis',
    tags: ['maag', 'nyeri perut', 'kembung', 'sakit lambung', 'mual'],
    description: 'Peradangan pada lapisan lambung yang menyebabkan nyeri perut, kembung, dan mual.',
    suggestedProducts: ['p010', 'p011'],
    needsMedicalAttention: false,
    probability: 0
  },
  {
    id: 'cond006',
    name: 'Diare',
    tags: ['diare', 'mencret', 'sakit perut', 'buang air besar cair'],
    description: 'Buang air besar cair yang terjadi lebih sering dari biasanya.',
    suggestedProducts: ['p012', 'p013'],
    needsMedicalAttention: false,
    probability: 0
  }
];

// Mock product database with location and availability
const mockProducts: ProductInfo[] = [
  {
    id: 'p001',
    name: 'Paracetamol 500mg',
    category: 'Analgesik & Antipiretik',
    price: 15000,
    stock: 45,
    location: 'Rak A3',
    isAvailable: true,
    isBehindCounter: false,
    needsPrescription: false
  },
  {
    id: 'p002',
    name: 'Pseudoephedrine HCl',
    category: 'Dekongestan',
    price: 25000,
    stock: 20,
    location: 'Rak B2',
    isAvailable: true,
    isBehindCounter: true,
    needsPrescription: false
  },
  {
    id: 'p003',
    name: 'Cetirizine 10mg',
    category: 'Antihistamin',
    price: 18000,
    stock: 30,
    location: 'Rak A5',
    isAvailable: true,
    isBehindCounter: false,
    needsPrescription: false,
    alternatives: [
      {
        id: 'p004',
        name: 'Loratadine 10mg',
        price: 20000,
        stock: 25
      }
    ]
  },
  {
    id: 'p004',
    name: 'Loratadine 10mg',
    category: 'Antihistamin',
    price: 20000,
    stock: 25,
    location: 'Rak A5',
    isAvailable: true,
    isBehindCounter: false,
    needsPrescription: false
  },
  {
    id: 'p005',
    name: 'Ibuprofen 400mg',
    category: 'NSAID',
    price: 22000,
    stock: 18,
    location: 'Rak A4',
    isAvailable: true,
    isBehindCounter: false,
    needsPrescription: false
  },
  {
    id: 'p006',
    name: 'Ergotamine',
    category: 'Anti-Migrain',
    price: 35000,
    stock: 10,
    location: 'Rak C1',
    isAvailable: true,
    isBehindCounter: true,
    needsPrescription: true
  },
  {
    id: 'p007',
    name: 'Vitamin C 1000mg',
    category: 'Vitamin & Supplement',
    price: 28000,
    stock: 50,
    location: 'Rak D2',
    isAvailable: true,
    isBehindCounter: false,
    needsPrescription: false
  },
  {
    id: 'p008',
    name: 'Eyedrop Allergy Relief',
    category: 'Tetes Mata',
    price: 30000,
    stock: 15,
    location: 'Rak E1',
    isAvailable: true,
    isBehindCounter: false,
    needsPrescription: false
  },
  {
    id: 'p009',
    name: 'Ambroxol',
    category: 'Ekspektoran',
    price: 18000,
    stock: 25,
    location: 'Rak B4',
    isAvailable: true,
    isBehindCounter: false,
    needsPrescription: false
  },
  {
    id: 'p010',
    name: 'Antasida',
    category: 'Obat Maag',
    price: 15000,
    stock: 40,
    location: 'Rak C3',
    isAvailable: true,
    isBehindCounter: false,
    needsPrescription: false
  },
  {
    id: 'p011',
    name: 'Omeprazole 20mg',
    category: 'Proton Pump Inhibitor',
    price: 25000,
    stock: 20,
    location: 'Rak C4',
    isAvailable: true,
    isBehindCounter: true,
    needsPrescription: false
  },
  {
    id: 'p012',
    name: 'Loperamide',
    category: 'Anti-diare',
    price: 18000,
    stock: 35,
    location: 'Rak C2',
    isAvailable: true,
    isBehindCounter: false,
    needsPrescription: false
  },
  {
    id: 'p013',
    name: 'Probiotik',
    category: 'Suplemen',
    price: 30000,
    stock: 28,
    location: 'Rak D3',
    isAvailable: true,
    isBehindCounter: false,
    needsPrescription: false,
    discountPercent: 10,
    discountedPrice: 27000
  }
];

// Simple health advice based on condition
const healthAdviceByCondition: Record<string, Array<{
  type: 'lifestyle' | 'medication' | 'consultation';
  text: string;
  importance: 'low' | 'medium' | 'high';
}>> = {
  'cond001': [ // Flu
    {
      type: 'lifestyle',
      text: 'Istirahat yang cukup dan minum banyak air putih untuk mempercepat pemulihan',
      importance: 'high'
    },
    {
      type: 'lifestyle',
      text: 'Hindari makanan pedas dan berminyak selama sakit',
      importance: 'medium'
    },
    {
      type: 'consultation',
      text: 'Jika gejala berlanjut lebih dari 3 hari atau demam tinggi, konsultasikan dengan dokter',
      importance: 'high'
    }
  ],
  'cond002': [ // Alergi
    {
      type: 'lifestyle',
      text: 'Hindari pemicu alergi jika diketahui',
      importance: 'high'
    },
    {
      type: 'lifestyle',
      text: 'Gunakan masker saat beraktivitas di luar jika alergi disebabkan oleh debu atau serbuk sari',
      importance: 'medium'
    },
    {
      type: 'medication',
      text: 'Antihistamin dapat membantu meredakan gejala, tapi mungkin menyebabkan kantuk',
      importance: 'medium'
    }
  ],
  'cond003': [ // Sakit kepala tegang
    {
      type: 'lifestyle',
      text: 'Kurangi stres dan lakukan teknik relaksasi seperti meditasi atau yoga',
      importance: 'high'
    },
    {
      type: 'lifestyle',
      text: 'Kompres hangat pada leher dan bahu dapat membantu mengurangi ketegangan',
      importance: 'medium'
    },
    {
      type: 'medication',
      text: 'Analgesik seperti paracetamol atau ibuprofen dapat meredakan nyeri',
      importance: 'medium'
    }
  ],
  'cond004': [ // Migrain
    {
      type: 'lifestyle',
      text: 'Identifikasi dan hindari pemicu migrain seperti stres, kurang tidur, atau makanan tertentu',
      importance: 'high'
    },
    {
      type: 'lifestyle',
      text: 'Beristirahat di ruangan gelap dan tenang saat serangan terjadi',
      importance: 'high'
    },
    {
      type: 'consultation',
      text: 'Migrain berulang sebaiknya dikonsultasikan dengan dokter untuk penanganan yang tepat',
      importance: 'high'
    }
  ],
  'cond005': [ // Maag
    {
      type: 'lifestyle',
      text: 'Makan dalam porsi kecil tapi sering',
      importance: 'high'
    },
    {
      type: 'lifestyle',
      text: 'Hindari makanan pedas, asam, dan berlemak',
      importance: 'high'
    },
    {
      type: 'lifestyle',
      text: 'Hindari minuman berkafein dan beralkohol',
      importance: 'medium'
    },
    {
      type: 'consultation',
      text: 'Jika gejala berlanjut lebih dari seminggu, konsultasikan dengan dokter',
      importance: 'high'
    }
  ],
  'cond006': [ // Diare
    {
      type: 'lifestyle',
      text: 'Minum banyak cairan untuk mencegah dehidrasi',
      importance: 'high'
    },
    {
      type: 'lifestyle',
      text: 'Konsumsi makanan lunak seperti bubur dan hindari makanan berminyak atau pedas',
      importance: 'medium'
    },
    {
      type: 'consultation',
      text: 'Jika diare berlangsung lebih dari 2 hari atau disertai demam tinggi dan darah, segera konsultasi dengan dokter',
      importance: 'high'
    }
  ]
};

// Simple NLP function to match query with conditions
const analyzeQuery = (query: string): {
  matchedConditions: Array<typeof medicalConditions[0] & { probability: number }>,
  needsMedicalAttention: boolean
} => {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/);
  
  // Calculate probability for each condition based on tag matches
  const conditionMatches = medicalConditions.map(condition => {
    const tagMatches = condition.tags.filter(tag => 
      queryLower.includes(tag) || words.some(word => tag.includes(word))
    );
    
    // Calculate probability based on match ratio
    let probability = Math.min(100, Math.round((tagMatches.length / condition.tags.length) * 100));
    
    // Boost probability if exact condition name is mentioned
    if (queryLower.includes(condition.name.toLowerCase())) {
      probability = Math.min(100, probability + 30);
    }
    
    return {
      ...condition,
      probability
    };
  });
  
  // Filter conditions with at least some probability and sort by highest
  const matchedConditions = conditionMatches
    .filter(condition => condition.probability > 20)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3); // Get top 3 matches
  
  // Check if any high probability condition needs medical attention
  const needsMedicalAttention = matchedConditions.some(
    condition => condition.needsMedicalAttention && condition.probability > 60
  );
  
  return {
    matchedConditions,
    needsMedicalAttention
  };
};

// Get product recommendations based on matched conditions
const getRecommendedProducts = (matchedConditions: Array<typeof medicalConditions[0] & { probability: number }>) => {
  // Collect all product IDs from matched conditions
  const productIds = new Set<string>();
  matchedConditions.forEach(condition => {
    condition.suggestedProducts.forEach(productId => {
      productIds.add(productId);
    });
  });
  
  // Get product details and add confidence and reason
  const recommendations = Array.from(productIds).map(productId => {
    const product = mockProducts.find(p => p.id === productId);
    if (!product) return null;
    
    // Find which conditions suggested this product
    const suggestingConditions = matchedConditions.filter(condition => 
      condition.suggestedProducts.includes(productId)
    );
    
    // Calculate confidence based on condition probabilities
    const confidence = Math.min(
      95,
      Math.round(
        suggestingConditions.reduce((sum, condition) => sum + condition.probability, 0) / 
        suggestingConditions.length
      )
    );
    
    // Generate reason text
    const reason = suggestingConditions.length > 0
      ? `Direkomendasikan untuk ${suggestingConditions[0].name.toLowerCase()}`
      : 'Produk yang mungkin membantu kondisi Anda';
    
    return {
      ...product,
      confidence,
      reason
    };
  }).filter(Boolean) as Array<ProductInfo & { reason: string; confidence: number }>;
  
  return recommendations.sort((a, b) => b.confidence - a.confidence);
};

// Get real inventory data if available
const fetchRealInventoryData = async (): Promise<ProductInfo[] | null> => {
  try {
    const response = await axios.get('http://127.0.0.1:50444/inventory', {
      timeout: 2000 // 2 second timeout
    });
    
    if (response.status === 200 && Array.isArray(response.data)) {
      // Map API response to our product structure
      return response.data.map((item: any) => ({
        id: item.id || item.productId || `p${String(item.productCode).padStart(3, '0')}`,
        name: item.name || item.productName,
        category: item.category || item.productCategory || 'Tidak dikategorikan',
        price: item.price || item.sellingPrice || 0,
        discountPercent: item.discountPercent || item.discountPercentage || undefined,
        discountedPrice: item.discountedPrice || undefined,
        stock: item.stock || item.stockQuantity || 0,
        location: item.location || item.shelfLocation || 'Tidak ditentukan',
        isAvailable: (item.stock || item.stockQuantity || 0) > 0,
        isBehindCounter: item.isBehindCounter || item.requiresPharmacist || false,
        needsPrescription: item.needsPrescription || item.requiresPrescription || false,
        alternatives: item.alternatives || undefined
      }));
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching inventory data:', error);
    return null;
  }
};

// Generate OpenAI prompt for the analysis
const generateOpenAIPrompt = (query: string, matchedConditions: typeof medicalConditions) => {
  return `
Analisis medis untuk keluhan: "${query}"

Berdasarkan keluhan tersebut, kemungkinan kondisi yang teridentifikasi adalah:
${matchedConditions.map(c => `- ${c.name} (${c.probability}%): ${c.description}`).join('\n')}

Berikan analisis singkat tentang keluhan tersebut dan saran yang tepat.
Jangan memberikan diagnosis pasti, tetapi berikan informasi yang membantu.
Respons harus dalam Bahasa Indonesia dan tidak lebih dari 3-4 kalimat.
  `;
};

// Call OpenAI API for the analysis text
const getAIAnalysis = async (prompt: string): Promise<string | null> => {
  // For now we'll use a mock analysis, but this would call the actual OpenAI API
  try {
    // This is where you would add the actual OpenAI API call
    // const response = await axios.post('https://api.openai.com/v1/chat/completions', {...})
    
    // Return mock analysis for now
    return `Berdasarkan keluhan yang disebutkan, terdapat kemungkinan kondisi yang dapat diidentifikasi. Berikut adalah beberapa rekomendasi produk yang mungkin membantu meringankan gejala. Namun, penting untuk diingat bahwa informasi ini tidak menggantikan konsultasi dengan tenaga medis profesional.`;
  } catch (error) {
    console.error('Error calling AI service:', error);
    return null;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Validate method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('API Request Body:', req.body);
  
  // Get session (optional in development)
  const session = await getServerSession(req, res, authOptions);
  
  if (process.env.NODE_ENV === 'production' && !session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Invalid request. Query is required.' });
    }
    
    // Analyze the query to match with potential medical conditions
    const { matchedConditions, needsMedicalAttention } = analyzeQuery(query);
    
    // Generate response content
    let isFromMock = true;
    
    // Try to fetch real inventory data first
    let inventoryData = await fetchRealInventoryData();
    
    // If real data unavailable, use mock data
    if (!inventoryData) {
      console.log("Using mock inventory data");
      inventoryData = mockProducts;
    } else {
      isFromMock = false;
    }
    
    // Get product recommendations
    let recommendations = getRecommendedProducts(matchedConditions);
    
    // If using real inventory, match and replace mock recommendations
    if (!isFromMock) {
      recommendations = recommendations.map(rec => {
        const realProduct = inventoryData!.find(p => 
          p.name.toLowerCase().includes(rec.name.toLowerCase()) ||
          rec.name.toLowerCase().includes(p.name.toLowerCase())
        );
        
        if (realProduct) {
          return {
            ...realProduct,
            reason: rec.reason,
            confidence: rec.confidence
          };
        }
        
        return rec;
      });
    }
    
    // Get health advice based on matched conditions
    const healthAdvice: Array<{
      type: 'lifestyle' | 'medication' | 'consultation';
      text: string;
      importance: 'low' | 'medium' | 'high';
    }> = [];
    
    matchedConditions.forEach(condition => {
      const advice = healthAdviceByCondition[condition.id];
      if (advice) {
        advice.forEach(item => {
          // Avoid duplicates
          if (!healthAdvice.some(a => a.text === item.text)) {
            healthAdvice.push(item);
          }
        });
      }
    });
    
    // Generate OpenAI prompt and get analysis
    const prompt = generateOpenAIPrompt(query, matchedConditions);
    const analysis = await getAIAnalysis(prompt) || 
      `Berdasarkan keluhan "${query}", berikut beberapa kemungkinan kondisi dan rekomendasi produk yang mungkin membantu meringankan gejala.`;
    
    // Prepare the response object
    const responseObject: AIResponse = {
      analysis,
      possibleConditions: matchedConditions.map(c => ({
        name: c.name,
        probability: c.probability,
        description: c.description
      })),
      recommendations,
      healthAdvice,
      needsMedicalAttention,
      warningMessage: needsMedicalAttention ? 
        "Gejala yang disebutkan mungkin memerlukan perhatian medis. Sebaiknya konsultasikan dengan dokter." : 
        undefined,
      similarQueries: [
        'Obat untuk flu dan batuk',
        'Cara mengatasi sakit kepala',
        'Supplement untuk meningkatkan imunitas'
      ],
      isFromMock
    };
    
    res.status(200).json(responseObject);
  } catch (error) {
    console.error('Error in AI assistant API:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request', 
      isFromMock: true 
    });
  }
}
