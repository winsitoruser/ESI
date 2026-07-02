// Utility untuk mengelola hari libur dan tanggal merah di Indonesia
import { addDays, format, parse } from 'date-fns';
import { id } from 'date-fns/locale';

export interface HolidayEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  textColor: string;
  description?: string;
  type: 'national-holiday' | 'special-day' | 'joint-leave' | 'religious';
}

// Tambahkan hari libur nasional tetap (yang tidak berubah tiap tahun)
const getNationalHolidays = (year: number): HolidayEvent[] => {
  return [
    {
      id: `new-year-${year}`,
      title: 'Tahun Baru',
      start: new Date(year, 0, 1), // 1 Januari
      end: new Date(year, 0, 1),
      allDay: true,
      color: '#ef4444', // red-500
      textColor: 'white',
      type: 'national-holiday',
      description: 'Tahun Baru Masehi'
    },
    {
      id: `labor-day-${year}`,
      title: 'Hari Buruh',
      start: new Date(year, 4, 1), // 1 Mei
      end: new Date(year, 4, 1),
      allDay: true,
      color: '#ef4444', // red-500
      textColor: 'white',
      type: 'national-holiday',
      description: 'Hari Buruh Internasional'
    },
    {
      id: `pancasila-day-${year}`,
      title: 'Hari Lahir Pancasila',
      start: new Date(year, 5, 1), // 1 Juni
      end: new Date(year, 5, 1),
      allDay: true,
      color: '#ef4444', // red-500
      textColor: 'white',
      type: 'national-holiday',
      description: 'Hari Lahir Pancasila'
    },
    {
      id: `independence-day-${year}`,
      title: 'Hari Kemerdekaan',
      start: new Date(year, 7, 17), // 17 Agustus
      end: new Date(year, 7, 17),
      allDay: true,
      color: '#ef4444', // red-500
      textColor: 'white',
      type: 'national-holiday',
      description: 'Hari Kemerdekaan Republik Indonesia'
    },
    {
      id: `christmas-${year}`,
      title: 'Hari Natal',
      start: new Date(year, 11, 25), // 25 Desember
      end: new Date(year, 11, 25),
      allDay: true,
      color: '#ef4444', // red-500
      textColor: 'white',
      type: 'religious',
      description: 'Hari Natal'
    }
  ];
};

// Data hari libur nasional untuk tahun 2025
// Biasanya hari libur keagamaan bergerak setiap tahun
const getHolidays2025 = (): HolidayEvent[] => {
  return [
    // Hari libur keagamaan 2025 (perkiraan)
    {
      id: 'chinese-new-year-2025',
      title: 'Tahun Baru Imlek',
      start: new Date(2025, 0, 29), // 29 Januari 2025
      end: new Date(2025, 0, 29),
      allDay: true,
      color: '#ef4444',
      textColor: 'white',
      type: 'religious',
      description: 'Tahun Baru Imlek 2576 Kongzili'
    },
    {
      id: 'isra-miraj-2025',
      title: 'Isra Miraj',
      start: new Date(2025, 1, 18), // 18 Februari 2025
      end: new Date(2025, 1, 18),
      allDay: true,
      color: '#ef4444',
      textColor: 'white',
      type: 'religious',
      description: 'Isra Miraj Nabi Muhammad SAW'
    },
    {
      id: 'nyepi-2025',
      title: 'Hari Raya Nyepi',
      start: new Date(2025, 2, 30), // 30 Maret 2025
      end: new Date(2025, 2, 30),
      allDay: true,
      color: '#ef4444',
      textColor: 'white',
      type: 'religious',
      description: 'Tahun Baru Saka 1947'
    },
    {
      id: 'good-friday-2025',
      title: 'Wafat Isa Almasih',
      start: new Date(2025, 3, 18), // 18 April 2025
      end: new Date(2025, 3, 18),
      allDay: true,
      color: '#ef4444',
      textColor: 'white',
      type: 'religious',
      description: 'Wafat Isa Almasih'
    },
    {
      id: 'vesak-2025',
      title: 'Hari Raya Waisak',
      start: new Date(2025, 4, 12), // 12 Mei 2025
      end: new Date(2025, 4, 12),
      allDay: true,
      color: '#ef4444',
      textColor: 'white',
      type: 'religious',
      description: 'Hari Raya Waisak 2569 BE'
    },
    {
      id: 'ascension-2025',
      title: 'Kenaikan Isa Almasih',
      start: new Date(2025, 4, 29), // 29 Mei 2025
      end: new Date(2025, 4, 29),
      allDay: true,
      color: '#ef4444',
      textColor: 'white',
      type: 'religious',
      description: 'Kenaikan Isa Almasih'
    },
    {
      id: 'idul-fitri-1-2025',
      title: 'Idul Fitri',
      start: new Date(2025, 3, 1), // 1 April 2025
      end: new Date(2025, 3, 1),
      allDay: true,
      color: '#ef4444',
      textColor: 'white',
      type: 'religious',
      description: 'Hari Raya Idul Fitri 1446 Hijriah'
    },
    {
      id: 'idul-fitri-2-2025',
      title: 'Idul Fitri',
      start: new Date(2025, 3, 2), // 2 April 2025
      end: new Date(2025, 3, 2),
      allDay: true,
      color: '#ef4444',
      textColor: 'white',
      type: 'religious',
      description: 'Hari Raya Idul Fitri 1446 Hijriah'
    },
    {
      id: 'idul-adha-2025',
      title: 'Idul Adha',
      start: new Date(2025, 5, 9), // 9 Juni 2025
      end: new Date(2025, 5, 9),
      allDay: true,
      color: '#ef4444',
      textColor: 'white',
      type: 'religious',
      description: 'Hari Raya Idul Adha 1446 Hijriah'
    },
    {
      id: 'islamic-new-year-2025',
      title: 'Tahun Baru Islam',
      start: new Date(2025, 6, 7), // 7 Juli 2025
      end: new Date(2025, 6, 7),
      allDay: true,
      color: '#ef4444',
      textColor: 'white',
      type: 'religious',
      description: 'Tahun Baru Islam 1447 Hijriah'
    },
    {
      id: 'prophet-birthday-2025',
      title: 'Maulid Nabi',
      start: new Date(2025, 8, 16), // 16 September 2025
      end: new Date(2025, 8, 16),
      allDay: true,
      color: '#ef4444',
      textColor: 'white',
      type: 'religious',
      description: 'Maulid Nabi Muhammad SAW'
    }
  ];
};

