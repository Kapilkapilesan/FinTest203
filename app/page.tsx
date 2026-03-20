'use client'

import { useEffect, useState } from 'react';
import { authService, User } from '@/services/auth.service';
import { Search, MapPin, Building2, LayoutDashboard, Sparkles, Calendar as CalendarIcon, ArrowRight, Activity } from 'lucide-react';
import WelcomeDialog from '@/components/dashboard/WelcomeDialog';
import MonthYearPicker from '@/components/ui/MonthYearPicker';
import DashboardStatsCards from '@/components/dashboard/DashboardStatsCards';
import BranchList from '@/components/dashboard/BranchList';
import BranchPerformanceView from '@/components/dashboard/BranchPerformanceView';
import { dashboardService } from '@/services/dashboard.service';
import { DashboardStats, BranchSummary, BranchPerformanceData, DateFilter } from '@/types/dashboard.types';
import BMSLoader from '@/components/common/BMSLoader';
import { colors } from '@/themes/colors';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<BranchPerformanceData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  useEffect(() => {
    if (user) {
      const hasShownWelcome = sessionStorage.getItem('hasShownWelcome');
      if (!hasShownWelcome) {
        setShowWelcomeDialog(true);
        sessionStorage.setItem('hasShownWelcome', 'true');
      }
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData(true);
  }, [user]);

  useEffect(() => {
    if (!isLoading) {
      loadDashboardData(false);
    }
  }, [selectedMonth, selectedYear]);

  const loadDashboardData = async (initial = false) => {
    if (initial) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const currentUser = authService.getCurrentUser();

      // Permission-based branch restriction: 'dashboard.view_all' allows seeing everything
      const canViewAll = authService.hasPermission('dashboard.view_all');
      const canViewBranch = authService.hasPermission('dashboard.view');

      const branchId = (!canViewAll && canViewBranch)
        ? (currentUser?.branch?.id || (currentUser as any)?.staff?.branch_id)
        : undefined;

      const [statsData, branchesData] = await Promise.all([
        dashboardService.getDashboardStats(branchId, selectedMonth, selectedYear),
        canViewAll ? dashboardService.getBranchSummaries() : Promise.resolve([]),
      ]);

      setStats(statsData);
      setBranches(branchesData || []);

      // Auto-select own branch if restricted
      if (branchId) {
        const today = new Date().toISOString().split('T')[0];
        const branchData = await dashboardService.getBranchPerformance(branchId, 'day', today);
        if (branchData) {
          setSelectedBranch(branchData);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleBranchClick = async (branchId: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const branchData = await dashboardService.getBranchPerformance(branchId, 'day', today);

      if (branchData) {
        setSelectedBranch(branchData);
        const statsData = await dashboardService.getDashboardStats(branchId);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading branch performance:', error);
    }
  };

  const handleBranchPerformanceRefresh = async (
    filterType: DateFilter,
    date?: string,
    startDate?: string,
    endDate?: string
  ) => {
    if (!selectedBranch) return;

    try {
      const branchData = await dashboardService.getBranchPerformance(
        selectedBranch.branch_id,
        filterType,
        date,
        startDate,
        endDate
      );

      if (branchData) {
        setSelectedBranch(branchData);
      }
    } catch (error) {
      console.error('Error refreshing branch performance:', error);
    }
  };

  const handleBackToBranches = async () => {
    setSelectedBranch(null);
    const statsData = await dashboardService.getDashboardStats();
    setStats(statsData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <BMSLoader message="Synchronizing Data..." size="medium" />
      </div>
    );
  }

  const canViewAllBranches = authService.hasPermission('dashboard.view_all');
  const isBranchRestricted = !canViewAllBranches && authService.hasPermission('dashboard.view');

  return (
    <div className="min-h-screen relative overflow-hidden bg-app-background">
      {/* Ambient Premium Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-[10%] -left-[5%] w-[45%] h-[45%] rounded-full opacity-10 blur-[140px]"
          style={{ background: `radial-gradient(circle, ${colors.primary[500]}, transparent)` }}
        />
        <div
          className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full opacity-5 blur-[120px]"
          style={{ background: `radial-gradient(circle, ${colors.indigo[400]}, transparent)` }}
        />
      </div>

      <div className="relative z-10 p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700">
        {/* Welcome Dialog */}
        {showWelcomeDialog && user && (
          <WelcomeDialog
            username={user.name}
            onClose={() => setShowWelcomeDialog(false)}
          />
        )}

        {(isBranchRestricted || !selectedBranch) && (
          <div className="relative group perspective-1000">
            <div
              className="relative overflow-hidden rounded-[2rem] p-6 text-white shadow-2xl transition-all duration-700 hover:shadow-primary-500/20"
              style={{
                background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.primary[600]}, ${colors.primary[700]})`,
              }}
            >
              {/* Internal Reflective Shine */}
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {/* <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                      <Sparkles className="w-5 h-5 text-primary-300" />
                    </div> */}
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary-200">Dashboard</span>
                  </div>

                  <div>
                    <h1 className="text-4xl font-black tracking-tighter leading-none mb-3">
                      Hello, {user?.name || user?.full_name || 'User'}
                    </h1>
                    {/* <div className="flex items-center gap-4">
                      <p className="text-lg font-medium text-primary-100/80 italic">
                        The current capital health is optimal.
                      </p>
                    </div> */}
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center gap-2 opacity-80">
                      <CalendarIcon className="w-4 h-4 text-primary-300" />
                      <span className="text-xs font-bold text-primary-100/90 tracking-wide">
                        {new Date().toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    {/* <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-2 opacity-80">
                      <Activity className="w-4 h-4 text-primary-300" />
                      <span className="text-xs font-bold text-primary-100/90 tracking-wide">Flow Active</span>
                    </div> */}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="bg-white/5 backdrop-blur-2xl rounded-2xl p-4 border border-white/10 shadow-xl group-hover:border-white/20 transition-all duration-500">
                    <div className="flex flex-col items-center sm:items-end gap-3">
                      <div className="flex items-center gap-3">
                        {isRefreshing && (
                          <div className="flex items-center gap-2 text-[10px] font-black text-primary-300 uppercase tracking-widest animate-pulse mr-2">
                            <div className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
                            Synchronizing
                          </div>
                        )}
                        <MonthYearPicker
                          selectedMonth={selectedMonth}
                          selectedYear={selectedYear}
                          onChange={(m, y) => {
                            setSelectedMonth(m);
                            setSelectedYear(y);
                          }}
                          className="!bg-white/10 !backdrop-blur-md !border-white/20 !text-white !rounded-xl !px-4 !py-2 !text-xs !font-black !uppercase !tracking-widest"
                        />
                      </div>

                      <div className="text-center sm:text-right">
                        {/* <p className="text-[10px] uppercase tracking-[0.4em] font-black text-primary-300 mb-1">Terminal Origin</p> */}
                        <p className="text-2xl font-black tracking-tighter tabular-nums">
                          {new Date().toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Stats Cards */}
        {(isBranchRestricted || !selectedBranch) && stats && (
          <div className="animate-in slide-in-from-bottom-6 duration-700 delay-100">
            <DashboardStatsCards
              stats={stats}
              isManager={isBranchRestricted}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </div>
        )}

        {/* Branch Section or Branch Performance View */}
        {selectedBranch ? (
          <div className="animate-in slide-in-from-bottom-8 duration-800">
            <BranchPerformanceView
              branchData={selectedBranch}
              onBack={handleBackToBranches}
              onRefresh={handleBranchPerformanceRefresh}
              hideBack={isBranchRestricted}
            />
          </div>
        ) : isBranchRestricted ? (
          <div className="bg-card rounded-[2.5rem] border border-border-default p-16 text-center shadow-xl">
            <BMSLoader message="Analyzing Branch Performance..." size="small" />
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-1000">
            {/* Branches Header with Precision Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
              <div className="relative">
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-full opacity-50" />
                <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">Branches</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em]">Select an entity for granular performance logs</span>
                </div>
              </div>

              {/* Search Bar Refinement */}
              <div className="relative group max-w-md w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Search branch ID or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 border border-border-default rounded-[1.5rem] bg-input text-text-primary placeholder-text-muted outline-none transition-all shadow-lg font-bold text-sm focus:ring-4 focus:ring-primary-500/5 focus:border-primary-500/50"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="w-px h-4 bg-border-divider" />
                  <Building2 className="w-4 h-4 text-text-muted" />
                </div>
              </div>
            </div>

            {/* Branches Grid Wrapper */}
            <div className="pb-12">
              <BranchList
                branches={branches}
                onBranchClick={handleBranchClick}
                searchQuery={searchQuery}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
