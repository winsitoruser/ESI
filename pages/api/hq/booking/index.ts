import { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
type ServiceType = 'grooming' | 'clinic' | 'hotel' | 'transport' | 'daycare' | 'training' | 'other';

interface Booking {
  id: string;
  code: string;
  status: BookingStatus;
  petOwnerName: string;
  petOwnerPhone: string;
  petOwnerEmail: string;
  petName: string;
  petType: string;
  petBreed: string;
  serviceType: ServiceType;
  partnerName: string;
  partnerType: string;
  notes: string;
  scheduledAt: string;
  completedAt: string | null;
  totalFee: number;
  rating: number | null;
}

const mockBookings: Booking[] = [
  {
    id: 'b1', code: 'BKG-2026-0001', status: 'confirmed',
    petOwnerName: 'Budi Santoso', petOwnerPhone: '081234567890', petOwnerEmail: 'budi@email.com',
    petName: 'Max', petType: 'dog', petBreed: 'Golden Retriever',
    serviceType: 'grooming', partnerName: 'Happy Paws Petshop', partnerType: 'petshop',
    notes: 'Grooming lengkap + potong kuku',
    scheduledAt: '2026-07-04T09:00:00Z', completedAt: null, totalFee: 150000, rating: null,
  },
  {
    id: 'b2', code: 'BKG-2026-0002', status: 'pending',
    petOwnerName: 'Siti Rahmawati', petOwnerPhone: '081298765432', petOwnerEmail: 'siti@email.com',
    petName: 'Mimi', petType: 'cat', petBreed: 'Persia',
    serviceType: 'clinic', partnerName: 'Animal Care Clinic', partnerType: 'petclinic',
    notes: 'Vaksinasi tahunan + cek kesehatan',
    scheduledAt: '2026-07-05T14:00:00Z', completedAt: null, totalFee: 250000, rating: null,
  },
  {
    id: 'b3', code: 'BKG-2026-0003', status: 'in_progress',
    petOwnerName: 'Agus Wijaya', petOwnerPhone: '081355667788', petOwnerEmail: 'agus@email.com',
    petName: 'Luna', petType: 'cat', petBreed: 'Anggora',
    serviceType: 'hotel', partnerName: 'Pet Paradise Hotel', partnerType: 'pethotel',
    notes: 'Menginap 3 malam, makanan khusus',
    scheduledAt: '2026-07-03T12:00:00Z', completedAt: null, totalFee: 450000, rating: null,
  },
  {
    id: 'b4', code: 'BKG-2026-0004', status: 'completed',
    petOwnerName: 'Dewi Lestari', petOwnerPhone: '081477889900', petOwnerEmail: 'dewi@email.com',
    petName: 'Coco', petType: 'dog', petBreed: 'Pomeranian',
    serviceType: 'transport', partnerName: 'Pet Transport ID', partnerType: 'pettransport',
    notes: 'Antar jemput Jakarta-Bandung pp',
    scheduledAt: '2026-07-01T08:00:00Z', completedAt: '2026-07-01T14:00:00Z', totalFee: 350000, rating: 5,
  },
  {
    id: 'b5', code: 'BKG-2026-0005', status: 'cancelled',
    petOwnerName: 'Rudi Hermawan', petOwnerPhone: '081566778899', petOwnerEmail: 'rudi@email.com',
    petName: 'Bobby', petType: 'dog', petBreed: 'Bulldog',
    serviceType: 'grooming', partnerName: 'Happy Paws Petshop', partnerType: 'petshop',
    notes: 'Dibatalkan oleh pet owner',
    scheduledAt: '2026-06-30T10:00:00Z', completedAt: null, totalFee: 120000, rating: null,
  },
  {
    id: 'b6', code: 'BKG-2026-0006', status: 'pending',
    petOwnerName: 'Ani Permata', petOwnerPhone: '081611223344', petOwnerEmail: 'ani@email.com',
    petName: 'Kiki', petType: 'bird', petBreed: 'Lovebird',
    serviceType: 'daycare', partnerName: 'Happy Paws Petshop', partnerType: 'petshop',
    notes: 'Daycare 1 hari',
    scheduledAt: '2026-07-06T07:00:00Z', completedAt: null, totalFee: 80000, rating: null,
  },
  {
    id: 'b7', code: 'BKG-2026-0007', status: 'completed',
    petOwnerName: 'Budi Santoso', petOwnerPhone: '081234567890', petOwnerEmail: 'budi@email.com',
    petName: 'Max', petType: 'dog', petBreed: 'Golden Retriever',
    serviceType: 'clinic', partnerName: 'Animal Care Clinic', partnerType: 'petclinic',
    notes: 'Cek kesehatan rutin',
    scheduledAt: '2026-06-28T11:00:00Z', completedAt: '2026-06-28T11:45:00Z', totalFee: 200000, rating: 4,
  },
  {
    id: 'b8', code: 'BKG-2026-0008', status: 'no_show',
    petOwnerName: 'Dian Pratama', petOwnerPhone: '081722334455', petOwnerEmail: 'dian@email.com',
    petName: 'Oreo', petType: 'cat', petBreed: 'Himalaya',
    serviceType: 'clinic', partnerName: 'Animal Care Clinic', partnerType: 'petclinic',
    notes: 'Tidak datang tanpa konfirmasi',
    scheduledAt: '2026-06-29T15:00:00Z', completedAt: null, totalFee: 0, rating: null,
  },
];

const ITEMS_PER_PAGE = 20;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { search, status, serviceType, page: pageStr, limit: limitStr } = req.query;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(limitStr as string) || ITEMS_PER_PAGE));

  let filtered = [...mockBookings];

  // Filter by status
  if (status && typeof status === 'string') {
    filtered = filtered.filter(b => b.status === status);
  }

  // Filter by service type
  if (serviceType && typeof serviceType === 'string') {
    filtered = filtered.filter(b => b.serviceType === serviceType);
  }

  // Search by pet owner, pet name, or booking code
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    filtered = filtered.filter(b =>
      b.petOwnerName.toLowerCase().includes(q) ||
      b.petName.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      b.partnerName.toLowerCase().includes(q) ||
      b.petOwnerPhone.includes(q)
    );
  }

  // Sort by most recent scheduled date
  filtered.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return res.status(200).json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages },
  });
}

export default withHQAuth(handler);
