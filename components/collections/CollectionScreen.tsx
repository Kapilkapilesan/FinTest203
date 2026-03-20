'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Download, LayoutList } from 'lucide-react';
import BMSLoader from '@/components/common/BMSLoader';
import { CollectionStats } from './CollectionStats';
import { CollectionFilters, DateMode } from './CollectionFilters';
import { ScheduledPaymentsTable } from './ScheduledPaymentsTable';
import { PaymentModal } from './PaymentModal';
import { ReceiptPreviewModal } from './ReceiptPreviewModal';
import { PaymentHistoryModal } from './PaymentHistoryModal';
import { ScheduledPayment, CollectionStats as StatsType } from '../../services/collection.types';
import { collectionService } from '../../services/collection.service';
import { branchService } from '../../services/branch.service';
import { centerService } from '../../services/center.service';
import { groupService } from '../../services/group.service';
import { authService } from '../../services/auth.service';
import { toast } from 'react-toastify';

export function CollectionScreen() {
    const [branches, setBranches] = useState<any[]>([]);
    const [centers, setCenters] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedCenter, setSelectedCenter] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dateMode, setDateMode] = useState<DateMode>('today');
    const [isAdHoc, setIsAdHoc] = useState(false);

    const [payments, setPayments] = useState<ScheduledPayment[]>([]);
    const [stats, setStats] = useState<StatsType>({
        totalDue: 0,
        collected: 0,
        arrears: 0,
        suspense: 0
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceiptPreview, setShowReceiptPreview] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<ScheduledPayment | null>(null);
    const [receiptData, setReceiptData] = useState<any>(null);

    // Fetch branches on mount
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await branchService.getBranchesAll();
                const data = Array.isArray(response) ? response : (response as any).data || [];
                setBranches(data);

                // Auto-select if only one branch (Field Officer case)
                if (data.length === 1) {
                    setSelectedBranch(String(data[0].id));
                }
            } catch (error) {
                console.error('Failed to fetch branches', error);
                toast.error('Failed to load branches');
            }
        };
        fetchBranches();
    }, []);

    // Fetch centers when branch or date changes (for day-based filtering)
    useEffect(() => {
        if (!selectedBranch) {
            setCenters([]);
            setSelectedCenter('');
            setGroups([]);
            setSelectedGroup('');
            return;
        }

        const fetchCenters = async () => {
            try {
                const response = await centerService.getCentersList();
                const allCenters = Array.isArray(response) ? response : (response as any).data || [];

                // Determine the day of the week from the selected date
                const dayName = new Date(selectedDate + 'T00:00:00')
                    .toLocaleDateString('en-US', { weekday: 'long' });

                // Filter centers by selected branch and active status
                const filtered = allCenters.filter((c: any) =>
                    String(c.branch_id) === selectedBranch &&
                    c.status === 'active'
                );

                setCenters(filtered);

                // If currently selected center is not in the new filtered list (due to day change), reset it
                if (selectedCenter && !filtered.find((c: any) => String(c.id) === selectedCenter)) {
                    setSelectedCenter('');
                }
            } catch (error) {
                console.error('Failed to fetch centers', error);
                toast.error('Failed to load centers');
            }
        };

        fetchCenters();
    }, [selectedBranch, selectedDate, isAdHoc]);

    // Fetch groups when center changes
    useEffect(() => {
        if (!selectedCenter) {
            setGroups([]);
            setSelectedGroup('');
            return;
        }

        const fetchGroups = async () => {
            try {
                const response = await groupService.getGroupsByCenter(selectedCenter);
                // Assume response is array of groups
                setGroups(Array.isArray(response) ? response : []);

                if (selectedGroup && !response.find((g: any) => String(g.id) === selectedGroup)) {
                    setSelectedGroup('');
                }
            } catch (error) {
                console.error('Failed to fetch groups', error);
                toast.error('Failed to load groups');
            }
        };

        fetchGroups();
    }, [selectedCenter]);

    // Fetch payments when branch, center, or date changes
    useEffect(() => {
        if (!selectedBranch) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await collectionService.getDuePayments(
                    selectedBranch,
                    selectedCenter || undefined,
                    selectedDate,
                    isAdHoc ? 'adhoc' : undefined
                );
                setPayments(data.payments);
                setStats(data.stats);
            } catch (error) {
                console.error('Failed to fetch collection data', error);
                toast.error('Failed to load collection data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedBranch, selectedCenter, selectedDate, isAdHoc]);

    // Filter payments by selectedGroup locally
    const filteredPayments = useMemo(() => {
        let result = payments;
        if (selectedGroup) {
            const groupObj = groups.find(g => String(g.id) === selectedGroup);
            if (groupObj) {
                result = result.filter(p => p.group === groupObj.group_name);
            }
        }
        return result;
    }, [payments, selectedGroup, groups]);

    const handleCollectPayment = (customer: ScheduledPayment) => {
        setSelectedCustomer(customer);
        setShowPaymentModal(true);
    };

    const handleShowHistory = (customer: ScheduledPayment) => {
        setSelectedCustomer(customer);
        setShowHistoryModal(true);
    };

    const handlePrintHistoryReceipt = async (payment: any) => {
        if (!payment.receipt) return;
        try {
            // We need full receipt details including branch, center, etc.
            // Let's assume we can fetch it or we already have enough in receiptData state if we update it.
            // For now, let's just trigger the preview modal with what we have.
            setReceiptData({
                payment: payment,
                receipt: payment.receipt,
                // We'll need to make sure the preview modal can handle missing branch/staff info or fetch it.
            });
            setShowReceiptPreview(true);
        } catch (error) {
            toast.error("Failed to prepare receipt for printing");
        }
    };

    const handleProcessPayment = async (amount: string, type: 'full' | 'partial', method: string, remarks: string) => {
        if (!selectedCustomer) return;

        try {
            setIsProcessing(true);

            // Store original due and arrears for receipt logic
            const originalDue = selectedCustomer.dueAmount;
            const originalArrears = selectedCustomer.arrears;
            const originalTotalPayable = selectedCustomer.totalPayable;

            const paymentData = {
                loan_id: selectedCustomer.id,
                amount: parseFloat(amount),
                payment_date: selectedDate,
                receipt_number: `RCP-${Date.now()}-${selectedCustomer.id}`
            };

            const result = await collectionService.collectPayment(paymentData);

            toast.success('Payment collected successfully!');

            // Add total context to receipt data for arrears logic
            setReceiptData({
                ...result,
                originalDue: originalDue,
                originalArrears: originalArrears,
                originalTotalPayable: originalTotalPayable
            });

            setShowPaymentModal(false);
            setShowReceiptPreview(true);

            // Refresh payment list
            const data = await collectionService.getDuePayments(
                selectedBranch,
                selectedCenter || undefined,
                selectedDate,
                isAdHoc ? 'adhoc' : undefined
            );
            setPayments(data.payments);
            setStats(data.stats);

        } catch (error: any) {
            console.error('Failed to collect payment', error);
            toast.error(error.message || 'Failed to collect payment');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrintReceipt = () => {
        window.print();
        setShowReceiptPreview(false);
        setReceiptData(null);
    };

    const handleExportSummary = async () => {
        if (!selectedBranch) return;
        try {
            await collectionService.exportCollections(
                selectedBranch,
                selectedCenter || undefined,
                selectedDate
            );
            toast.success('Collection summary exported successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to export collection summary');
        }
    };

    const getCenterName = () => {
        if (!selectedCenter) {
            const branch = branches.find(b => String(b.id) === selectedBranch);
            return branch ? branch.branch_name : '';
        }
        const center = centers.find(c => String(c.id) === selectedCenter);
        return center ? center.center_name : '';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Collection Screen</h1>
                    <p className="text-sm text-text-muted mt-1">Collect payments and generate receipts</p>
                </div>
                {selectedBranch && authService.hasPermission('collections.export') && (
                    <button
                        onClick={handleExportSummary}
                        className="flex items-center gap-2 px-6 py-2.5 bg-card border border-border-default text-text-primary rounded-2xl hover:bg-muted-bg transition-shadow shadow-sm active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Export Summary</span>
                    </button>
                )}
            </div>

            {/* Filter Section */}
            <CollectionFilters
                branches={branches}
                centers={centers}
                groups={groups}
                selectedBranch={selectedBranch}
                selectedCenter={selectedCenter}
                selectedGroup={selectedGroup}
                onBranchChange={(branchId) => {
                    setSelectedBranch(branchId);
                    setSelectedCenter('');
                    setSelectedGroup('');
                }}
                onCenterChange={(centerId) => {
                    setSelectedCenter(centerId);
                    setSelectedGroup('');
                }}
                onGroupChange={setSelectedGroup}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                dateMode={dateMode}
                onDateModeChange={setDateMode}
                isAdHoc={isAdHoc}
                onAdHocChange={setIsAdHoc}
            />

            {selectedBranch && (
                <>
                    {/* Statistics Cards */}
                    <CollectionStats stats={stats} />

                    {/* Scheduled Payments Table */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20 bg-card rounded-3xl border border-border-default">
                            <BMSLoader message="Loading payments..." size="xsmall" />
                        </div>
                    ) : (
                        <ScheduledPaymentsTable
                            payments={filteredPayments}
                            selectedCenter={getCenterName()}
                            onCollectPayment={handleCollectPayment}
                            onShowHistory={handleShowHistory}
                            selectedDate={selectedDate}
                        />
                    )}
                </>
            )}

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                customer={selectedCustomer}
                onClose={() => setShowPaymentModal(false)}
                onProcessPayment={handleProcessPayment}
                isProcessing={isProcessing}
            />

            {/* Payment History Modal */}
            <PaymentHistoryModal
                isOpen={showHistoryModal}
                customer={selectedCustomer}
                onClose={() => setShowHistoryModal(false)}
                onPrintReceipt={handlePrintHistoryReceipt}
            />

            {/* Receipt Preview Modal */}
            <ReceiptPreviewModal
                isOpen={showReceiptPreview}
                customer={selectedCustomer}
                paymentAmount={receiptData?.payment?.last_payment_amount?.toString() || '0'}
                receiptData={receiptData}
                onClose={() => {
                    setShowReceiptPreview(false);
                    setReceiptData(null);
                }}
                onPrint={handlePrintReceipt}
            />
        </div>
    );
}
