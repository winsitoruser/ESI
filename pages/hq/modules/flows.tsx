import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Zap, Activity, CheckCircle, XCircle, AlertTriangle,
  Clock, TrendingUp, ArrowRight, Play, Pause, RefreshCw,
  Filter, Search, Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface IntegrationFlow {
  id: string;
  code: string;
  name: string;
  description: string;
  sourceModule: string;
  targetModule: string;
  eventType: string;
  isActive: boolean;
  activeTenants: number;
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  lastExecuted?: Date;
  status: 'healthy' | 'warning' | 'error';
}

interface FlowExecution {
  id: string;
  flowName: string;
  eventType: string;
  tenantId: string;
  tenantName: string;
  status: 'success' | 'error' | 'pending';
  executionTime: number;
  timestamp: Date;
  errorMessage?: string;
}

export default function IntegrationFlows() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [flows, setFlows] = useState<IntegrationFlow[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<FlowExecution[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'warning' | 'error'>('all');
  
  useEffect(() => {
    fetchFlows();
    fetchRecentExecutions();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchRecentExecutions();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchFlows = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/integrations/configs?category=module_flows');
      if (res.ok) { const json = await res.json(); const p = json.data || json; if (p.flows) { setFlows(p.flows); } }
    } catch (error) {
      console.error('Error loading flows:', error);
    }
    setLoading(false);
  };
  
  const fetchRecentExecutions = async () => {
    try {
      const res = await fetch('/api/hq/integrations/configs?category=module_executions');
      if (res.ok) { const json = await res.json(); const p = json.data || json; if (p.executions) { setRecentExecutions(p.executions); } }
    } catch (error) {
      console.error('Error loading executions:', error);
    }
  };
  
  const handleToggleFlow = async (flowId: string, isActive: boolean) => {
    try {
      // In production, call API to toggle flow
      toast.success(!isActive ? t('mp.flows.flowActivated') : t('mp.flows.flowDeactivated'));
      fetchFlows();
    } catch (error) {
      toast.error(t('mp.flows.failedToToggle'));
    }
  };
  
  const filteredFlows = flows.filter(flow => {
    if (statusFilter === 'all') return true;
    return flow.status === statusFilter;
  });
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };
  
  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('mp.flows.title')}</h1>
            <p className="text-gray-600 mt-1">{t('mp.flows.subtitle')}</p>
          </div>
          
          <button
            onClick={fetchRecentExecutions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            {t('mp.flows.refresh')}
          </button>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SummaryCard
            title={t('mp.flows.totalFlows')}
            value={flows.length}
            subtitle={`${flows.filter(f => f.isActive).length} ${t('mp.flows.active')}`}
            icon={Zap}
            color="blue"
          />
          <SummaryCard
            title={t('mp.flows.totalExecutions')}
            value={flows.reduce((sum, f) => sum + f.totalExecutions, 0).toLocaleString()}
            subtitle={t('mp.flows.last7Days')}
            icon={Activity}
            color="purple"
          />
          <SummaryCard
            title={t('mp.flows.avgSuccessRate')}
            value={`${(flows.reduce((sum, f) => sum + f.successRate, 0) / flows.length).toFixed(1)}%`}
            subtitle={t('mp.flows.acrossAllFlows')}
            icon={TrendingUp}
            color="green"
          />
          <SummaryCard
            title={t('mp.flows.healthyFlows')}
            value={flows.filter(f => f.status === 'healthy').length}
            subtitle={t('mp.flows.withErrors', { count: flows.filter(f => f.status === 'error').length })}
            icon={CheckCircle}
            color="emerald"
          />
        </div>
        
        {/* Status Filter */}
        <div className="flex gap-2">
          {(['all', 'healthy', 'warning', 'error'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? t('mp.flows.all') : status === 'healthy' ? t('mp.flows.healthy') : status === 'warning' ? t('mp.flows.warning') : t('mp.flows.error')}
            </button>
          ))}
        </div>
        
        {/* Flows List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('mp.flows.activeIntegrationFlows')}</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredFlows.map(flow => (
              <div key={flow.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{flow.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getStatusColor(flow.status)}`}>
                        {getStatusIcon(flow.status)}
                        {flow.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{flow.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        <span className="font-medium">{flow.sourceModule}</span>
                        <ArrowRight className="w-4 h-4" />
                        <span className="font-medium">{flow.targetModule}</span>
                      </div>
                      <div className="h-4 w-px bg-gray-300" />
                      <div>Event: <span className="font-mono text-xs">{flow.eventType}</span></div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleFlow(flow.id, flow.isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      flow.isActive ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        flow.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('mp.flows.activeTenants')}</p>
                    <p className="text-lg font-semibold text-gray-900">{flow.activeTenants}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('mp.flows.totalExecutions')}</p>
                    <p className="text-lg font-semibold text-gray-900">{flow.totalExecutions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('mp.flows.successRate')}</p>
                    <p className={`text-lg font-semibold ${
                      flow.successRate >= 99 ? 'text-green-600' :
                      flow.successRate >= 95 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {flow.successRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('mp.flows.avgExecution')}</p>
                    <p className="text-lg font-semibold text-gray-900">{flow.avgExecutionTime}ms</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('mp.flows.lastExecuted')}</p>
                    <p className="text-sm text-gray-900">
                      {flow.lastExecuted ? new Date(flow.lastExecuted).toLocaleTimeString() : t('mp.flows.never')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Recent Executions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('mp.flows.recentExecutions')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('mp.flows.realtimeLog')}</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {recentExecutions.map(execution => (
              <div key={execution.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-2 h-2 rounded-full ${
                      execution.status === 'success' ? 'bg-green-500' :
                      execution.status === 'error' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`} />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{execution.flowName}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-sm text-gray-600">{execution.tenantName}</span>
                      </div>
                      {execution.errorMessage && (
                        <p className="text-sm text-red-600">{execution.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    {execution.status === 'success' && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{execution.executionTime}ms</span>
                      </div>
                    )}
                    <span>{new Date(execution.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HQLayout>
  );
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'emerald';
}

function SummaryCard({ title, value, subtitle, icon: Icon, color }: SummaryCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    emerald: 'from-emerald-500 to-emerald-600'
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}
