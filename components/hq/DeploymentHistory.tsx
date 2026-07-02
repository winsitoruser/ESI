import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  History, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  ChevronDown, ChevronRight, Clock, User, Target, Zap
} from 'lucide-react';

interface DeploymentHistoryItem {
  id: string;
  moduleId: string;
  moduleName: string;
  action: string;
  scopeType: string;
  affectedBranches: string[];
  branchCount: number;
  deployedBy: string;
  deployedAt: string;
  status: string;
  successCount: number;
  failedCount: number;
  details: {
    duration: string;
    errors: string[];
  };
}

export default function DeploymentHistory() {
  const [history, setHistory] = useState<DeploymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    action: 'all',
    status: 'all'
  });

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.action !== 'all') params.append('action', filter.action);
      if (filter.status !== 'all') params.append('status', filter.status);

      const res = await fetch(`/api/hq/modules/history?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setHistory(json.data.history || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      toast.error('Gagal memuat history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle2,
          label: 'Success',
          color: 'text-green-600',
          bg: 'bg-green-100'
        };
      case 'failed':
        return {
          icon: XCircle,
          label: 'Failed',
          color: 'text-red-600',
          bg: 'bg-red-100'
        };
      case 'partial':
        return {
          icon: AlertTriangle,
          label: 'Partial',
          color: 'text-yellow-600',
          bg: 'bg-yellow-100'
        };
      default:
        return {
          icon: AlertTriangle,
          label: status,
          color: 'text-gray-600',
          bg: 'bg-gray-100'
        };
    }
  };

  const getActionBadge = (action: string) => {
    return action === 'enable' ? {
      label: 'Enabled',
      color: 'text-green-700',
      bg: 'bg-green-50'
    } : {
      label: 'Disabled',
      color: 'text-red-700',
      bg: 'bg-red-50'
    };
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <History className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Deployment History</h3>
            <p className="text-sm text-gray-500">Track all module deployment activities</p>
          </div>
        </div>
        <button
          onClick={fetchHistory}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filter.action}
          onChange={e => setFilter({ ...filter, action: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Actions</option>
          <option value="enable">Enable Only</option>
          <option value="disable">Disable Only</option>
        </select>

        <select
          value={filter.status}
          onChange={e => setFilter({ ...filter, status: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="success">Success Only</option>
          <option value="failed">Failed Only</option>
          <option value="partial">Partial Only</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-sm text-gray-500">Loading history...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map(item => {
            const status = getStatusBadge(item.status);
            const action = getActionBadge(item.action);
            const StatusIcon = status.icon;
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-all"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{item.moduleName}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${action.bg} ${action.color}`}>
                          {action.label}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${status.bg} ${status.color} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span>{item.scopeType.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>{item.branchCount} branches</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{item.deployedBy}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(item.deployedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right text-xs">
                        <p className="text-green-600 font-medium">{item.successCount} success</p>
                        {item.failedCount > 0 && (
                          <p className="text-red-600 font-medium">{item.failedCount} failed</p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium text-gray-900">{item.details.duration}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Deployed At:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(item.deployedAt).toLocaleString()}
                        </span>
                      </div>
                      {item.details.errors.length > 0 && (
                        <div>
                          <p className="text-gray-600 mb-1">Errors:</p>
                          <div className="bg-red-50 border border-red-200 rounded p-2 space-y-1">
                            {item.details.errors.map((error, idx) => (
                              <p key={idx} className="text-xs text-red-700">• {error}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && history.length === 0 && (
        <div className="text-center py-8">
          <History className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No deployment history yet</p>
        </div>
      )}
    </div>
  );
}
