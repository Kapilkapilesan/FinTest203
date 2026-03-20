'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Receipt } from 'lucide-react';
import { Loan } from '@/types/loan.types';
import { loanService } from '@/services/loan.service';
import { LoanCardTable } from '@/components/loan/list/LoanCardTable';
import { LoanDetailModal } from '@/components/loan/list/LoanDetailModal';
import { toast } from 'react-toastify';
import BMSLoader from '@/components/common/BMSLoader';
import { colors } from '@/themes/colors';

export default function LoanCardPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

    const fetchLoans = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch loans that are active or completed (eligible for cards)
            const response = await loanService.getLoans({
                search: searchTerm,
                status: 'All', // 'All' in this system seems to mean Active disbursed loans
                page: currentPage
            });
            setLoans(response.data);
            setTotalPages(response.meta.last_page);
            setTotalItems(response.meta.total);
        } catch (error) {
            toast.error('Failed to load loans');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, currentPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLoans();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchLoans]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 min-h-screen bg-app-background">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-text-primary tracking-tight">Loan Cards</h1>
                    <p className="text-sm text-text-muted mt-1 font-medium">Print and reprint loan cards for customers</p>
                </div>
                <div className="bg-primary-500/10 text-primary-600 px-4 py-2 rounded-2xl border border-primary-500/20 flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Stencil Printing Ready</span>
                </div>
            </div>

            {/* Search */}
            <div className="bg-card rounded-2xl border border-border-default p-4 shadow-sm space-y-4">
                <div className="relative w-full max-w-md">
                    <Search className="w-4 h-4 text-text-muted opacity-50 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by contract no, customer name..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-input border border-border-input rounded-xl outline-none focus:ring-2 transition-all text-sm text-text-primary"
                        style={{ '--tw-ring-color': `${colors.primary[500]}20` } as any}
                    />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="bg-card rounded-2xl border border-border-default min-h-[400px] flex flex-col items-center justify-center space-y-4 shadow-sm">
                    <BMSLoader message="Loading eligible loans..." size="medium" />
                </div>
            ) : (
                <>
                    <LoanCardTable
                        loans={loans}
                        onPrint={(loan) => {
                            // When print is clicked, open modal which will have the card tab
                            setSelectedLoan(loan);
                        }}
                        onView={(loan) => setSelectedLoan(loan)}
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
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
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-5 py-2.5 bg-card border border-border-divider rounded-xl text-xs font-black uppercase tracking-widest text-text-secondary hover:bg-hover disabled:opacity-40 transition-all shadow-sm"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Detail Modal - I'll modify this to optionally start on the 'card' tab */}
            {selectedLoan && (
                <LoanDetailModal
                    loan={selectedLoan}
                    onClose={() => setSelectedLoan(null)}
                    initialTab="card"
                />
            )}
        </div>
    );
}
