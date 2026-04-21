
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import CheckList from './components/CheckList.tsx';
import DueChecks from './components/DueChecks.tsx';
import Reports from './components/Reports.tsx';
import RiskIntelligence from './components/RiskIntelligence.tsx';
import Settings from './components/Settings.tsx';
import CheckModal from './components/CheckModal.tsx';
import Auth from './components/Auth.tsx';
import MobileLayout from './mobile/MobileLayout.tsx';
import { AppTab, Check, SystemSettings, CheckStatus, AppNotification } from './types.ts';
import { supabase, isConfigured } from './api-client.ts';
import { Loader2, Bell, CheckCheck } from 'lucide-react';

const DEFAULT_SETTINGS: SystemSettings = {
  company_name: 'FINANSSE PRO',
  currency: 'MAD',
  timezone: 'Africa/Casablanca',
  date_format: 'DD/MM/YYYY',
  fiscal_start: '2024-01-01',
  alert_before: true,
  alert_delay: true,
  alert_method: 'app',
  alert_days: 3,
  logo_url: ''
};

const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>P</text></svg>';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    return (localStorage.getItem('finansse_active_tab') as AppTab) || 'dash';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('finansse_sidebar_collapsed') === 'true';
  });
  const [checks, setChecks] = useState<Check[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<Check | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const userEmail = session?.user?.email;
  const isAdmin = userEmail === 'admin@apollo.com';
  const isRestrictedUser = userEmail === 'user@apollo.com';
  
  // Is Manager: can see ALL checks (Admin or the special user)
  const isManager = isAdmin || isRestrictedUser;

  useEffect(() => {
    if (isRestrictedUser) {
      // Allow restricted users to use checks, risks and the new due-pages
      const allowed = ['checks', 'risks', 'dueToday', 'dueTomorrow', 'dueWeek'];
      if (!allowed.includes(activeTab)) {
        setActiveTab('checks');
      }
    }
  }, [isRestrictedUser, activeTab]);

  useEffect(() => {
    localStorage.setItem('finansse_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('finansse_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    document.title = `${settings.company_name}`;
    const faviconLink = document.getElementById('favicon') as HTMLLinkElement;
    if (faviconLink) {
      faviconLink.href = settings.logo_url || DEFAULT_FAVICON;
    }
  }, [settings.company_name, settings.logo_url]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addNotification = useCallback((title: string, message: string, type: 'danger' | 'warning' | 'info', linkId?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotif: AppNotification = {
      id, title, message, type, status: 'new', createdAt: new Date().toISOString(), linkId
    };
    setNotifications(prev => {
      if (linkId && prev.some(n => n.linkId === linkId && n.title === title)) return prev;
      return [newNotif, ...prev];
    });
  }, []);

  useEffect(() => {
    const today = new Date();
    checks.forEach(c => {
      if (c.status === CheckStatus.RETURNED) {
        addNotification('Alerte Critique', `Instrument #${c.check_number} marqué comme Return.`, 'danger', c.id);
      }
      if (c.status === CheckStatus.PENDING && new Date(c.due_date) < today) {
        addNotification('Retard Détecté', `Échéance dépassée pour #${c.check_number}.`, 'warning', c.id);
      }
    });
  }, [checks, addNotification]);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const syncWithServer = useCallback(async () => {
    if (!session || !isConfigured) return;
    
    try {
      let checksQuery = supabase.from('checks').select('*');
      
      // FEATURE: If user is a manager (admin or user@apollo.com), fetch ALL checks
      // Otherwise, only fetch checks created by the current user
      if (!isManager) {
        checksQuery = checksQuery.eq('created_by', session.user.id);
      }

      const [checksRes, settingsRes] = await Promise.all([
        checksQuery.order('created_at', { ascending: false }),
        supabase
          .from('cheque_settings')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
      ]);

      if (checksRes.error) throw checksRes.error;
      if (checksRes.data) setChecks(checksRes.data);

      if (settingsRes.error && settingsRes.error.code !== 'PGRST116') {
        throw settingsRes.error;
      }

      if (settingsRes.data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...settingsRes.data,
          alert_before: String(settingsRes.data.alert_before) === 'true',
          alert_delay: String(settingsRes.data.alert_delay) === 'true',
          alert_days: parseInt(settingsRes.data.alert_days) || 3
        });
      }
    } catch (err) {
      console.error('Sync Error:', err);
    } finally {
      setLoading(false);
    }
  }, [session, isManager]);

  useEffect(() => {
    if (session) syncWithServer();
  }, [session, syncWithServer]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        syncWithServer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, syncWithServer]);

  const handleSaveSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    if (isConfigured && session) {
      const { error } = await supabase.from('cheque_settings').upsert({
        ...newSettings,
        user_id: session.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) {
        console.error('Settings Update Error:', error);
      }
    }
  };

  const handleSaveCheck = async (checkData: Partial<Check>) => {
    if (!session) return;
    const isEditing = !!editingCheck;
    
    if (isConfigured) {
      if (isEditing) {
        await supabase.from('checks').update({ ...checkData }).eq('id', editingCheck.id);
      } else {
        await supabase.from('checks').insert({ ...checkData, created_by: session.user.id });
      }
      syncWithServer();
    }
    
    setIsModalOpen(false);
    setEditingCheck(null);
  };

  const handleMarkAsPaid = async (id: string) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status: CheckStatus.PAID } : c));
    if (isConfigured) await supabase.from('checks').update({ status: CheckStatus.PAID }).eq('id', id);
  };

  const handleDeleteCheck = async (id: string) => {
    if (window.confirm('Supprimer définitivement cet instrument ?')) {
      setChecks(prev => prev.filter(c => c.id !== id));
      if (isConfigured) await supabase.from('checks').delete().eq('id', id);
    }
  };

  const handleBatchMarkAsPaid = async (ids: string[]) => {
    setChecks(prev => prev.map(c => ids.includes(c.id) ? { ...c, status: CheckStatus.PAID } : c));
    if (isConfigured) {
      await supabase.from('checks').update({ status: CheckStatus.PAID }).in('id', ids);
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    if (window.confirm(`Supprimer définitivement ces ${ids.length} instruments ?`)) {
      setChecks(prev => prev.filter(c => !ids.includes(c.id)));
      if (isConfigured) {
        await supabase.from('checks').delete().in('id', ids);
      }
    }
  };

  if (loading && session) return (
    <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-t-2 border-gold animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gold/30 animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold tracking-widest text-white/80 uppercase italic">FINANSSE PRO</h2>
        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] animate-pulse">Restauration de la session</p>
      </div>
    </div>
  );

  if (!session) return <Auth />;

  if (isMobile) {
    return (
      <MobileLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        checks={checks}
        settings={settings}
        onSaveCheck={handleSaveCheck}
        onDeleteCheck={handleDeleteCheck}
        onMarkAsPaid={handleMarkAsPaid}
        onLogout={() => {
          localStorage.clear();
          supabase.auth.signOut();
        }}
        isAdmin={isManager}
        userEmail={userEmail}
      />
    );
  }

  return (
    <div className="flex bg-[#05070a] min-h-screen text-white overflow-hidden font-['Inter']">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        companyName={settings.company_name}
        logoUrl={settings.logo_url}
        onLogout={() => {
          localStorage.clear();
          supabase.auth.signOut();
        }}
        userEmail={session.user.email}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <main className="flex-1 overflow-y-auto h-screen relative no-scrollbar">
        <div className="sticky top-0 z-40 p-8 flex items-center justify-end pointer-events-none">
          <div className="relative pointer-events-auto">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-3 rounded-full glass-card border-white/5 text-white/40 relative shadow-2xl hover:text-gold transition-colors"
            >
              <Bell size={20} />
              {notifications.filter(n => n.status === 'new').length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-black flex items-center justify-center text-white border-2 border-[#05070a]">
                  {notifications.filter(n => n.status === 'new').length}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-4 w-96 glass-card rounded-[24px] border-white/10 shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Centre d'Alertes</h4>
                  <button onClick={() => setNotifications([])} className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Nettoyer</button>
                </div>
                <div className="max-h-[400px] overflow-y-auto no-scrollbar p-4 space-y-2">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div key={n.id} className="p-4 rounded-[16px] hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/5">
                        <p className="text-[12px] font-bold text-white mb-1">{n.title}</p>
                        <p className="text-[10px] text-white/40 leading-relaxed italic">{n.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-16 text-center opacity-20 flex flex-col items-center">
                      <CheckCheck size={40} className="mb-4 text-emerald-500" />
                      <p className="text-[10px] uppercase tracking-widest font-black italic">Périmètre sécurisé</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-8 pb-12 max-w-7xl mx-auto">
          {activeTab === 'dash' && !isRestrictedUser && <Dashboard checks={checks} currency={settings.currency} onTabChange={setActiveTab} isAdmin={true} />}
          {activeTab === 'dueToday' && (
            <DueChecks
              checks={checks}
              mode="today"
              currency={settings.currency}
              onEdit={(c) => { setEditingCheck(c); setIsModalOpen(true); }}
              onMarkAsPaid={handleMarkAsPaid}
              isAdmin={isManager}
            />
          )}
          {activeTab === 'dueTomorrow' && (
            <DueChecks
              checks={checks}
              mode="tomorrow"
              currency={settings.currency}
              onEdit={(c) => { setEditingCheck(c); setIsModalOpen(true); }}
              onMarkAsPaid={handleMarkAsPaid}
              isAdmin={isManager}
            />
          )}
          {activeTab === 'dueWeek' && (
            <DueChecks
              checks={checks}
              mode="week"
              currency={settings.currency}
              onEdit={(c) => { setEditingCheck(c); setIsModalOpen(true); }}
              onMarkAsPaid={handleMarkAsPaid}
              isAdmin={isManager}
            />
          )}
          {activeTab === 'checks' && (
            <CheckList
              checks={checks}
              currency={settings.currency as any}
              onAdd={() => { setEditingCheck(null); setIsModalOpen(true); }}
              onEdit={(c) => { setEditingCheck(c); setIsModalOpen(true); }}
              onDelete={handleDeleteCheck}
              onMarkAsPaid={handleMarkAsPaid}
              onBatchDelete={handleBatchDelete}
              onBatchMarkAsPaid={handleBatchMarkAsPaid}
              isAdmin={isManager}
            />
          )}
          {activeTab === 'performance' && !isRestrictedUser && <Reports checks={checks} currency={settings.currency as any} />}
          {activeTab === 'risks' && (
            <RiskIntelligence
              checks={checks}
              currency={settings.currency as any}
              highValueThreshold={50000}
              onViewCheck={(id) => {
                const c = checks.find(ch => ch.id === id);
                if (c) { setEditingCheck(c); setIsModalOpen(true); }
              }}
            />
          )}
          {activeTab === 'parameters' && !isRestrictedUser && <Settings settings={settings} onSave={handleSaveSettings} />}
        </div>
      </main>

      {isModalOpen && (
        <CheckModal
          onClose={() => { setIsModalOpen(false); setEditingCheck(null); }}
          onSave={handleSaveCheck}
          initialData={editingCheck}
        />
      )}
    </div>
  );
};

export default App;
