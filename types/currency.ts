export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  lastUpdated: string | Date;
  tenantId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CurrencyConversion {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  fromSymbol: string;
  toSymbol: string;
}
