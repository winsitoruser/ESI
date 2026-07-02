import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncate(str: string, length: number) {
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

export function formatBytes(
  bytes: number,
  decimals = 0,
  sizeType: "accurate" | "normal" = "normal",
) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const accurateSizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];
  if (bytes === 0) return "0 Byte";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${sizeType === "accurate" ? accurateSizes[i] ?? "Bytest" : sizes[i] ?? "Bytes"
    }`;
}

/**
 * Formats a number as Indonesian Rupiah
 * @param amount The amount to format
 * @returns Formatted amount string
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

export function unslugify(str: string) {
  return str.replace(/-/g, " ");
}

export function toTitleCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
  );
}

export function toSentenceCase(str: string) {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

export function isArrayOfFile(files: unknown): files is File[] {
  const isArray = Array.isArray(files);
  if (!isArray) return false;
  return files.every((file) => file instanceof File);
}

export function calculateAge(birthDateStr: string): number {
  const birthDate = new Date(birthDateStr);
  const currentDate = new Date();
  const diffInMilliseconds = currentDate.getTime() - birthDate.getTime();
  const ageDate = new Date(diffInMilliseconds);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export function extractTimeFromISOString(isoString: string | number | Date) {
  const dt = new Date(isoString);

  const hours = dt.getUTCHours();
  const minutes = dt.getUTCMinutes();

  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return formattedTime;
}

export const convertToISOString = (date: { toISOString: () => string }, time: any) => {
  try {
    // Ensure time is properly formatted as HH:MM
    let formattedTime = time;
    if (typeof time === 'string') {
      // If time doesn't include minutes, add them
      if (time.indexOf(':') === -1) {
        formattedTime = `${time}:00`;
      }
      
      // Make sure it has the proper format HH:MM
      const [hours, minutes] = formattedTime.split(':');
      const paddedHours = hours.padStart(2, '0');
      const paddedMinutes = minutes.padStart(2, '0');
      formattedTime = `${paddedHours}:${paddedMinutes}`;
    }
    
    // Create a new date object using the date part from the input date
    // and the formatted time value
    const dateString = date.toISOString().split('T')[0];
    const newDate = new Date(`${dateString}T${formattedTime}:00`);
    
    // Check if the date is valid before returning
    if (isNaN(newDate.getTime())) {
      throw new Error('Invalid date or time format');
    }
    
    return newDate.toISOString();
  } catch (error) {
    console.error('Error in convertToISOString:', error);
    // Fallback to current time if there's an error
    return new Date().toISOString();
  }
};

export function getTimeClassNames(startTime: string, endTime: string) {
  // Parse the time strings to get hours
  const startHour = parseInt(startTime.split(':')[0], 10);
  const endHour = parseInt(endTime.split(':')[0], 10);

  // Define the time ranges and corresponding classNames
  const timeRanges = [
    { start: 7, end: 10, classNames: 'hms-time-green' },
    { start: 10, end: 15, classNames: 'hms-time-blue' },
    { start: 15, end: 20, classNames: 'hms-time-orange' },
    { start: 20, end: 23, classNames: 'hms-time-red' },
  ];

  // Find the matching classNames for the given time range
  for (const range of timeRanges) {
    if (startHour >= range.start && endHour <= range.end) {
      return range.classNames;
    }
  }

  return 'hms-time-blue';
}
