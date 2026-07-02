import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import axios from 'axios';

interface HealthRecord {
  id: string;
  date: string;
  type: 'purchase' | 'consultation' | 'prescription';
  description: string;
  items?: Array<{
    name: string;
    quantity: number;
    category: string;
  }>;
  notes?: string;
  consultationWith?: string;
}

interface HealthInsight {
  type: string;
  description: string;
  relevance: 'high' | 'medium' | 'low';
  recommendedAction?: string;
}

interface CustomerHealthData {
  customerId: string;
  customerName: string;
  healthRecords: HealthRecord[];
  insights: HealthInsight[];
  isFromMock: boolean;
}

// Mock data for testing
const getMockHealthRecords = (customerId: string): HealthRecord[] => {
  return [
    {
      id: 'hr001',
      date: '2025-05-05',
      type: 'purchase',
      description: 'Pembelian obat rutin',
      items: [
        { name: 'Amlodipin 10mg', quantity: 30, category: 'Obat Hipertensi' },
        { name: 'Vitamin C 1000mg', quantity: 10, category: 'Suplemen' }
      ]
    },
    {
      id: 'hr002',
      date: '2025-04-22',
      type: 'consultation',
      description: 'Konsultasi keluhan nyeri dada',
      consultationWith: 'Dr. Ahmad Wijaya',
      notes: 'Pasien mengeluhkan nyeri dada setelah aktivitas berat. Disarankan untuk melakukan pemeriksaan jantung.'
    },
    {
      id: 'hr003',
      date: '2025-04-15',
      type: 'purchase',
      description: 'Pembelian obat flu',
      items: [
        { name: 'Paracetamol 500mg', quantity: 10, category: 'Analgesik' },
        { name: 'Pseudoephedrine', quantity: 6, category: 'Dekongestan' },
        { name: 'Cetirizine 10mg', quantity: 10, category: 'Antihistamin' }
      ]
    },
    {
      id: 'hr004',
      date: '2025-03-30',
      type: 'prescription',
      description: 'Resep dokter untuk hipertensi',
      items: [
        { name: 'Amlodipin 10mg', quantity: 30, category: 'Obat Hipertensi' },
        { name: 'Candesartan 8mg', quantity: 30, category: 'Obat Hipertensi' }
      ],
      notes: 'Pasien diminta untuk kontrol tekanan darah setiap minggu'
    }
  ];
};

const getMockInsights = (customerId: string): HealthInsight[] => {
  return [
    {
      type: 'Pola Pembelian',
      description: 'Pelanggan rutin membeli obat hipertensi (Amlodipin) setiap bulan',
      relevance: 'high',
      recommendedAction: 'Tawarkan paket langganan obat hipertensi dengan diskon'
    },
    {
      type: 'Kepatuhan Medikasi',
      description: 'Terdeteksi jeda dalam pembelian obat hipertensi selama 10 hari pada bulan Maret',
      relevance: 'medium',
      recommendedAction: 'Ingatkan pentingnya konsumsi obat rutin'
    },
    {
      type: 'Kemungkinan Kondisi',
      description: 'Riwayat pembelian menunjukkan potensi masalah jantung (berdasarkan konsultasi dan jenis obat)',
      relevance: 'high',
      recommendedAction: 'Sarankan pemeriksaan jantung rutin'
    },
    {
      type: 'Interaksi Obat',
      description: 'Beberapa obat yang dibeli memiliki potensi interaksi (Amlodipin dengan suplemen tertentu)',
      relevance: 'medium',
      recommendedAction: 'Berikan edukasi tentang interaksi obat'
    }
  ];
};

// Get mock customer names based on ID
const getMockCustomerName = (customerId: string): string => {
  const customers: Record<string, string> = {
    '12345': 'Budi Santoso',
    '12346': 'Siti Aminah',
    '12347': 'Joko Widodo',
    '12348': 'Ani Yudhoyono',
    '12349': 'Prabowo Subianto'
  };
  
  return customers[customerId] || 'Pelanggan Tidak Dikenal';
};

// Get real customer data if available
const fetchRealCustomerHealthData = async (customerId: string): Promise<CustomerHealthData | null> => {
  try {
    // Try to connect to actual pharmacy system API
    const response = await axios.get(`http://127.0.0.1:50444/customers/${customerId}/health`, {
      timeout: 2000 // 2 second timeout
    });
    
    if (response.status === 200 && response.data) {
      // Map API response to our data structure
      return {
        customerId,
        customerName: response.data.customerName || getMockCustomerName(customerId),
        healthRecords: response.data.healthRecords || [],
        insights: response.data.insights || [],
        isFromMock: false
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching customer health data:', error);
    return null;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Validate method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Get session (optional in development)
  const session = await getServerSession(req, res, authOptions);
  
  if (process.env.NODE_ENV === 'production' && !session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }
    
    // Try to get real data first
    let customerData = await fetchRealCustomerHealthData(id);
    
    // If real data unavailable, use mock data
    if (!customerData) {
      console.log(`Using mock data for customer ID ${id}`);
      
      customerData = {
        customerId: id,
        customerName: getMockCustomerName(id),
        healthRecords: getMockHealthRecords(id),
        insights: getMockInsights(id),
        isFromMock: true
      };
    }
    
    res.status(200).json(customerData);
  } catch (error) {
    console.error('Error in customer health profile API:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      isFromMock: true
    });
  }
}
