import { useState, useEffect, useRef, useCallback } from 'react';
import { X, DollarSign, Calendar, FileText, Building2, Tag, CreditCard, ShieldAlert, AlertTriangle, Info, Brain, RefreshCw } from 'lucide-react';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  transaction?: any;
  branches?: any[];
  accounts?: any[];
}

export default function TransactionFormModal({
  isOpen,
  onClose,
  onSubmit,
  transaction,
  branches = [],
  accounts = []
}: TransactionFormModalProps) {
  const [formData, setFormData] = useState({
    transactionDate: '',
    type: 'income',
    category: '',
    branchId: '',
    accountId: '',
    amount: '',
    currency: 'IDR',
    description: '',
    reference: '',
    paymentMethod: '',
    status: 'draft'
  });

  const [errors, setErrors] = useState<any>({});
  const [aiWarnings, setAiWarnings] = useState<any[]>([]);
  const [aiValidating, setAiValidating] = useState(false);
  const aiDebounceRef = useRef<any>(null);

  const runAiValidation = useCallback(async (data: typeof formData) => {
    if (!data.amount || parseFloat(data.amount) <= 0) { setAiWarnings([]); return; }
    setAiValidating(true);
    try {
      const res = await fetch('/api/hq/finance/ai-guardian?action=validate-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(data.amount),
          category: data.category,
          transactionType: data.type,
          contactName: data.description,
          description: data.description,
          accountId: data.accountId,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const result = json.data || json;
        setAiWarnings(result.warnings || []);
      }
    } catch (e) { /* silent */ }
    setAiValidating(false);
  }, []);

  useEffect(() => {
    if (transaction) {
      setFormData({
        transactionDate: transaction.transactionDate?.split('T')[0] || '',
        type: transaction.type || 'income',
        category: transaction.category || '',
        branchId: transaction.branchId || '',
        accountId: transaction.accountId || '',
        amount: transaction.amount?.toString() || '',
        currency: transaction.currency || 'IDR',
        description: transaction.description || '',
        reference: transaction.reference || '',
        paymentMethod: transaction.paymentMethod || '',
        status: transaction.status || 'draft'
      });
    } else {
      setFormData({
        transactionDate: new Date().toISOString().split('T')[0],
        type: 'income',
        category: '',
        branchId: '',
        accountId: '',
        amount: '',
        currency: 'IDR',
        description: '',
        reference: '',
        paymentMethod: '',
        status: 'draft'
      });
    }
  }, [transaction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }));
    }
    // Debounced AI validation on key fields
    if (['amount', 'accountId', 'type', 'description'].includes(name)) {
      if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
      aiDebounceRef.current = setTimeout(() => runAiValidation(newData), 800);
    }
  };

  const validate = () => {
    const newErrors: any = {};
    
    if (!formData.transactionDate) newErrors.transactionDate = 'Transaction date is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.accountId) newErrors.accountId = 'Account is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.description) newErrors.description = 'Description is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  if (!isOpen) return null;

  const transactionTypes = [
    { value: 'income', label: 'Income', color: 'text-green-600' },
    { value: 'expense', label: 'Expense', color: 'text-red-600' },
    { value: 'transfer', label: 'Transfer', color: 'text-blue-600' }
  ];

  const categories = {
    income: ['Sales', 'Service Revenue', 'Interest Income', 'Other Income'],
    expense: ['COGS', 'Payroll', 'Rent', 'Utilities', 'Marketing', 'Other Expense'],
    transfer: ['Inter-Branch Transfer', 'Bank Transfer']
  };

  const paymentMethods = ['Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'E-Wallet', 'Check'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {transaction ? 'Edit Transaction' : 'New Transaction'}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {transaction ? 'Update transaction details' : 'Create a new financial transaction'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Transaction Type & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Transaction Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.type ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {transactionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Transaction Date *
              </label>
              <input
                type="date"
                name="transactionDate"
                value={formData.transactionDate}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.transactionDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.transactionDate && <p className="text-red-500 text-xs mt-1">{errors.transactionDate}</p>}
            </div>
          </div>

          {/* Category & Branch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Category</option>
                {categories[formData.type as keyof typeof categories]?.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Branch
              </label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} - {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account *
              </label>
              <select
                name="accountId"
                value={formData.accountId}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.accountId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} - {account.accountName}
                  </option>
                ))}
              </select>
              {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">Rp</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0"
                  step="0.01"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            </div>
          </div>

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Payment Method
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Payment Method</option>
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Reference Number
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="e.g., INV-001, PO-123"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Enter transaction description..."
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* AI Guardian Warnings */}
          {(aiWarnings.length > 0 || aiValidating) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <ShieldAlert className="w-4 h-4 text-violet-500" />
                <span>AI Guardian</span>
                {aiValidating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-500" />}
              </div>
              {aiWarnings.map((w: any, i: number) => (
                <div key={i} className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  w.severity === 'high' || w.severity === 'critical'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : w.severity === 'medium'
                    ? 'bg-amber-50 border border-amber-200 text-amber-800'
                    : 'bg-blue-50 border border-blue-200 text-blue-800'
                }`}>
                  {w.severity === 'high' || w.severity === 'critical'
                    ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    : <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="font-medium text-xs">{w.title}</p>
                    <p className="text-xs mt-0.5 opacity-90">{w.message}</p>
                    {w.suggestedAction && <p className="text-xs mt-1 opacity-70">→ {w.suggestedAction}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
            >
              {transaction ? 'Update Transaction' : 'Create Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
