import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FaHistory, FaEye, FaUser, FaClock } from 'react-icons/fa';

interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  oldValues: any;
  newValues: any;
  description: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface AuditHistoryProps {
  entityType: string;
  entityId?: string;
}

const AuditHistory: React.FC<AuditHistoryProps> = ({ entityType, entityId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [entityType, entityId]);

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams({ entityType });
      if (entityId) params.append('entityId', entityId);
      
      const response = await fetch(`/api/settings/audit-history?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'text-green-600 bg-green-100';
      case 'UPDATE':
        return 'text-blue-600 bg-blue-100';
      case 'DELETE':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FaHistory className="mr-2" />
            Riwayat Perubahan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FaHistory className="mr-2" />
            Riwayat Perubahan
          </div>
          <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
            <FaClock className="mr-1" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Belum ada riwayat perubahan</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-sm text-gray-600">{log.entityType}</span>
                      {log.user && (
                        <span className="flex items-center text-sm text-gray-600">
                          <FaUser className="mr-1" />
                          {log.user.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 mb-1">{log.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(log.timestamp)}</p>
                  </div>
                  
                  {(log.oldValues && Object.keys(log.oldValues).length > 0) ||
                   (log.newValues && Object.keys(log.newValues).length > 0) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetails(showDetails === log.id ? null : log.id)}
                    >
                      <FaEye />
                    </Button>
                  ) : null}
                </div>
                
                {showDetails === log.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {log.oldValues && Object.keys(log.oldValues).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Nilai Lama:</p>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.oldValues, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.newValues && Object.keys(log.newValues).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Nilai Baru:</p>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.newValues, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditHistory;
