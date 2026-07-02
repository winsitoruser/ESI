import React, { ReactNode } from 'react';
import DashboardLayout from './DashboardLayout';

interface PosLayoutProps {
  children: ReactNode;
}

const PosLayout: React.FC<PosLayoutProps> = ({ children }) => {
  return <DashboardLayout>{children}</DashboardLayout>;
};

export default PosLayout;
