import React, { ReactNode } from 'react';
import DashboardLayout from './DashboardLayout';

interface FinanceLayoutProps {
  children: ReactNode;
}

const FinanceLayout: React.FC<FinanceLayoutProps> = ({ children }) => {
  return <DashboardLayout>{children}</DashboardLayout>;
};

export default FinanceLayout;
