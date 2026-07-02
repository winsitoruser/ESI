// Environment-aware BASE_URL - uses NEXT_PUBLIC_API_URL in production
// Legacy hardcoded URLs kept for reference:
// export const BASE_URL = 'http://18.142.214.28:3434'
// export const BASE_URL = 'https://server.beeverclinic.online';
// export const BASE_URL = 'http://localhost:5000/api';

// Production: set NEXT_PUBLIC_API_URL=https://your-domain.com/api
// Development: falls back to relative path /api (works with Next.js API routes)
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const ShiftSchedule = [
  {
    color: 'green',
    title: 'Shift 1',
    description: '07.00 - 10.00'
  },
  {
    color: 'blue',
    title: 'Shift 2',
    description: '10.00 - 15.00'
  },
  {
    color: 'orange',
    title: 'Shift 3',
    description: '15.00 - 20.00'
  },
  {
    color: 'red',
    title: 'Shift 4',
    description: '20.00 - 23.00'
  },
]