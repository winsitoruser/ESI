import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  ChevronDown, 
  MapPin, 
  Users,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  isActive: boolean;
  _count?: {
    users: number;
    warehouses: number;
  };
}

interface BranchSwitcherProps {
  className?: string;
  showCompareMode?: boolean;
  onCompareModeChange?: (enabled: boolean) => void;
}

export function BranchSwitcher({ 
  className = '', 
  showCompareMode = false,
  onCompareModeChange 
}: BranchSwitcherProps) {
  const { data: session } = useSession();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [compareBranches, setCompareBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  // Fetch branches on mount
  useEffect(() => {
    fetchBranches();
  }, []);

  // Set initial branch from session
  useEffect(() => {
    if (session?.user?.branchId && !selectedBranch) {
      setSelectedBranch(session.user.branchId);
    }
  }, [session, selectedBranch]);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/branches');
      const data = await response.json();
      
      if (data.success) {
        setBranches(data.data);
      } else {
        toast.error('Gagal memuat daftar cabang');
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Gagal memuat cabang');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = async (branchId: string) => {
    if (branchId === selectedBranch) return;

    try {
      const response = await fetch('/api/auth/switch-branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ branchId }),
      });

      const data = await response.json();

      if (data.success) {
        setSelectedBranch(branchId);
        toast.success(`Beralih ke ${getBranchName(branchId)}`);
        // Reload page to update session data
        window.location.reload();
      } else {
        toast.error(data.error || 'Gagal beralih cabang');
      }
    } catch (error) {
      console.error('Error switching branch:', error);
      toast.error('Gagal beralih cabang');
    }
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : 'Cabang Tidak Dikenal';
  };

  const getBranchCode = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.code : '';
  };

  const toggleCompareMode = () => {
    const newMode = !compareMode;
    setCompareMode(newMode);
    if (onCompareModeChange) {
      onCompareModeChange(newMode);
    }
    if (!newMode) {
      setCompareBranches([]);
    }
  };

  const handleCompareBranchSelect = (branchId: string) => {
    if (compareBranches.includes(branchId)) {
      setCompareBranches(prev => prev.filter(id => id !== branchId));
    } else if (compareBranches.length < 3) {
      setCompareBranches(prev => [...prev, branchId]);
    } else {
      toast.error('Maksimal 3 cabang yang bisa dibandingkan');
    }
  };

  const currentBranch = branches.find(b => b.id === selectedBranch);

  // Don't show for single-branch users
  if (session?.user?.role === 'manager_cabang' && branches.length <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Current Branch Display */}
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedBranch} onValueChange={handleBranchChange}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Pilih cabang">
              {currentBranch ? (
                <div className="flex items-center gap-2">
                  <span>{currentBranch.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {currentBranch.code}
                  </Badge>
                </div>
              ) : (
                'Pilih Cabang'
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span>{branch.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {branch.code}
                    </Badge>
                  </div>
                  {!branch.isActive && (
                    <Badge variant="destructive" className="text-xs">
                      Nonaktif
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Compare Mode Toggle */}
      {showCompareMode && session?.user?.role !== 'manager_cabang' && (
        <Button
          variant={compareMode ? "default" : "outline"}
          size="sm"
          onClick={toggleCompareMode}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Mode Perbandingan
        </Button>
      )}

      {/* Compare Branches Selection */}
      {compareMode && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm font-medium">Bandingkan dengan:</span>
          {branches
            .filter(b => b.id !== selectedBranch)
            .map((branch) => (
              <Button
                key={branch.id}
                variant={compareBranches.includes(branch.id) ? "default" : "outline"}
                size="sm"
                onClick={() => handleCompareBranchSelect(branch.id)}
                className="text-xs"
              >
                {branch.code}
              </Button>
            ))}
        </div>
      )}

      {/* Branch Info Tooltip */}
      {currentBranch && (
        <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
          {currentBranch.city && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {currentBranch.city}
            </div>
          )}
          {currentBranch._count && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {currentBranch._count.users} pengguna
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={fetchBranches}
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}

// Hook for using branch context in components
export function useBranch() {
  const { data: session } = useSession();
  
  return {
    currentBranchId: session?.user?.branchId || null,
    currentBranchName: session?.user?.branchName || null,
    currentBranchCode: session?.user?.branchCode || null,
    isMultiBranch: session?.user?.role !== 'manager_cabang',
    canAccessAllBranches: ['super_admin', 'admin'].includes(session?.user?.role || '')
  };
}

export default BranchSwitcher;
