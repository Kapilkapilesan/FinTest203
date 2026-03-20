'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Download, Upload } from 'lucide-react';
import { Loan, LoanStats as LoanStatsType } from '@/types/loan.types';
import { loanService } from '@/services/loan.service';
import { authService } from '@/services/auth.service';
import { LoanStats } from '@/components/loan/list/LoanStats';
import { LoanTable } from '@/components/loan/list/LoanTable';
import { LoanDetailModal } from '@/components/loan/list/LoanDetailModal';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import BMSLoader from '@/components/common/BMSLoader';
import { colors } from '@/themes/colors';


export default function LoanListPage() {
    const searchParams = useSearchParams();
    const statusFromUrl = searchParams.get('status');

    const [loans, setLoans] = useState<Loan[]>([]);
    const [stats, setStats] = useState<LoanStatsType>({
        total_count: 0,
        active_count: 0,
        completed_count: 0,
        total_disbursed: 0,
        total_outstanding: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState(statusFromUrl || 'all_statuses');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (statusFromUrl) {
            setStatusFilter(statusFromUrl);
            setCurrentPage(1);
        }
    }, [statusFromUrl]);

    const fetchLoans = useCallback(async () => {
        try {
            setLoading(true);
            const response = await loanService.getLoans({
                search: searchTerm,
                status: statusFilter,
                startDate: startDate,
                endDate: endDate,
                page: currentPage
            });
            setLoans(response.data);
            setStats(response.meta.stats);
            setTotalPages(response.meta.last_page);
            setTotalItems(response.meta.total);
        } catch (error) {
            toast.error('Failed to load loans');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter, startDate, endDate, currentPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLoans();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchLoans]);

    const handleExport = async () => {
        try {
            await loanService.exportLoans();
            toast.success('Loans exported successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to export loans');
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error('Please upload a valid CSV file');
            return;
        }

        setImporting(true);
        try {
            await loanService.importLoans(file);
            toast.success('Loans imported successfully');
            fetchLoans();
        } catch (error: any) {
            toast.error(error.message || 'Failed to import loans');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="p-4 max-w-7xl mx-auto space-y-4 min-h-screen bg-app-background transition-colors">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-text-primary tracking-tight">Loan Directory</h1>
                    <p className="text-xs text-text-muted mt-0.5 font-medium">View and manage all loan accounts</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        accept=".csv"
                        className="hidden"
                    />
                    {authService.hasPermission('loans.view') && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-card border border-border-divider text-text-secondary px-5 py-2 rounded-2xl hover:bg-hover transition-all shadow-sm font-bold text-xs uppercase tracking-widest disabled:opacity-50"
                        >
                            <Upload className="w-3.5 h-3.5 text-text-muted opacity-50" />
                            <span>{importing ? 'Importing...' : 'Import CSV'}</span>
                        </button>
                    )}
                    {authService.hasPermission('loans.view') && (
                        <button
                            onClick={handleExport}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-card border border-border-divider text-text-secondary px-5 py-2 rounded-2xl hover:bg-hover transition-all shadow-sm font-bold text-xs uppercase tracking-widest"
                        >
                            <Download className="w-3.5 h-3.5 text-text-muted opacity-50" />
                            <span>Export CSV</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Statistics */}
            <LoanStats stats={stats} />

            {/* Search and Filters */}
            <div className="bg-card rounded-2xl border border-border-default p-3 shadow-sm space-y-4 transition-colors">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex-1 relative w-full max-w-md">
                        <Search className="w-4 h-4 text-text-muted opacity-50 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by contract no, customer name..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-12 pr-4 py-2 bg-input border border-border-input rounded-xl outline-none focus:ring-2 transition-all text-sm text-text-primary"
                            style={{ '--tw-ring-color': `${colors.primary[500]}20` } as any}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-input border border-border-input text-text-secondary text-xs font-bold rounded-xl outline-none focus:ring-2 block px-3 py-2 transition-all cursor-pointer appearance-none"
                                style={{ '--tw-ring-color': `${colors.primary[500]}20` } as any}
                            >
                                <option value="All">All Active</option>
                                <option value="Active">Active</option>
                                <option value="approved">Approved</option>
                                <option value="Completed">Completed</option>
                                <option value="pending_1st">Pending 1st</option>
                                <option value="pending_2nd">Pending 2nd</option>
                                <option value="sent_back">Sent Back</option>
                                <option value="all_statuses">All Statuses</option>
                            </select>
                        </div>

                        {/* Date Range Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Date:</span>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-input border border-border-input rounded-xl">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="bg-transparent text-text-secondary text-[10px] font-bold outline-none focus:ring-0"
                                />
                                <span className="text-text-muted text-[10px] font-black uppercase opacity-40">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="bg-transparent text-text-secondary text-[10px] font-bold outline-none focus:ring-0"
                                />
                                {(startDate || endDate) && (
                                    <button
                                        onClick={() => {
                                            setStartDate('');
                                            setEndDate('');
                                            setCurrentPage(1);
                                        }}
                                        className="text-[9px] text-red-500 font-black uppercase hover:underline ml-2"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legacy Quick Toggles */}
                <div className="flex items-center gap-2 border-t border-border-divider pt-3">
                    <button
                        onClick={() => {
                            setStatusFilter('all_statuses');
                            setCurrentPage(1);
                        }}
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${statusFilter === 'all_statuses'
                            ? 'bg-text-primary text-card'
                            : 'bg-muted text-text-muted hover:bg-hover'
                            }`}
                    >
                        ALL
                    </button>
                    <button
                        onClick={() => {
                            setStatusFilter('All');
                            setCurrentPage(1);
                        }}
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${statusFilter === 'All'
                            ? 'bg-text-primary text-card'
                            : 'bg-muted text-text-muted hover:bg-hover'
                            }`}
                    >
                        ALL ACTIVE
                    </button>
                    <button
                        onClick={() => {
                            setStatusFilter('Active');
                            setCurrentPage(1);
                        }}
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${statusFilter === 'Active'
                            ? 'text-white'
                            : 'bg-muted text-text-muted hover:bg-hover'
                            }`}
                        style={statusFilter === 'Active' ? { backgroundColor: colors.primary[600] } : {}}
                    >
                        DISBURSED
                    </button>
                    <button
                        onClick={() => {
                            setStatusFilter('Completed');
                            setCurrentPage(1);
                        }}
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${statusFilter === 'Completed'
                            ? 'bg-green-600 text-white'
                            : 'bg-muted text-text-muted hover:bg-hover'
                            }`}
                    >
                        COMPLETED
                    </button>
                    <button
                        onClick={() => {
                            setStatusFilter('pending_1st');
                            setCurrentPage(1);
                        }}
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${statusFilter === 'pending_1st'
                            ? 'bg-amber-600 text-white'
                            : 'bg-muted text-text-muted hover:bg-hover'
                            }`}
                    >
                        PENDING
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="bg-card rounded-2xl border border-border-default min-h-[500px] flex flex-col items-center justify-center space-y-4 shadow-sm">
                    <BMSLoader message="Processing loans..." size="medium" />
                </div>
            ) : (
                <>
                    <LoanTable loans={loans} onView={setSelectedLoan} />

                    {/* Pagination */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border-divider">
                        <p className="text-xs text-text-muted font-black uppercase tracking-widest">
                            Showing <span className="text-text-primary">{loans.length}</span> of <span className="text-text-primary">{totalItems}</span> loans
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-5 py-2.5 bg-card border border-border-divider rounded-xl text-xs font-black uppercase tracking-widest text-text-secondary hover:bg-hover disabled:opacity-40 transition-all shadow-sm"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1.5">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all shadow-sm ${currentPage === i + 1
                                            ? 'text-white'
                                            : 'bg-card text-text-muted hover:bg-hover border border-border-divider'
                                            }`}
                                        style={currentPage === i + 1 ? { backgroundColor: colors.primary[600] } : {}}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-5 py-2.5 bg-card border border-border-divider rounded-xl text-xs font-black uppercase tracking-widest text-text-secondary hover:bg-hover disabled:opacity-40 transition-all shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Detail Modal */}
            {selectedLoan && (
                <LoanDetailModal
                    loan={selectedLoan}
                    onClose={() => setSelectedLoan(null)}
                />
            )}
        </div>
    );
}
