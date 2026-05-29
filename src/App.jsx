import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import ContactForm from './components/ContactForm';
import ContactTable from './components/ContactTable';
import Filters from './components/Filters';
import BulkImportModal from './components/BulkImportModal';
import { Users, Search, Plus, LogOut, ChevronLeft, ChevronRight, Upload, Briefcase, Building2, MapPin, AlertCircle } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import Login from './components/Login';
import SettingsModal from './components/SettingsModal';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear } from 'date-fns';

const ITEMS_PER_PAGE = 50;

export default function App() {
  // Temporarily bypass login so the user can see the design
  const [isLocked, setIsLocked] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  // Pagination and Stats state
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

  // Calculate stats independently
  const fetchStats = async () => {
    try {
      const { count: total } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
      setStats({ total: total || 0 });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('contacts').select('*', { count: 'exact' });

      // Apply Filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
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

  const handleSignOut = () => {
    setIsLocked(true);
  };

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-300 p-6">
        <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-3xl font-bold text-white mb-4">Missing Environment Variables</h1>
        <p className="max-w-md text-center text-slate-400 mb-6">
          Your Vercel deployment is missing the required Supabase environment variables.
        </p>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 w-full max-w-lg text-sm text-slate-300 font-mono">
          <p>Please add the following variables in your Vercel Project Settings:</p>
          <ul className="list-disc ml-6 mt-2 text-emerald-400">
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
        <Login onLogin={() => setIsLocked(false)} />
      </>
    );
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-purple-500/30">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }} />

      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full mix-blend-screen filter blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full mix-blend-screen filter blur-[100px]"></div>
      </div>

      {/* Premium Glass Header */}
      <header className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between gap-4 bg-[#0f172a]/70 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 group">
            <div className="bg-gradient-to-tr from-blue-500 to-purple-600 text-white p-2.5 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_25px_rgba(168,85,247,0.7)] transition-all duration-300 transform group-hover:scale-105">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{getGreeting()}</span>
              <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 tracking-wide">
                CoreNumber CRM
              </h1>
            </div>
          </div>
        </div>

        {/* Global Search Bar (High Contrast) */}
        <div className="flex-1 max-w-2xl mx-auto hidden md:flex items-center bg-slate-800 rounded-xl px-4 py-2.5 focus-within:bg-slate-800 transition-all border border-slate-600 focus-within:border-purple-400 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          <Search className="w-5 h-5 text-slate-300" />
          <input
            type="text"
            placeholder="Search any record..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="bg-transparent border-none outline-none w-full ml-3 text-white placeholder:text-slate-400 text-base font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center p-2 text-slate-200 hover:text-white hover:bg-slate-700 rounded-xl transition-colors md:hidden"
            title="Settings"
          >
            <Users className="w-5 h-5 hidden" /> {/* Placeholder just to align icon import */}
            <span className="text-xl">⚙️</span>
          </button>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 text-slate-200 hover:text-white hover:bg-slate-700 px-3 md:px-4 py-2 rounded-xl font-bold transition-colors text-sm border border-slate-700 hover:border-slate-500 bg-slate-800"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Lock App</span>
          </button>
        </div>
      </header>

      <div className="flex pb-20 md:pb-0 relative z-10">
        {/* Sidebar (Desktop Premium) */}
        <aside className="w-72 hidden md:flex flex-col gap-2 px-4 py-6 fixed h-full top-[73px] border-r border-white/10 bg-[#0f172a]/50 backdrop-blur-md">
          <button
            onClick={() => {
              setEditingContact(null);
              setIsFormOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-3.5 rounded-xl transition-all font-semibold shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] mb-6 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            <span>Create Contact</span>
          </button>

          <div 
            onClick={() => setFilters({...filters, status: 'all'})}
            className={`flex items-center justify-between px-5 py-3.5 rounded-xl cursor-pointer transition-all ${filters.status === 'all' ? 'bg-purple-600/30 border border-purple-400 text-purple-200 shadow-inner' : 'hover:bg-slate-800 text-slate-200 border border-slate-700'}`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              <span className="font-bold text-sm">All Contacts</span>
            </div>
            <span className="text-xs font-black text-white bg-slate-700 px-2 py-1 rounded-md border border-slate-600">{stats.total}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
            <Filters filters={filters} setFilters={setFilters} contacts={contacts} isSidebar={true} />
          </div>

          <div 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-between px-5 py-3.5 rounded-xl cursor-pointer transition-all hover:bg-slate-800 text-slate-200 border border-slate-700 mt-auto bg-slate-800/50 shrink-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">⚙️</span>
              <span className="font-bold text-sm text-white">Settings</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 md:ml-72 p-3 sm:p-4 md:p-6 w-full">
          
          {/* Dashboard Metrics Cards (High Contrast) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 px-1 md:px-0 mb-6 mt-2 md:mt-0">
            <div onClick={() => setFilters({...filters, status: 'all'})} className="animate-fade-in-up bg-slate-800/80 backdrop-blur-md border-2 border-slate-600 hover:border-blue-500 cursor-pointer transition-all p-5 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl group hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]">
              <span className="text-4xl md:text-5xl font-black text-white group-hover:scale-110 transition-transform drop-shadow-md">{stats.total}</span>
              <span className="text-sm md:text-base font-bold text-blue-400 mt-2 uppercase tracking-widest">Total Contacts</span>
            </div>
            
            <div onClick={() => {
              setEditingContact(null);
              setIsFormOpen(true);
            }} className="animate-fade-in-up animate-delay-100 bg-slate-800/80 backdrop-blur-md border-2 border-slate-600 hover:border-purple-500 cursor-pointer transition-all p-5 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl group hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]">
              <div className="bg-gradient-to-tr from-blue-500 to-purple-600 p-3 rounded-full mb-2 shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-110 transition-transform border border-white/20">
                <Plus className="w-7 h-7 text-white font-bold" />
              </div>
              <span className="text-sm md:text-base font-bold text-slate-200 mt-1 uppercase tracking-widest">Add New Contact</span>
            </div>

            <div onClick={() => setIsBulkImportOpen(true)} className="animate-fade-in-up animate-delay-200 bg-slate-800/80 backdrop-blur-md border-2 border-slate-600 hover:border-emerald-500 cursor-pointer transition-all p-5 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl group hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <div className="bg-gradient-to-tr from-emerald-500 to-teal-600 p-3 rounded-full mb-2 shadow-[0_0_15px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform border border-white/20">
                <Upload className="w-7 h-7 text-white font-bold" />
              </div>
              <span className="text-sm md:text-base font-bold text-slate-200 mt-1 uppercase tracking-widest">Bulk Import Excel</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/40 backdrop-blur-sm p-4 lg:p-6 rounded-2xl border border-slate-700/50 shadow-lg relative overflow-hidden group hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:w-1.5 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-400" />
                </div>
                <h3 className="text-slate-400 text-xs lg:text-sm font-semibold uppercase tracking-wider">Total Contacts</h3>
              </div>
              <p className="text-3xl lg:text-4xl font-bold text-slate-200 mt-2">{stats.totalContacts}</p>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-sm p-4 lg:p-6 rounded-2xl border border-slate-700/50 shadow-lg relative overflow-hidden group hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 group-hover:w-1.5 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                  <Briefcase className="w-5 h-5 lg:w-6 lg:h-6 text-purple-400" />
                </div>
                <h3 className="text-slate-400 text-xs lg:text-sm font-semibold uppercase tracking-wider">Categories</h3>
              </div>
              <p className="text-3xl lg:text-4xl font-bold text-slate-200 mt-2">{stats.totalCategories}</p>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-sm p-4 lg:p-6 rounded-2xl border border-slate-700/50 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:w-1.5 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                  <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-400" />
                </div>
                <h3 className="text-slate-400 text-xs lg:text-sm font-semibold uppercase tracking-wider">Cities</h3>
              </div>
              <p className="text-3xl lg:text-4xl font-bold text-slate-200 mt-2">{stats.totalCities}</p>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-sm p-4 lg:p-6 rounded-2xl border border-slate-700/50 shadow-lg relative overflow-hidden group hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 group-hover:w-1.5 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                  <MapPin className="w-5 h-5 lg:w-6 lg:h-6 text-orange-400" />
                </div>
                <h3 className="text-slate-400 text-xs lg:text-sm font-semibold uppercase tracking-wider">States</h3>
              </div>
              <p className="text-3xl lg:text-4xl font-bold text-slate-200 mt-2">{stats.totalStates}</p>
            </div>
          </div>

          <div className="px-1 md:px-0">
            <Filters filters={filters} setFilters={setFilters} contacts={contacts} />
          </div>

          <div className="mt-4 md:mt-6 px-1 md:px-0">
            <ContactTable 
              contacts={contacts} 
              loading={loading}
              filters={filters}
              onEdit={(contact) => {
                setEditingContact(contact);
                setIsFormOpen(true);
              }}
              onDelete={handleDelete}
            />
            
            {/* Pagination Controls */}
            {!loading && totalCount > 0 && (
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl">
                <span className="text-sm text-slate-400">
                  Showing {page * ITEMS_PER_PAGE + 1} to {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of <span className="font-semibold text-slate-200">{totalCount}</span> entries
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium px-2">Page {page + 1} of {totalPages}</span>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Action Button (Mobile Premium) */}
      {!isFormOpen && (
        <button
          onClick={() => {
            setEditingContact(null);
            setIsFormOpen(true);
          }}
          className="md:hidden fixed bottom-[88px] right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)] z-40 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Bottom Navigation (Glassmorphism) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[#0f172a]/80 backdrop-blur-xl border-t border-white/10 z-30 pb-safe">
        <div className="flex justify-around items-center p-3">
          <button 
            onClick={() => setFilters({...filters, status: 'all'})}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-purple-400 bg-purple-500/10`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">All Contacts</span>
          </button>
        </div>
      </nav>

      {/* Contact Form Modal (Premium Glass) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl bg-slate-900 border border-slate-700/50 md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-8 duration-300">
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

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl bg-slate-900 border border-slate-700/50 md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-8 duration-300">
            <SettingsModal onClose={() => setIsSettingsOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
