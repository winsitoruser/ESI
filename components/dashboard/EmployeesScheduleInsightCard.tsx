import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaUsers, FaClock, FaCheckCircle } from 'react-icons/fa';

interface EmployeesScheduleInsightCardProps {
  title?: string;
  data?: {
    totalEmployees: number;
    activeShifts: number;
    todaySchedule: number;
    attendance: number;
  };
}

const EmployeesScheduleInsightCard: React.FC<EmployeesScheduleInsightCardProps> = ({ 
  title = "Karyawan & Jadwal",
  data = {
    totalEmployees: 24,
    activeShifts: 6,
    todaySchedule: 18,
    attendance: 94.5
  }
}) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FaUsers className="text-indigo-600" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="p-3 bg-indigo-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Karyawan</p>
            <p className="text-2xl font-bold text-indigo-600">{data.totalEmployees}</p>
            <p className="text-xs text-gray-500 mt-1">Karyawan aktif</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <FaClock className="text-green-600 text-sm" />
                <p className="text-xs text-gray-600">Shift Aktif</p>
              </div>
              <p className="text-lg font-bold text-green-600">{data.activeShifts}</p>
            </div>

            <div className="p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <FaCheckCircle className="text-blue-600 text-sm" />
                <p className="text-xs text-gray-600">Jadwal Hari Ini</p>
              </div>
              <p className="text-lg font-bold text-blue-600">{data.todaySchedule}</p>
            </div>
          </div>

          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-600">Tingkat Kehadiran</p>
              <span className="text-xs text-gray-500">30 hari terakhir</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${data.attendance}%` }}
                ></div>
              </div>
              <span className="text-lg font-bold text-purple-600">
                {data.attendance}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeesScheduleInsightCard;
