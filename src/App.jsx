import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import ContactForm from './components/ContactForm';
import ContactTable from './components/ContactTable';
import Filters from './components/Filters';
import BulkImportModal from './components/BulkImportModal';
import { Plus, Search, LogOut, Users, Settings, Upload, Download, AlertCircle, ChevronLeft, ChevronRight, Phone, CheckCircle, Database } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { isToday, isThisWeek, isThisMonth, isThisYear, parseISO } from 'date-fns';
import Login from './components/Login';
import SettingsPage from './components/SettingsPage';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear } from 'date-fns';

const ITEMS_PER_PAGE = 50;

export default function App() {
  const [isLocked, setIsLocked] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [filters, setFilters] = useState({
    status: 'all',
    timeRange: 'all',
    state: '',
    city: '',
    town: '',
    search: '',
    startDate: '',
    endDate: ''
  });

  const fetchStats = async () => {
    try {
      const { count: total } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
      const { count: leads } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).or('status.eq.lead,status.is.null');
      const { count: followUps } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'follow_up');
      const { count: converted } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'converted');
      
      setStats({ 
        total: total || 0,
        leads: leads || 0,
        followUps: followUps || 0,
        converted: converted || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleGoHome = () => {
    setFilters({
      status: 'all',
      timeRange: 'all',
      state: '',
      city: '',
      town: '',
      search: '',
      startDate: '',
      endDate: ''
    });
    setPage(0);
    setIsFormOpen(false);
    setEditingContact(null);
    setIsSettingsOpen(false);
    setIsBulkImportOpen(false);
  };

  const handleExport = () => {
    const filtered = contacts.filter(contact => {
      if (filters.timeRange !== 'all' && contact.created_at) {
        const date = parseISO(contact.created_at);
        if (filters.timeRange === 'today' && !isToday(date)) return false;
        if (filters.timeRange === 'week' && !isThisWeek(date)) return false;
        if (filters.timeRange === 'month' && !isThisMonth(date)) return false;
        if (filters.timeRange === 'year' && !isThisYear(date)) return false;
        if (filters.timeRange === 'custom' && filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate);
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          if (date < start || date > end) return false;
        }
      }
      if (filters.status && filters.status !== 'all' && contact.status !== filters.status) return false;
      if (filters.state && !contact.state?.toLowerCase().includes(filters.state.toLowerCase())) return false;
      if (filters.city && !contact.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.town && !contact.town?.toLowerCase().includes(filters.town.toLowerCase())) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchBName = contact.business_name?.toLowerCase().includes(search);
        const matchPName = contact.person_name?.toLowerCase().includes(search);
        const matchNum = contact.mobile_number?.includes(search);
        if (!matchBName && !matchPName && !matchNum) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      toast.error('No records to export');
      return;
    }

    const exportData = filtered.map(c => ({
      'Mobile Number': c.mobile_number,
      'Person Name': c.person_name || '',
      'Business Name': c.business_name || '',
      'Category': c.category || '',
      'State': c.state || '',
      'City': c.city || '',
      'Town': c.town || '',
      'Notes': c.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, 
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered_Contacts");
    XLSX.writeFile(workbook, `Contacts_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${filtered.length} records`);
  };

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('contacts').select('*', { count: 'exact' });

      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'lead') {
          query = query.or('status.eq.lead,status.is.null');
        } else {
          query = query.eq('status', filters.status);
        }
      }
      
      if (filters.timeRange !== 'all') {
        const now = new Date();
        let start, end;
        if (filters.timeRange === 'today') { start = startOfDay(now); end = endOfDay(now); }
        else if (filters.timeRange === 'week') { start = startOfWeek(now); end = endOfWeek(now); }
        else if (filters.timeRange === 'month') { start = startOfMonth(now); end = endOfMonth(now); }
        else if (filters.timeRange === 'year') { start = startOfYear(now); end = endOfYear(now); }
        else if (filters.timeRange === 'custom' && filters.startDate && filters.endDate) {
          start = new Date(filters.startDate);
          end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
        }
        
        if (start && end) {
          query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
        }
      }

      if (filters.search) {
        query = query.or(`business_name.ilike.%${filters.search}%,person_name.ilike.%${filters.search}%,mobile_number.ilike.%${filters.search}%`);
      }

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.state) query = query.ilike('state', `%${filters.state}%`);
      if (filters.city) query = query.ilike('city', `%${filters.city}%`);
      if (filters.town) query = query.ilike('town', `%${filters.town}%`);

      // Pagination
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      setContacts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setCurrentUser(session.user.email);
        setIsLocked(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (!isLocked) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchContacts();
       
      fetchStats();
    }
  }, [isLocked, filters, page, fetchContacts]);

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0);
  }, [filters]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        const { error } = await supabase.from('contacts').delete().eq('id', id);
        if (error) throw error;
        toast.success('Contact deleted successfully');
        fetchContacts();
        fetchStats();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete contact');
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsLocked(true);
  };

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 p-6">
        <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Missing Environment Variables</h1>
        <p className="max-w-md text-center text-slate-500 mb-6">
          Your Vercel deployment is missing the required Supabase environment variables.
        </p>
        <div className="bg-white p-4 rounded-xl border border-slate-200 w-full max-w-lg text-sm text-slate-600 font-mono">
          <p>Please add the following variables in your Vercel Project Settings:</p>
          <ul className="list-disc ml-6 mt-2 text-emerald-600">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
          </ul>
        </div>
        <p className="mt-6 text-slate-500 text-sm">After adding them, trigger a new deployment.</p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <>
        <Toaster position="top-center" />
        <Login onLogin={(email) => { setCurrentUser(email); setIsLocked(false); }} />
      </>
    );
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);



  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-500/30">
      <Toaster position="top-center" toastOptions={{ style: { background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } }} />

      {/* Premium Clean Header */}
      <header className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between gap-4 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={handleGoHome} className="flex items-center gap-2 md:gap-3 group text-left cursor-pointer outline-none rounded-xl focus:ring-2 focus:ring-indigo-500/30">
            <div className="bg-indigo-600 p-2 md:p-2.5 rounded-lg shadow-sm text-white group-hover:bg-indigo-700 transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                CoreNumber CRM
              </h1>
            </div>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-2xl mx-auto hidden md:flex items-center bg-white rounded-lg px-4 py-2 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search any record..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="bg-transparent border-none outline-none w-full ml-3 text-slate-900 placeholder:text-slate-400 text-sm font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-xs font-bold text-slate-800">{currentUser}</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-0.5">SUPER ADMIN</span>
            </div>
          )}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center p-2 text-slate-800 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors md:hidden"
            title="Settings"
          >
            <Users className="w-5 h-5 hidden" /> {/* Placeholder just to align icon import */}
            <span className="text-xl">⚙️</span>
          </button>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 text-slate-800 hover:text-slate-900 hover:bg-slate-100 px-3 md:px-4 py-2 rounded-xl font-bold transition-colors text-sm border border-slate-200 hover:border-slate-300 bg-white"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Lock App</span>
          </button>
        </div>
      </header>

      <div className="flex pb-20 md:pb-0 relative z-10 w-full">
        {/* Sidebar (Desktop Premium) */}
        <aside className="w-64 hidden md:flex flex-col gap-2 px-5 py-8 fixed h-full top-[73px] border-r border-slate-800 bg-slate-900 text-slate-300">
          <button
            onClick={() => {
              setEditingContact(null);
              setIsFormOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium shadow-sm mb-6 w-full"
          >
            <Plus className="w-4 h-4" />
            <span>Create Contact</span>
          </button>

          <div 
            onClick={() => setFilters({...filters, status: 'all'})}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${filters.status === 'all' ? 'bg-indigo-600 text-white font-medium' : 'hover:bg-slate-800 hover:text-white font-medium text-slate-400'}`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              <span className="text-sm">All Contacts</span>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${filters.status === 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{stats.total}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
            <Filters filters={filters} setFilters={setFilters} isSidebar={true} />
          </div>

          <div 
            onClick={() => setIsSettingsOpen(true)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors font-medium mt-auto shrink-0 mb-20 ${isSettingsOpen ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4" />
              <span className="text-sm">Settings</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 md:ml-64 p-3 sm:p-6 md:p-8 w-full max-w-[100vw] overflow-hidden">
          {isSettingsOpen ? (
            <SettingsPage currentUser={currentUser} onClose={() => setIsSettingsOpen(false)} />
          ) : (
            <>
              {/* Detailed Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-indigo-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Leads</h3>
                <div className="p-1 bg-indigo-50 text-indigo-600 rounded">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.leads || 0}</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-yellow-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-ups</h3>
                <div className="p-1 bg-yellow-50 text-yellow-600 rounded">
                  <Phone className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.followUps || 0}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-green-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Converted</h3>
                <div className="p-1 bg-green-50 text-green-600 rounded">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.converted || 0}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Database</h3>
                <div className="p-1 bg-blue-50 text-blue-600 rounded">
                  <Database className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.total || 0}</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900 hidden md:block">Records</h2>
            <div className="flex gap-2 w-full md:w-auto justify-end">
              <button onClick={handleExport} className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm flex-1 md:flex-none">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button onClick={() => setIsBulkImportOpen(true)} className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex-1 md:flex-none">
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </button>
            </div>
          </div>

          <div className="md:hidden mb-6">
            <Filters filters={filters} setFilters={setFilters} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <ContactTable 
              contacts={contacts} 
              loading={loading}
              filters={filters}
              onEdit={(contact) => {
                setEditingContact(contact);
                setIsFormOpen(true);
              }}
              onDelete={handleDelete}
              page={page}
              itemsPerPage={ITEMS_PER_PAGE}
            />
            
            {/* Pagination Controls */}
            {!loading && totalCount > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 md:px-6 bg-slate-50 border-t border-slate-200 pb-24 md:pb-4">
                <span className="text-sm text-slate-600 text-center md:text-left">
                  Showing <span className="font-medium text-slate-900">{page * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium text-slate-900">{Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)}</span> of <span className="font-medium text-slate-900">{totalCount}</span> results
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 mr-2 md:mr-4 border-r border-slate-200 pr-2 md:pr-4">
                    <span className="text-sm text-slate-500 hidden sm:inline">Go to page:</span>
                    <span className="text-sm text-slate-500 sm:hidden">Go:</span>
                    <input 
                      type="number" 
                      min="1" 
                      max={totalPages}
                      defaultValue={page + 1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          let val = parseInt(e.target.value);
                          if (isNaN(val)) return;
                          if (val < 1) val = 1;
                          if (val > totalPages) val = totalPages;
                          setPage(val - 1);
                        }
                      }}
                      className="w-16 px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </main>
      </div>

      {/* Floating Action Button */}
      {!isFormOpen && !isSettingsOpen && (
        <button
          onClick={() => {
            setEditingContact(null);
            setIsFormOpen(true);
          }}
          className="fixed bottom-[88px] md:bottom-8 right-4 md:right-8 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:bg-indigo-700 hover:-translate-y-1 z-40 transition-all duration-300 active:scale-95 group"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Bottom Navigation (Glassmorphism) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-slate-50/80 backdrop-blur-xl border-t border-slate-200 z-30 pb-safe">
        <div className="flex justify-around items-center p-3">
          <button 
            onClick={() => setFilters({...filters, status: 'all'})}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-indigo-600 bg-purple-500/10`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">All Contacts</span>
          </button>
        </div>
      </nav>

      {/* Contact Form Drawer (Right Side) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full md:w-[450px] lg:w-[500px] h-full bg-slate-50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <ContactForm 
              initialData={editingContact}
              onClose={() => {
                setIsFormOpen(false);
                setEditingContact(null);
              }}
              onSuccess={() => {
                setIsFormOpen(false);
                setEditingContact(null);
                fetchContacts();
                fetchStats();
              }}
            />
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <BulkImportModal 
          onClose={() => setIsBulkImportOpen(false)}
          onImportComplete={fetchContacts}
        />
      )}

    </div>
  );
}
