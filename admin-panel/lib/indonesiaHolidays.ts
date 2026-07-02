// Indonesia National Holidays 2026
// Source: Kalender resmi Indonesia

export interface Holiday {
  date: string;
  name: string;
  type: 'national' | 'religious' | 'regional';
  isWeekend?: boolean;
}

export const indonesiaHolidays2026: Holiday[] = [
  // Januari
  { date: '2026-01-01', name: 'Tahun Baru Masehi', type: 'national' },
  
  // Februari
  { date: '2026-02-17', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'religious' },
  { date: '2026-02-18', name: 'Tahun Baru Imlek 2577', type: 'religious' },
  
  // Maret
  { date: '2026-03-22', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', type: 'religious' },
  { date: '2026-03-31', name: 'Idul Fitri 1447 H', type: 'religious' },
  
  // April
  { date: '2026-04-01', name: 'Idul Fitri 1447 H', type: 'religious' },
  { date: '2026-04-03', name: 'Wafat Isa Al Masih', type: 'religious' },
  
  // Mei
  { date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'national' },
  { date: '2026-05-14', name: 'Kenaikan Isa Al Masih', type: 'religious' },
  { date: '2026-05-26', name: 'Hari Raya Waisak 2570', type: 'religious' },
  
  // Juni
  { date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'national' },
  { date: '2026-06-07', name: 'Idul Adha 1447 H', type: 'religious' },
  { date: '2026-06-28', name: 'Tahun Baru Islam 1448 H', type: 'religious' },
  
  // Agustus
  { date: '2026-08-17', name: 'Hari Kemerdekaan RI', type: 'national' },
  
  // September
  { date: '2026-09-06', name: 'Maulid Nabi Muhammad SAW', type: 'religious' },
  
  // Desember
  { date: '2026-12-25', name: 'Hari Raya Natal', type: 'religious' },
  { date: '2026-12-26', name: 'Cuti Bersama Natal', type: 'national' }
];

export const indonesiaHolidays2027: Holiday[] = [
  { date: '2027-01-01', name: 'Tahun Baru Masehi', type: 'national' },
  { date: '2027-02-06', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'religious' },
  { date: '2027-02-09', name: 'Tahun Baru Imlek 2578', type: 'religious' },
  { date: '2027-03-11', name: 'Hari Suci Nyepi (Tahun Baru Saka 1949)', type: 'religious' },
  { date: '2027-03-20', name: 'Idul Fitri 1448 H', type: 'religious' },
  { date: '2027-03-21', name: 'Idul Fitri 1448 H', type: 'religious' },
  { date: '2027-03-26', name: 'Wafat Isa Al Masih', type: 'religious' },
  { date: '2027-05-01', name: 'Hari Buruh Internasional', type: 'national' },
  { date: '2027-05-06', name: 'Kenaikan Isa Al Masih', type: 'religious' },
  { date: '2027-05-15', name: 'Hari Raya Waisak 2571', type: 'religious' },
  { date: '2027-05-27', name: 'Idul Adha 1448 H', type: 'religious' },
  { date: '2027-06-01', name: 'Hari Lahir Pancasila', type: 'national' },
  { date: '2027-06-17', name: 'Tahun Baru Islam 1449 H', type: 'religious' },
  { date: '2027-08-17', name: 'Hari Kemerdekaan RI', type: 'national' },
  { date: '2027-08-26', name: 'Maulid Nabi Muhammad SAW', type: 'religious' },
  { date: '2027-12-25', name: 'Hari Raya Natal', type: 'religious' }
];

// Combine all years
export const allHolidays: Holiday[] = [
  ...indonesiaHolidays2026,
  ...indonesiaHolidays2027
];

// Helper function to check if a date is a holiday
export const isHoliday = (dateString: string): Holiday | null => {
  return allHolidays.find(h => h.date === dateString) || null;
};

// Helper function to get holidays for a specific month
export const getHolidaysForMonth = (year: number, month: number): Holiday[] => {
  const monthStr = String(month + 1).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;
  return allHolidays.filter(h => h.date.startsWith(prefix));
};

// Helper function to check if date is weekend (Saturday or Sunday)
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

// Helper function to get holiday color
export const getHolidayColor = (holiday: Holiday): string => {
  switch (holiday.type) {
    case 'national':
      return 'bg-red-100 border-red-300 text-red-700';
    case 'religious':
      return 'bg-green-100 border-green-300 text-green-700';
    case 'regional':
      return 'bg-blue-100 border-blue-300 text-blue-700';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-700';
  }
};
