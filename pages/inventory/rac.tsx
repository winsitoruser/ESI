import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FaExchangeAlt, FaPlus, FaSearch, FaEye, FaCheck, FaTimes,
  FaClock, FaShippingFast, FaWarehouse, FaStore, FaClipboardCheck,
  FaFileAlt, FaPrint, FaSpinner
} from 'react-icons/fa';

interface RACRequest {
  id: number;
  request_number: string;
  request_type: string;
  from_location_id: number;
  to_location_id: number;
  from_location?: string;
  to_location?: string;
  request_date: string;
  required_date: string;
  status: string;
  priority: string;
  reason: string;
  notes?: string;
  items_count?: number;
  total_qty_requested?: number;
  requested_by: string;
  approved_by?: string;
  approval_date?: string;
  items?: any[];
  history?: any[];
}

interface RACStats {
  total_requests: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_type: Record<string, number>;
  pending_count: number;
  approved_count: number;
  completed_count: number;
  critical_count: number;
}

const RACManagementPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, formatDate } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<RACRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'completed'>('all');
  
  // API state
  const [requests, setRequests] = useState<RACRequest[]>([]);
  const [stats, setStats] = useState<RACStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form state
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRequests();
      fetchStats();
    }
  }, [status, filterStatus, filterPriority, searchQuery, activeTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: 1,
        limit: 50,
        source: 'rac',
        includeStats: 'true',
      };
      
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      if (filterPriority !== 'all') {
        params.priority = filterPriority;
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }

      // Use unified API for integrated data
      const response = await axios.get('/api/requisitions/unified', { params });
      
      if (response.data.success) {
        let data = response.data.data || [];
        
        // Filter by tab
        if (activeTab === 'pending') {
          data = data.filter((r: RACRequest) => r.status === 'submitted' || r.status === 'draft');
        } else if (activeTab === 'approved') {
          data = data.filter((r: RACRequest) => r.status === 'approved' || r.status === 'processing' || r.status === 'shipped');
        } else if (activeTab === 'completed') {
          data = data.filter((r: RACRequest) => r.status === 'completed' || r.status === 'received');
        }
        
        setRequests(data);
      }
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error(error.response?.data?.message || t('inventory.rac.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Use unified stats API
      const response = await axios.get('/api/requisitions/stats', {
        params: { source: 'rac' }
      });
      if (response.data.success) {
        setStats(response.data.rac || response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleViewDetail = async (request: RACRequest) => {
    try {
      const response = await axios.get(`/api/inventory/rac/${request.id}`);
      if (response.data.success) {
        setSelectedRequest(response.data.data);
        setShowDetailModal(true);
      }
    } catch (error: any) {
      toast.error(t('inventory.rac.detailLoadFailed'));
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    setActionLoading(true);
    try {
      // Use unified API for approval - syncs with HQ automatically
      const response = await axios.put(
        `/api/requisitions/unified?id=${selectedRequest.id}`,
        {
          action: 'approve',
          approvalNotes: approvalNotes
        }
      );

      if (response.data.success) {
        toast.success(t('inventory.rac.approveSuccess'));
        setShowApproveModal(false);
        setShowDetailModal(false);
        setApprovalNotes('');
        fetchRequests();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('inventory.rac.approveFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      toast.error(t('inventory.rac.rejectReasonRequired'));
      return;
    }
    
    setActionLoading(true);
    try {
      // Use unified API for rejection - syncs with HQ automatically
      const response = await axios.put(
        `/api/requisitions/unified?id=${selectedRequest.id}`,
        {
          action: 'reject',
          rejectionReason: rejectionReason
        }
      );

      if (response.data.success) {
        toast.success(t('inventory.rac.rejectSuccess'));
        setShowRejectModal(false);
        setShowDetailModal(false);
        setRejectionReason('');
        fetchRequests();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('inventory.rac.rejectFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, any> = {
      draft: { color: 'bg-gray-100 text-gray-700', label: 'Draft', icon: FaFileAlt },
      submitted: { color: 'bg-yellow-100 text-yellow-700', label: t('inventory.rac.awaitingApproval'), icon: FaClock },
      approved: { color: 'bg-blue-100 text-blue-700', label: t('inventory.rac.approved'), icon: FaCheck },
      rejected: { color: 'bg-red-100 text-red-700', label: t('inventory.rac.rejected'), icon: FaTimes },
      processing: { color: 'bg-indigo-100 text-indigo-700', label: t('inventory.rac.processing'), icon: FaClipboardCheck },
      shipped: { color: 'bg-purple-100 text-purple-700', label: t('inventory.rac.shipped'), icon: FaShippingFast },
      received: { color: 'bg-teal-100 text-teal-700', label: t('inventory.rac.received'), icon: FaCheck },
      completed: { color: 'bg-green-100 text-green-700', label: t('inventory.rac.completed'), icon: FaCheck }
    };
    const statusConfig = config[status] || config.draft;
    const Icon = statusConfig.icon;
    return (
      <Badge className={statusConfig.color}>
        <Icon className="mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, any> = {
      low: { color: 'bg-gray-100 text-gray-700', label: t('inventory.rac.low') },
      medium: { color: 'bg-blue-100 text-blue-700', label: t('inventory.rac.medium') },
      high: { color: 'bg-orange-100 text-orange-700', label: t('inventory.rac.high') },
      critical: { color: 'bg-red-100 text-red-700', label: t('inventory.rac.critical') }
    };
    const priorityConfig = config[priority] || config.medium;
    return <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, any> = {
      rac: { color: 'bg-purple-100 text-purple-700', label: t('inventory.rac.racType') },
      restock: { color: 'bg-blue-100 text-blue-700', label: t('inventory.rac.restockType') },
      emergency: { color: 'bg-red-100 text-red-700', label: t('inventory.rac.emergencyType') }
    };
    const typeConfig = config[type] || config.rac;
    return <Badge className={typeConfig.color}>{typeConfig.label}</Badge>;
  };

  const displayStats = {
    total: stats?.total_requests || 0,
    pending: stats?.pending_count || 0,
    approved: stats?.approved_count || 0,
    completed: stats?.completed_count || 0,
    critical: stats?.critical_count || 0
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">{t('inventory.rac.loading')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      <Head>
        <title>{t('inventory.rac.pageTitle')}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <FaExchangeAlt className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">{t('inventory.rac.title')}</h1>
                    <p className="text-purple-100 text-sm">{t('inventory.rac.subtitle')}</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => router.push('/inventory/rac/create')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              >
                <FaPlus className="mr-2" />
                {t('inventory.rac.createNew')}
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-xs text-purple-100">{t('inventory.rac.totalRequests')}</p>
                <p className="text-2xl font-bold">{displayStats.total}</p>
              </div>
              <div className="bg-yellow-500/30 backdrop-blur-sm rounded-lg p-3 border border-yellow-400/30">
                <p className="text-xs text-yellow-100">{t('inventory.rac.pending')}</p>
                <p className="text-2xl font-bold">{displayStats.pending}</p>
              </div>
              <div className="bg-blue-500/30 backdrop-blur-sm rounded-lg p-3 border border-blue-400/30">
                <p className="text-xs text-blue-100">{t('inventory.rac.approved')}</p>
                <p className="text-2xl font-bold">{displayStats.approved}</p>
              </div>
              <div className="bg-green-500/30 backdrop-blur-sm rounded-lg p-3 border border-green-400/30">
                <p className="text-xs text-green-100">{t('inventory.rac.completed')}</p>
                <p className="text-2xl font-bold">{displayStats.completed}</p>
              </div>
              <div className="bg-red-500/30 backdrop-blur-sm rounded-lg p-3 border border-red-400/30">
                <p className="text-xs text-red-100">{t('inventory.rac.critical')}</p>
                <p className="text-2xl font-bold">{displayStats.critical}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'all'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('inventory.rac.allRequests')}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'pending'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('inventory.rac.awaitingApproval')} ({displayStats.pending})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'approved'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('inventory.rac.approved')} ({displayStats.approved})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'completed'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('inventory.rac.completed')} ({displayStats.completed})
          </button>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={t('inventory.rac.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">{t('inventory.rac.allStatus')}</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">{t('inventory.rac.pending')}</option>
                  <option value="approved">{t('inventory.rac.approved')}</option>
                  <option value="processing">{t('inventory.rac.processing')}</option>
                  <option value="shipped">{t('inventory.rac.shipped')}</option>
                  <option value="completed">{t('inventory.rac.completed')}</option>
                  <option value="rejected">{t('inventory.rac.rejected')}</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">{t('inventory.rac.allPriority')}</option>
                  <option value="low">{t('inventory.rac.low')}</option>
                  <option value="medium">{t('inventory.rac.medium')}</option>
                  <option value="high">{t('inventory.rac.high')}</option>
                  <option value="critical">{t('inventory.rac.critical')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>{t('inventory.rac.requestList')}</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <FaFileAlt className="mx-auto text-5xl text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">{t('inventory.rac.noRequests')}</p>
                <Button
                  onClick={() => router.push('/inventory/rac/create')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <FaPlus className="mr-2" />
                  {t('inventory.rac.createFirst')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-bold text-xl text-gray-900">{request.request_number}</h3>
                          {getTypeBadge(request.request_type)}
                          {getPriorityBadge(request.priority)}
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-gray-600 mb-2">{request.reason}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <FaStore className="text-gray-400" />
                            <span>{t('inventory.rac.from')}: <span className="font-semibold text-gray-700">Location {request.from_location_id}</span></span>
                          </div>
                          <FaExchangeAlt className="text-gray-400" />
                          <div className="flex items-center space-x-1">
                            <FaWarehouse className="text-gray-400" />
                            <span>{t('inventory.rac.to')}: <span className="font-semibold text-gray-700">Location {request.to_location_id}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">{t('inventory.rac.requestDate')}</p>
                        <p className="font-semibold text-gray-900">{formatDate(request.request_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('inventory.rac.requiredDate')}</p>
                        <p className="font-semibold text-gray-900">{formatDate(request.required_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('inventory.rac.totalItems')}</p>
                        <p className="font-semibold text-gray-900">{request.items_count || 0} item</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('inventory.rac.requestedBy')}</p>
                        <p className="font-semibold text-gray-900">{request.requested_by}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewDetail(request)}
                      >
                        <FaEye className="mr-2" />
                        {t('inventory.rac.viewDetail')}
                      </Button>
                      {request.status === 'submitted' && (
                        <>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApproveModal(true);
                            }}
                          >
                            <FaCheck className="mr-2" />
                            {t('inventory.rac.approve')}
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectModal(true);
                            }}
                          >
                            <FaTimes className="mr-2" />
                            {t('inventory.rac.reject')}
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline">
                        <FaPrint />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('inventory.rac.detailTitle')} - {selectedRequest.request_number}</h2>
                  <div className="flex items-center space-x-2 mt-2">
                    {getTypeBadge(selectedRequest.request_type)}
                    {getPriorityBadge(selectedRequest.priority)}
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">{t('inventory.rac.requestInfo')}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('inventory.rac.fromLocation')}:</span>
                        <span className="font-semibold text-gray-900">Location {selectedRequest.from_location_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('inventory.rac.toLocation')}:</span>
                        <span className="font-semibold text-gray-900">Location {selectedRequest.to_location_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('inventory.rac.requestDate')}:</span>
                        <span className="font-semibold text-gray-900">{formatDate(selectedRequest.request_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('inventory.rac.requiredDate')}:</span>
                        <span className="font-semibold text-red-600">{formatDate(selectedRequest.required_date)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{t('inventory.rac.reason')}:</span> {selectedRequest.reason}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">{t('inventory.rac.statusApproval')}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('inventory.rac.requestedBy')}:</span>
                        <span className="font-semibold text-gray-900">{selectedRequest.requested_by}</span>
                      </div>
                      {selectedRequest.approved_by && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('inventory.rac.approvedBy')}:</span>
                            <span className="font-semibold text-gray-900">{selectedRequest.approved_by}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('inventory.rac.approvalDate')}:</span>
                            <span className="font-semibold text-gray-900">{selectedRequest.approval_date ? formatDate(selectedRequest.approval_date) : '-'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              {selectedRequest.items && selectedRequest.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">{t('inventory.rac.itemsDetail')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('inventory.rac.product')}</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">{t('inventory.rac.currentStock')}</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">{t('inventory.rac.qtyRequest')}</th>
                          {selectedRequest.status !== 'draft' && selectedRequest.status !== 'submitted' && (
                            <th className="text-center p-3 text-sm font-semibold text-gray-700">{t('inventory.rac.qtyApproved')}</th>
                          )}
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('inventory.rac.notes')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="p-3">
                              <p className="font-medium text-gray-900">{item.product_name}</p>
                              <p className="text-xs text-gray-500">{item.product_sku}</p>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`font-semibold ${item.current_stock === 0 ? 'text-red-600' : item.current_stock < 10 ? 'text-orange-600' : 'text-gray-900'}`}>
                                {item.current_stock} {item.unit}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-semibold text-purple-600">{item.requested_qty} {item.unit}</span>
                            </td>
                            {selectedRequest.status !== 'draft' && selectedRequest.status !== 'submitted' && (
                              <td className="p-3 text-center">
                                <span className="font-semibold text-green-600">{item.approved_qty || item.requested_qty} {item.unit}</span>
                              </td>
                            )}
                            <td className="p-3">
                              <p className="text-xs text-gray-600">{item.notes || '-'}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedRequest.notes && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded mb-6">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{t('inventory.rac.additionalNotes')}:</span> {selectedRequest.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                  {t('common.close')}
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <FaPrint className="mr-2" />
                  {t('inventory.rac.print')}
                </Button>
                {selectedRequest.status === 'submitted' && (
                  <>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setShowDetailModal(false);
                        setShowApproveModal(true);
                      }}
                    >
                      <FaCheck className="mr-2" />
                      {t('inventory.rac.approveRequest')}
                    </Button>
                    <Button 
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        setShowDetailModal(false);
                        setShowRejectModal(true);
                      }}
                    >
                      <FaTimes className="mr-2" />
                      {t('inventory.rac.rejectRequest')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('inventory.rac.approveRequest')}</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {t('inventory.rac.approveConfirm')} <strong>{selectedRequest.request_number}</strong>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('inventory.rac.approvalNotes')}
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder={t('inventory.rac.addNotesPlaceholder')}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowApproveModal(false);
                    setApprovalNotes('');
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={actionLoading}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      {t('inventory.rac.processingAction')}
                    </>
                  ) : (
                    <>
                      <FaCheck className="mr-2" />
                      {t('inventory.rac.approve')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('inventory.rac.rejectRequest')}</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {t('inventory.rac.rejectConfirm')} <strong>{selectedRequest.request_number}</strong>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('inventory.rac.rejectionReason')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder={t('inventory.rac.rejectReasonPlaceholder')}
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={actionLoading}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleReject}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={actionLoading || !rejectionReason}
                >
                  {actionLoading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      {t('inventory.rac.processingAction')}
                    </>
                  ) : (
                    <>
                      <FaTimes className="mr-2" />
                      {t('inventory.rac.reject')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default RACManagementPage;
