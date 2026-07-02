export const formatRupiah = (value: number) => {
  // Menggunakan useEffect dan useState di komponen untuk menghindari error hydration
  // Untuk sementara, kita standarkan formatnya
  return `Rp${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

export const formatDate = ({ date }: { date: Date }) => {
  let options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  };
  return new Intl.DateTimeFormat('id-ID', options).format(date);
};

export const parseDate = (strDate: string) => {
  if (strDate.substr(0, 1) === '"') {
    strDate = JSON.parse(strDate);
  }

  const fromUtc = strDate.endsWith('Z');
  let date = new Date(strDate);

  if (!fromUtc) {
    date = new Date(Date.parse(strDate));
  }

  return date;
};