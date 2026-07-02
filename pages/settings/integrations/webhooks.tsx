import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Modal from '@/components/ui/modal';
import { 
  FaLink, FaPlus, FaEdit, FaTrash, FaPlay, FaPause, FaCopy, 
  FaCheckCircle, FaTimesCircle, FaClock, FaHistory, FaKey
} from 'react-icons/fa';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

const WebhookManagement: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const MOCK_WEBHOOKS: Webhook[] = [
    { id: 'wh1', name: 'Order Notification', url: 'https://example.com/webhook/orders', events: ['order.created', 'order.paid'], isActive: true, secret: 'whsec_xxx', lastTriggered: '2026-03-15T08:30:00', successCount: 152, failureCount: 3, createdAt: '2026-01-15' },
    { id: 'wh2', name: 'Stock Alert', url: 'https://example.com/webhook/stock', events: ['stock.low'], isActive: true, secret: 'whsec_yyy', lastTriggered: '2026-03-14T16:00:00', successCount: 28, failureCount: 0, createdAt: '2026-02-01' },
  ];
  const [webhooks, setWebhooks] = useState<Webhook[]>(MOCK_WEBHOOKS);
  const [showModal, setShowModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [showSecret, setShowSecret] = useState<{ [key: string]: boolean }>({});

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    isActive: true,
    secret: ''
  });

  const availableEvents = [
    { id: 'order.created', label: 'Order Created' },
    { id: 'order.updated', label: 'Order Updated' },
    { id: 'order.paid', label: 'Order Paid' },
    { id: 'order.cancelled', label: 'Order Cancelled' },
    { id: 'product.created', label: 'Product Created' },
    { id: 'product.updated', label: 'Product Updated' },
    { id: 'product.deleted', label: 'Product Deleted' },
    { id: 'stock.low', label: 'Low Stock Alert' },
    { id: 'customer.created', label: 'Customer Created' },
    { id: 'payment.received', label: 'Payment Received' }
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchWebhooks();
    }
  }, [session]);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/integrations/webhooks');
      const data = await response.json();
      
      if (data.success) {
        setWebhooks(data.data);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      setWebhooks(MOCK_WEBHOOKS);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingWebhook 
        ? `/api/settings/integrations/webhooks/${editingWebhook.id}`
        : '/api/settings/integrations/webhooks';
      
      const method = editingWebhook ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert(editingWebhook ? 'Webhook berhasil diupdate!' : 'Webhook berhasil ditambahkan!');
        setShowModal(false);
        resetForm();
        fetchWebhooks();
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving webhook:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleDelete = async (webhook: Webhook) => {
    if (!confirm(`Hapus webhook ${webhook.name}?`)) return;

    try {
      const response = await fetch(`/api/settings/integrations/webhooks/${webhook.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Webhook berhasil dihapus!');
        fetchWebhooks();
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    try {
      const response = await fetch(`/api/settings/integrations/webhooks/${webhook.id}/toggle`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        fetchWebhooks();
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (error) {
      console.error('Error toggling webhook:', error);
      alert('Terjadi kesalahan');
    }
  };

  const testWebhook = async (webhook: Webhook) => {
    try {
      const response = await fetch(`/api/settings/integrations/webhooks/${webhook.id}/test`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        alert('Test webhook berhasil dikirim!');
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      alert('Terjadi kesalahan');
    }
  };

  const regenerateSecret = async (webhook: Webhook) => {
    if (!confirm('Regenerate secret akan membatalkan akses webhook lama. Lanjutkan?')) return;

    try {
      const response = await fetch(`/api/settings/integrations/webhooks/${webhook.id}/regenerate-secret`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        alert('Secret berhasil diregenerate!');
        fetchWebhooks();
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (error) {
      console.error('Error regenerating secret:', error);
      alert('Terjadi kesalahan');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Disalin ke clipboard!');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      events: [],
      isActive: true,
      secret: ''
    });
    setEditingWebhook(null);
  };

  const openEditModal = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      secret: webhook.secret
    });
    setShowModal(true);
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Webhook Management | BEDAGANG Cloud POS</title>
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <FaLink className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Webhook Management</h1>
                  <p className="text-indigo-100">Kelola integrasi webhook dengan eksternal services</p>
                </div>
              </div>
              <Button
                onClick={() => setShowModal(true)}
                className="bg-white text-indigo-600 hover:bg-indigo-50"
              >
                <FaPlus className="mr-2" />
                Tambah Webhook
              </Button>
            </div>
          </div>

          {/* Webhooks List */}
          <div className="grid gap-4">
            {webhooks.map((webhook) => (
              <Card key={webhook.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{webhook.name}</h3>
                        <Badge variant={webhook.isActive ? 'success' : 'secondary'}>
                          {webhook.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span>URL:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded">{webhook.url}</code>
                          <button
                            onClick={() => copyToClipboard(webhook.url)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <FaCopy />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span>Secret:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            {showSecret[webhook.id] ? webhook.secret : '••••••••••••••••'}
                          </code>
                          <button
                            onClick={() => setShowSecret(prev => ({ ...prev, [webhook.id]: !prev[webhook.id] }))}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {showSecret[webhook.id] ? <FaTimes /> : <FaKey />}
                          </button>
                          <button
                            onClick={() => regenerateSecret(webhook)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Regenerate Secret"
                          >
                            <FaHistory />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span>Events: {webhook.events.length} selected</span>
                          <span>•</span>
                          <span>Success: {webhook.successCount}</span>
                          <span>•</span>
                          <span>Failed: {webhook.failureCount}</span>
                          {webhook.lastTriggered && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <FaClock />
                                Last: {new Date(webhook.lastTriggered).toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {webhook.events.map(event => {
                            const eventInfo = availableEvents.find(e => e.id === event);
                            return (
                              <Badge key={event} variant="outline" className="text-xs">
                                {eventInfo?.label || event}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testWebhook(webhook)}
                        title="Test Webhook"
                      >
                        <FaPlay />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(webhook)}
                        title={webhook.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {webhook.isActive ? <FaPause /> : <FaPlay />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(webhook)}
                        title="Edit"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(webhook)}
                        title="Delete"
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {webhooks.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <FaLink className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada webhook</h3>
                  <p className="text-gray-500 mb-4">Tambahkan webhook untuk mulai mengintegrasikan dengan eksternal services</p>
                  <Button onClick={() => setShowModal(true)}>
                    <FaPlus className="mr-2" />
                    Tambah Webhook
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Add/Edit Webhook Modal */}
          {showModal && (
            <Modal
              title={editingWebhook ? 'Edit Webhook' : 'Tambah Webhook Baru'}
              onClose={() => {
                setShowModal(false);
                resetForm();
              }}
              size="lg"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nama Webhook *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Order Notification"
                    required
                  />
                </div>

                <div>
                  <Label>Endpoint URL *</Label>
                  <Input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com/webhook"
                    required
                  />
                </div>

                <div>
                  <Label>Secret Key</Label>
                  <Input
                    type="password"
                    value={formData.secret}
                    onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                    placeholder="Auto-generated jika kosong"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Digunakan untuk verifikasi signature webhook. Kosongkan untuk auto-generate.
                  </p>
                </div>

                <div>
                  <Label>Trigger Events *</Label>
                  <div className="space-y-2 mt-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                    {availableEvents.map(event => (
                      <label key={event.id} className="flex items-center">
                        <Checkbox
                          checked={formData.events.includes(event.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({ ...prev, events: [...prev.events, event.id] }));
                            } else {
                              setFormData(prev => ({ 
                                ...prev, 
                                events: prev.events.filter(e => e !== event.id)
                              }));
                            }
                          }}
                        />
                        <span className="ml-2">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <Checkbox
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
                  />
                  <span className="ml-2">Webhook Active</span>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={formData.events.length === 0}>
                    {editingWebhook ? 'Update' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      </DashboardLayout>
    </>
  );
};

export default WebhookManagement;
