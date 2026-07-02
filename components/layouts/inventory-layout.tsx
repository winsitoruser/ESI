import React, { ReactNode } from 'react';
import DashboardLayout from './DashboardLayout';

interface InventoryLayoutProps {
  children: ReactNode;
}

const InventoryLayout: React.FC<InventoryLayoutProps> = ({ children }) => {
  return <DashboardLayout>{children}</DashboardLayout>;
};

export default InventoryLayout;
