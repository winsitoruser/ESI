// Type definitions for mock data
export interface MockTransactionType {
  today: {
    count: number;
    total: number;
    types: string[];
  };
  yesterday: {
    count: number;
    total: number;
    types: string[];
  };
}

export interface MockBuyerType {
  today: {
    count: number;
    newBuyers: number;
  };
  yesterday: {
    count: number;
    newBuyers: number;
  };
}
