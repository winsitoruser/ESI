import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FaStore, FaMapMarkerAlt, FaPhone, FaEnvelope, 
  FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaUser
} from 'react-icons/fa';

interface Branch {
  id: string;
  code: string;
  name: string;
  type: 'main' | 'branch' | 'warehouse' | 'kiosk';
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  isActive: boolean;
  manager?: {
    name: string;
    email: string;
  };
}

interface BranchCardProps {
  branch: Branch;
  onEdit?: (branch: Branch) => void;
  onDelete?: (branchId: string) => void;
  onToggleStatus?: (branchId: string, isActive: boolean) => void;
}

const BranchCard: React.FC<BranchCardProps> = ({ 
  branch, 
  onEdit, 
  onDelete, 
  onToggleStatus 
}) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'main': return 'bg-blue-100 text-blue-800';
      case 'branch': return 'bg-green-100 text-green-800';
      case 'warehouse': return 'bg-purple-100 text-purple-800';
      case 'kiosk': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'main': return 'Pusat';
      case 'branch': return 'Cabang';
      case 'warehouse': return 'Gudang';
      case 'kiosk': return 'Kiosk';
      default: return type;
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow ${!branch.isActive ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FaStore className="text-blue-600" />
              <CardTitle className="text-lg">{branch.name}</CardTitle>
              {!branch.isActive && (
                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                  Nonaktif
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-500">{branch.code}</span>
              <span className={`px-2 py-1 text-xs rounded ${getTypeColor(branch.type)}`}>
                {getTypeLabel(branch.type)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(branch)}
                title="Edit"
              >
                <FaEdit />
              </Button>
            )}
            {onToggleStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleStatus(branch.id, !branch.isActive)}
                title={branch.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              >
                {branch.isActive ? <FaToggleOn className="text-green-600" /> : <FaToggleOff className="text-gray-400" />}
              </Button>
            )}
            {onDelete && branch.type !== 'main' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(branch.id)}
                className="text-red-600 hover:text-red-700"
                title="Hapus"
              >
                <FaTrash />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {branch.address && (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <FaMapMarkerAlt className="mt-1 flex-shrink-0" />
            <div>
              <div>{branch.address}</div>
              {(branch.city || branch.province) && (
                <div className="text-xs text-gray-500">
                  {[branch.city, branch.province].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
        
        {branch.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FaPhone className="flex-shrink-0" />
            <span>{branch.phone}</span>
          </div>
        )}
        
        {branch.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FaEnvelope className="flex-shrink-0" />
            <span>{branch.email}</span>
          </div>
        )}

        {branch.manager && (
          <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
            <FaUser className="flex-shrink-0" />
            <div>
              <div className="font-medium">{branch.manager.name}</div>
              <div className="text-xs text-gray-500">{branch.manager.email}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BranchCard;
