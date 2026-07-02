// Add these useEffect hooks after line 299 in settings.tsx
// This file contains the API integration code to replace mock data

// 1. Fetch Payment Methods
useEffect(() => {
  async function fetchPaymentMethods() {
    try {
      const response = await fetch('/api/finance/payment-methods-simple');
      const result = await response.json();
      if (result.success && result.data) {
        setPaymentMethods(result.data.map((pm: any) => ({
          id: pm.id,
          name: pm.name,
          fees: pm.fees,
          processing: pm.processingTime,
          isActive: pm.isActive,
          icon: pm.icon
        })));
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    }
  }
  fetchPaymentMethods();
}, []);

// 2. Fetch Categories (Income and Expense)
useEffect(() => {
  async function fetchCategories() {
    try {
      const [expenseRes, incomeRes] = await Promise.all([
        fetch('/api/finance/categories-simple?type=expense'),
        fetch('/api/finance/categories-simple?type=income')
      ]);
      
      const expenseData = await expenseRes.json();
      const incomeData = await incomeRes.json();
      
      if (expenseData.success && expenseData.data) {
        setExpenseCategories(expenseData.data.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          isActive: cat.isActive,
          type: 'expense',
          icon: cat.icon
        })));
      }
      
      if (incomeData.success && incomeData.data) {
        setIncomeCategories(incomeData.data.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          isActive: cat.isActive,
          type: 'income',
          icon: cat.icon
        })));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }
  fetchCategories();
}, []);

// 3. Fetch Chart of Accounts
useEffect(() => {
  async function fetchChartOfAccounts() {
    try {
      const response = await fetch('/api/finance/chart-of-accounts-simple');
      const result = await response.json();
      if (result.success && result.data) {
        setAccountJournals(result.data.map((acc: any) => ({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          category: acc.category,
          subCategory: acc.subCategory,
          normalBalance: acc.normalBalance,
          isActive: acc.isActive,
          description: acc.description
        })));
      }
    } catch (error) {
      console.error('Failed to fetch chart of accounts:', error);
    } finally {
      setLoadingSettings(false);
    }
  }
  fetchChartOfAccounts();
}, []);

// 4. Fetch Assets
useEffect(() => {
  async function fetchAssets() {
    try {
      const response = await fetch('/api/finance/assets-simple');
      const result = await response.json();
      if (result.success && result.data) {
        setAssets(result.data.map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          value: asset.value,
          description: asset.description,
          icon: asset.icon,
          category: asset.category,
          isActive: asset.isActive
        })));
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  }
  fetchAssets();
}, []);

// COPY THESE 4 useEffect BLOCKS AND PASTE AFTER LINE 299 IN settings.tsx
