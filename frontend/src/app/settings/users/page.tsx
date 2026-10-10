'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Building2,
  KeyRound,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useAuth, DEMO_OFFICERS } from '@/context/AuthContext';
import { fetchUsersList, updateUserPermissions } from '@/lib/api';
import { isDemoMode } from '@/lib/config';
import type { User, OfficerTier } from '@/types';

const TIER_CONFIG: Record<
  OfficerTier,
  { labelAr: string; labelEn: string; defaultLimit: number; canOverride: boolean; color: string; badgeVariant: 'info' | 'success' | 'warning' | 'danger' }
> = {
  junior_officer: {
    labelAr: 'مسؤول ائتمان مبتدئ',
    labelEn: 'Junior Credit Officer',
    defaultLimit: 250000,
    canOverride: false,
    color: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    badgeVariant: 'info',
  },
  senior_officer: {
    labelAr: 'كبير مسؤولي الائتمان',
    labelEn: 'Senior Credit Officer',
    defaultLimit: 750000,
    canOverride: false,
    color: 'border-teal-500/30 text-teal-400 bg-teal-500/10',
    badgeVariant: 'success',
  },
  risk_manager: {
    labelAr: 'مدير مخاطر الائتمان',
    labelEn: 'Credit Risk Manager',
    defaultLimit: 3000000,
    canOverride: true,
    color: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    badgeVariant: 'warning',
  },
  cro: {
    labelAr: 'رئيس قطاع المخاطر (CRO)',
    labelEn: 'Chief Risk Officer',
    defaultLimit: 100000000,
    canOverride: true,
    color: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
    badgeVariant: 'danger',
  },
};