// Cuti bersama 2025 (perlu diperbarui setiap tahun)
const getJointLeaves2025 = (): HolidayEvent[] => {
  return [
    {
      id: 'joint-leave-nye-2025',
      title: 'Cuti Bersama',
      start: new Date(2024, 11, 31), // 31 Desember 2024
      end: new Date(2024, 11, 31),
      allDay: true,
      color: '#f97316', // orange-500
      textColor: 'white',
      type: 'joint-leave',
      description: 'Cuti Bersama Tahun Baru 2025'
    },
    {
      id: 'joint-leave-idul-fitri-1-2025',
      title: 'Cuti Bersama',
      start: new Date(2025, 2, 31), // 31 Maret 2025
      end: new Date(2025, 2, 31),
      allDay: true,
      color: '#f97316', // orange-500
      textColor: 'white',
      type: 'joint-leave',
      description: 'Cuti Bersama Idul Fitri'
    },
    {
      id: 'joint-leave-idul-fitri-2-2025',
      title: 'Cuti Bersama',
      start: new Date(2025, 3, 3), // 3 April 2025
      end: new Date(2025, 3, 3),
      allDay: true,
      color: '#f97316', // orange-500
      textColor: 'white',
      type: 'joint-leave',
      description: 'Cuti Bersama Idul Fitri'
    },
    {
      id: 'joint-leave-idul-fitri-3-2025',
      title: 'Cuti Bersama',
      start: new Date(2025, 3, 4), // 4 April 2025
      end: new Date(2025, 3, 4),
      allDay: true,
      color: '#f97316', // orange-500
      textColor: 'white',
      type: 'joint-leave',
      description: 'Cuti Bersama Idul Fitri'
    },
    {
      id: 'joint-leave-christmas-1-2025',
      title: 'Cuti Bersama',
      start: new Date(2025, 11, 24), // 24 Desember 2025
      end: new Date(2025, 11, 24),
      allDay: true,
      color: '#f97316', // orange-500
      textColor: 'white',
      type: 'joint-leave',
      description: 'Cuti Bersama Natal'
    },
    {
      id: 'joint-leave-christmas-2-2025',
      title: 'Cuti Bersama',
      start: new Date(2025, 11, 26), // 26 Desember 2025
      end: new Date(2025, 11, 26),
      allDay: true,
      color: '#f97316', // orange-500
      textColor: 'white',
      type: 'joint-leave',
      description: 'Cuti Bersama Natal'
    }
  ];
};

// Fungsi utama untuk mendapatkan semua tanggal merah dan hari libur nasional Indonesia
export const getIndonesianHolidays = (year: number = new Date().getFullYear()): HolidayEvent[] => {
  const nationalHolidays = getNationalHolidays(year);
  
  // Tambahkan hari libur khusus berdasarkan tahun yang diminta
  let specialHolidays: HolidayEvent[] = [];
  let jointLeaves: HolidayEvent[] = [];
  
  // Tentukan hari libur khusus untuk tahun tertentu
  if (year === 2025) {
    specialHolidays = getHolidays2025();
    jointLeaves = getJointLeaves2025();
  }
  
  return [...nationalHolidays, ...specialHolidays, ...jointLeaves];
};

// Fungsi untuk menandai hari Minggu sebagai hari libur
export const getSundayEvents = (year: number): HolidayEvent[] => {
  const events: HolidayEvent[] = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  let currentDate = startDate;
  
  while (currentDate <= endDate) {
    if (currentDate.getDay() === 0) { // 0 is Sunday
      events.push({
        id: `sunday-${format(currentDate, 'yyyy-MM-dd')}`,
        title: 'Minggu',
        start: new Date(currentDate),
        end: new Date(currentDate),
        allDay: true,
        color: '#fee2e2', // red-100
        textColor: '#ef4444', // red-500
        type: 'special-day',
        description: 'Hari Minggu'
      });
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return events;
};

// Fungsi ini mengembalikan apakah tanggal tertentu adalah tanggal merah
export const isIndonesianHoliday = (date: Date): boolean => {
  const year = date.getFullYear();
  const holidays = getIndonesianHolidays(year);
  
  return holidays.some(holiday => 
    holiday.start.getFullYear() === date.getFullYear() &&
    holiday.start.getMonth() === date.getMonth() &&
    holiday.start.getDate() === date.getDate()
  ) || date.getDay() === 0; // Minggu juga dianggap hari libur
};

// Fungsi ini mengembalikan detail hari libur jika ada
export const getHolidayDetails = (date: Date): HolidayEvent | null => {
  const year = date.getFullYear();
  const holidays = getIndonesianHolidays(year);
  
  return holidays.find(holiday => 
    holiday.start.getFullYear() === date.getFullYear() &&
    holiday.start.getMonth() === date.getMonth() &&
    holiday.start.getDate() === date.getDate()
  ) || null;
};
