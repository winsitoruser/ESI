import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import BranchCard from '@/components/settings/BranchCard';
import BranchForm from '@/components/settings/BranchForm';
import { useBranches } from '@/hooks/useBranches';
import { FaPlus, FaArrowLeft, FaStore } from 'react-icons/fa';
import toast from 'react-hot-toast';

const BranchesPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const { 
    branches, 
    loading, 
    createBranch, 
    updateBranch, 
    deleteBranch,
    refreshBranches 
  } = useBranches();

  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const MOCK_MANAGERS = [{ id: 'm1', name: 'Budi Manager', email: 'budi@bedagang.com' }, { id: 'm2', name: 'Siti Manager', email: 'siti@bedagang.com' }] as any;
  const [managers, setManagers] = useState(MOCK_MANAGERS);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchManagers();
    }
  }, [session]);

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/employees?role=manager');
      const data = await response.json();
      if (data.success) {
        setManagers(data.data);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
      setManagers(MOCK_MANAGERS);
    }
  };

  const handleCreateBranch = () => {
    setEditingBranch(null);
    setShowForm(true);
  };

  const handleEditBranch = (branch: any) => {
    setEditingBranch(branch);
    setShowForm(true);
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan cabang ini?')) {
      return;
    }

    try {
      const result = await deleteBranch(branchId);
      if (result.success) {
        toast.success('Cabang berhasil dinonaktifkan');
        refreshBranches();
      } else {
        toast.error(result.error || 'Gagal menonaktifkan cabang');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menonaktifkan cabang');
    }
  };

  const handleToggleStatus = async (branchId: string, isActive: boolean) => {
    try {
      const result = await updateBranch(branchId, { isActive });
      if (result.success) {
        toast.success(`Cabang berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
        refreshBranches();
      } else {
        toast.error(result.error || 'Gagal mengubah status cabang');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengubah status cabang');
    }
  };

  const handleSubmitForm = async (formData: any) => {
    try {
      let result;
      if (editingBranch) {
        result = await updateBranch(editingBranch.id, formData);
      } else {
        result = await createBranch(formData);
      }

      if (result.success) {
        toast.success(`Cabang berhasil ${editingBranch ? 'diperbarui' : 'ditambahkan'}`);
        setShowForm(false);
        setEditingBranch(null);
        refreshBranches();
      } else {
        toast.error(result.error || 'Gagal menyimpan cabang');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan cabang');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingBranch(null);
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Data Cabang...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Manajemen Cabang | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/settings/store')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Kembali"
            >
              <FaArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Manajemen Cabang</h1>
              <p className="text-green-100">
                Kelola cabang, gudang, dan lokasi toko Anda
              </p>
            </div>
            <FaStore className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Form or List */}
        {showForm ? (
          <BranchForm
            branch={editingBranch}
            onSubmit={handleSubmitForm}
            onCancel={handleCancelForm}
            managers={managers}
          />
        ) : (
          <>
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Daftar Cabang
                </h2>
                <p className="text-sm text-gray-600">
                  Total: {branches.length} cabang
                </p>
              </div>
              <Button
                onClick={handleCreateBranch}
                className="bg-green-600 hover:bg-green-700"
              >
                <FaPlus className="mr-2" />
                Tambah Cabang
              </Button>
            </div>

            {/* Branch List */}
            {branches.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FaStore className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Belum Ada Cabang
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Mulai dengan menambahkan cabang pertama Anda
                  </p>
                  <Button
                    onClick={handleCreateBranch}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <FaPlus className="mr-2" />
                    Tambah Cabang
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map(branch => (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    onEdit={handleEditBranch}
                    onDelete={handleDeleteBranch}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BranchesPage;