export default function UsersManagementPage() {
  const { language, formatCurrency } = useLanguage();
  const { session, user: currentUser } = useAuth();
  const token = session?.access_token;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'officer' | 'client'>('all');

  // Modal Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editTier, setEditTier] = useState<OfficerTier>('senior_officer');
  const [editLimit, setEditLimit] = useState<number>(750000);
  const [editCanOverride, setEditCanOverride] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      if (isDemoMode) {
        // In demo mode: populate with demo officers + demo client
        const demoList: User[] = [
          DEMO_OFFICERS.cro,
          DEMO_OFFICERS.risk_manager,
          DEMO_OFFICERS.senior_officer,
          DEMO_OFFICERS.junior_officer,
          {
            id: 'usr_client_01',
            name: 'أحمد فؤاد عبد الله',
            nameEn: 'Ahmed Fouad Abdallah',
            email: 'ahmed.fouad@credix.demo',
            role: 'client',
            title: 'مقدم طلب تمويل',
            titleEn: 'Financing Applicant',
          },
        ];
        setUsers(demoList);
      } else {
        const data = await fetchUsersList(token);
        setUsers(data as User[]);
      }
    } catch (err: any) {
      setLoadError(err?.message || (language === 'ar' ? 'تعذر تحميل قائمة المستخدمين' : 'Failed to load users'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleOpenEdit = (targetUser: User) => {
    setEditingUser(targetUser);
    const tier = targetUser.officerTier || 'junior_officer';
    setEditTier(tier);
    setEditLimit(targetUser.approvalLimitEgp ?? TIER_CONFIG[tier]?.defaultLimit ?? 250000);
    setEditCanOverride(targetUser.canOverridePolicy ?? TIER_CONFIG[tier]?.canOverride ?? false);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');
  };

  const handleTierChange = (tier: OfficerTier) => {
    setEditTier(tier);
    const config = TIER_CONFIG[tier];
    if (config) {
      setEditLimit(config.defaultLimit);
      setEditCanOverride(config.canOverride);
    }
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    try {
      if (isDemoMode) {
        // Update local state directly in demo mode
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  officerTier: editTier,
                  approvalLimitEgp: editLimit,
                  canOverridePolicy: editCanOverride,
                  title: TIER_CONFIG[editTier]?.labelAr || u.title,
                  titleEn: TIER_CONFIG[editTier]?.labelEn || u.titleEn,
                }
              : u
          )
        );
      } else {
        await updateUserPermissions(
          editingUser.id,
          {
            officerTier: editTier,
            approvalLimitEgp: editLimit,
            canOverridePolicy: editCanOverride,
          },
          token
        );
        await loadUsers();
      }

      setSaveSuccessMsg(language === 'ar' ? 'تم تحديث الصلاحيات بنجاح!' : 'Permissions updated successfully!');
      setTimeout(() => {
        setEditingUser(null);
        setSaveSuccessMsg('');
      }, 1000);
    } catch (err: any) {
      setSaveErrorMsg(err?.message || (language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Failed to save changes'));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (selectedRoleFilter !== 'all' && u.role !== selectedRoleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.nameEn && u.nameEn.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const officersCount = users.filter((u) => u.role === 'officer').length;
  const managersCount = users.filter((u) => u.officerTier === 'risk_manager' || u.officerTier === 'cro').length;
  const clientsCount = users.filter((u) => u.role === 'client').length;

  const canManagePermissions = isDemoMode || currentUser?.officerTier === 'risk_manager' || currentUser?.officerTier === 'cro';

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-brand-navy/10 dark:bg-brand-navy/20 border border-brand-navy/20 rounded-xl text-brand-navy dark:text-brand-gold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                  {language === 'ar' ? 'إدارة الصلاحيات ومصفوفة الائتمان' : 'Credit Delegation Authority Matrix'}
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                  {language === 'ar'
                    ? 'إدارة مستويات مسؤولي الائتمان، وسقوف الموافقة المالية، وتفويض تجاوز السياسات'
                    : 'Manage officer authorization tiers, financial delegation limits, and exception approval authority'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
            </Button>
          </div>
        </div>

        {/* Read-Only Notice for Junior/Senior Officers */}
        {!canManagePermissions && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
            <span className="font-semibold">
              {language === 'ar'
                ? 'وضع العرض والمشاهدة: تعديل الصلاحيات وسقوف الاعتماد مقصور حصرياً على مديري المخاطر (Risk Managers) ورئيس قطاع المخاطر (CRO).'
                : 'Read-only mode: Modifying delegation authority and credit limits is restricted strictly to Risk Managers and the CRO.'}
            </span>
          </div>
        )}

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">
                {language === 'ar' ? 'مسؤولو الائتمان المصرح لهم' : 'Authorized Credit Officers'}
              </span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-text-primary">{officersCount}</span>
              <span className="text-xs text-text-muted">{language === 'ar' ? 'موظف نشط' : 'active officers'}</span>
            </div>
          </Card>

          <Card className="p-4 border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">
                {language === 'ar' ? 'إدارة المخاطر والـ CRO' : 'Risk Managers & CRO'}
              </span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-text-primary">{managersCount}</span>
              <span className="text-xs text-text-muted">{language === 'ar' ? 'صلاحيات عليا' : 'senior authority'}</span>
            </div>
          </Card>

          <Card className="p-4 border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">
                {language === 'ar' ? 'المقترضون (العملاء)' : 'Registered Borrowers'}
              </span>
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-500">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-text-primary">{clientsCount}</span>
              <span className="text-xs text-text-muted">{language === 'ar' ? 'حساب عميل' : 'clients'}</span>
            </div>
          </Card>
        </div>

        {/* Tier Reference Cards Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(TIER_CONFIG) as OfficerTier[]).map((tierKey) => {
            const cfg = TIER_CONFIG[tierKey];
            return (
              <div
                key={tierKey}
                className={clsx(
                  'p-3 rounded-xl border bg-surface flex flex-col gap-1 transition-all',
                  cfg.color
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{language === 'ar' ? cfg.labelAr : cfg.labelEn}</span>
                  <KeyRound className="w-3.5 h-3.5 opacity-80" />
                </div>
                <div className="text-sm font-black mt-1">
                  {formatCurrency(cfg.defaultLimit)}
                </div>
                <div className="text-[10px] text-text-secondary flex items-center gap-1 mt-0.5">
                  {cfg.canOverride ? (
                    <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> {language === 'ar' ? 'تجاوز السياسات متاح' : 'Override Allowed'}
                    </span>
                  ) : (
                    <span className="text-text-muted">
                      {language === 'ar' ? 'بدون استثناء سياسات' : 'No Policy Override'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Users Table Card */}
        <Card className="border border-border shadow-sm overflow-hidden">
          {/* Filters & Search Toolbar */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-subtle/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'بحث بالاسم أو البريد الإلكتروني...' : 'Search by name or email...'}
                className="w-full ps-9 pe-3 py-1.5 text-xs bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium">
                {language === 'ar' ? 'تصفية الدور:' : 'Filter Role:'}
              </span>
              <div className="flex rounded-lg border border-border p-0.5 bg-surface text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedRoleFilter('all')}
                  className={clsx(
                    'px-2.5 py-1 rounded-md transition-all',
                    selectedRoleFilter === 'all' ? 'bg-brand-navy text-white' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {language === 'ar' ? 'الكل' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoleFilter('officer')}
                  className={clsx(
                    'px-2.5 py-1 rounded-md transition-all',
                    selectedRoleFilter === 'officer' ? 'bg-brand-navy text-white' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {language === 'ar' ? 'مسؤولو الائتمان' : 'Officers'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoleFilter('client')}
                  className={clsx(
                    'px-2.5 py-1 rounded-md transition-all',
                    selectedRoleFilter === 'client' ? 'bg-brand-navy text-white' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {language === 'ar' ? 'العملاء' : 'Clients'}
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-text-secondary font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'الدور' : 'Role'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'الرتبة الائتمانية' : 'Credit Tier'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'سقف التفويض' : 'Approval Limit'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'تجاوز السياسات' : 'Override'}</th>
                  <th className="py-3 px-4 text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{language === 'ar' ? 'جاري تحميل المستخدمين...' : 'Loading users...'}</span>
                      </div>
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-semantic-error">
                      <div className="flex items-center justify-center gap-1.5 font-semibold">
                        <AlertCircle className="w-4 h-4" />
                        <span>{loadError}</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-muted">
                      {language === 'ar' ? 'لم يتم العثور على مستخدمين مطابقين' : 'No matching users found'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const tierCfg = u.officerTier ? TIER_CONFIG[u.officerTier] : null;
                    const isOfficer = u.role === 'officer';
                    return (
                      <tr key={u.id} className="hover:bg-surface-subtle/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-navy/15 dark:bg-brand-navy/40 text-brand-navy dark:text-brand-gold font-bold flex items-center justify-center text-xs shrink-0">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-text-primary flex items-center gap-1.5">
                                <span>{language === 'ar' ? u.name : (u.nameEn || u.name)}</span>
                                {currentUser?.id === u.id && (
                                  <span className="text-[10px] bg-brand-gold/20 text-brand-gold-dark px-1.5 py-0.5 rounded-md font-bold">
                                    {language === 'ar' ? 'أنت' : 'You'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-text-muted mt-0.5">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <Badge variant={isOfficer ? 'info' : 'neutral'} size="sm">
                            {isOfficer
                              ? (language === 'ar' ? 'مسؤول ائتمان' : 'Credit Officer')
                              : (language === 'ar' ? 'عميل مقترض' : 'Client')}
                          </Badge>
                        </td>

                        <td className="py-3 px-4">
                          {isOfficer && tierCfg ? (
                            <span className={clsx('px-2 py-0.5 rounded-lg border text-[11px] font-bold', tierCfg.color)}>
                              {language === 'ar' ? tierCfg.labelAr : tierCfg.labelEn}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-bold text-text-primary">
                          {isOfficer && u.approvalLimitEgp !== undefined && u.approvalLimitEgp !== null ? (
                            <span>{formatCurrency(u.approvalLimitEgp)}</span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isOfficer ? (
                            u.canOverridePolicy ? (
                              <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? 'مصرّح' : 'Authorized'}</span>
                              </span>
                            ) : (
                              <span className="text-text-muted text-[11px]">
                                {language === 'ar' ? 'غير مصرّح' : 'Restricted'}
                              </span>
                            )
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-end">
                          {isOfficer ? (
                            canManagePermissions ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(u)}
                                className="gap-1.5 text-xs py-1 px-2.5"
                              >
                                <Edit2 className="w-3 h-3 text-brand-navy" />
                                <span>{language === 'ar' ? 'تعديل الصلاحية' : 'Edit Authority'}</span>
                              </Button>
                            ) : (
                              <span className="text-[11px] text-text-muted px-2 py-1 rounded-md bg-surface-subtle font-medium">
                                {language === 'ar' ? 'للاطلاع فقط' : 'View Only'}
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-text-muted">
                              {language === 'ar' ? 'حساب مقترض' : 'Applicant'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Edit Authority Modal */}
        <Modal
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          title={
            language === 'ar'
              ? `تعديل الصلاحيات الائتمانية: ${editingUser?.name || ''}`
              : `Edit Delegation Authority: ${editingUser?.nameEn || editingUser?.name || ''}`
          }
          size="md"
        >
          <div className="space-y-5 py-2 font-sans">
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1.5">
                {language === 'ar' ? 'الرتبة الائتمانية (Officer Tier)' : 'Officer Authorization Tier'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TIER_CONFIG) as OfficerTier[]).map((tierKey) => {
                  const cfg = TIER_CONFIG[tierKey];
                  const isSelected = editTier === tierKey;
                  return (
                    <button
                      key={tierKey}
                      type="button"
                      onClick={() => handleTierChange(tierKey)}
                      className={clsx(
                        'p-2.5 rounded-xl border text-start transition-all cursor-pointer flex flex-col justify-between',
                        isSelected
                          ? 'border-brand-navy bg-brand-navy/5 shadow-xs ring-2 ring-brand-navy/20'
                          : 'border-border hover:bg-surface-subtle'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">
                          {language === 'ar' ? cfg.labelAr : cfg.labelEn}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-brand-navy" />}
                      </div>
                      <span className="text-[11px] text-text-secondary mt-1">
                        {formatCurrency(cfg.defaultLimit)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">
                {language === 'ar' ? 'سقف الموافقة الائتمانية (بالجنيه المصري)' : 'Approval Limit (EGP)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="50000"
                  value={editLimit}
                  onChange={(e) => setEditLimit(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/30 font-bold"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                  ج.م
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                {language === 'ar'
                  ? 'أي طلب يتجاوز هذا المبلغ سيتطلب تصعيداً تلقائياً لمستوى أعلى.'
                  : 'Applications exceeding this amount will automatically trigger required escalation.'}
              </p>
            </div>

            {/* Policy Override Switch */}
            <div className="p-3 bg-surface-subtle border border-border rounded-xl flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  <span>{language === 'ar' ? 'صلاحية تجاوز السياسات (Policy Override)' : 'Policy Override Authority'}</span>
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {language === 'ar'
                    ? 'السماح باعتماد طلبات بها إشارات مخاطر استثنائية دون حظر النظام'
                    : 'Permits manual approval on flagged exceptions without system hard-stop'}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={editCanOverride}
                  onChange={(e) => setEditCanOverride(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {saveSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {saveErrorMsg && (
              <div className="p-2.5 rounded-xl bg-semantic-error-bg border border-semantic-error/30 text-semantic-error text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{saveErrorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingUser(null)}
                disabled={isSaving}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="gap-1.5"
              >
                {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{language === 'ar' ? 'حفظ الصلاحيات' : 'Save Changes'}</span>
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
