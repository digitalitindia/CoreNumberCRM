import { useState, useEffect } from 'react';
import { Search, Download, Calendar, Filter, X, Briefcase, MapPin, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

export default function Filters({ filters, setFilters, contacts, isSidebar = false }) {
  const [showFilters, setShowFilters] = useState(isSidebar); // Always show in sidebar
  const [categories, setCategories] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [towns, setTowns] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('crm_settings')
          .select('setting_type, setting_value');
          
        if (!error && data) {
          setCategories(data.filter(d => d.setting_type === 'category').map(d => d.setting_value));
          setStates(data.filter(d => d.setting_type === 'state').map(d => d.setting_value));
          setCities(data.filter(d => d.setting_type === 'city').map(d => d.setting_value));
          setTowns(data.filter(d => d.setting_type === 'town').map(d => d.setting_value));
        } else {
          setCategories(['IT', 'Doctor', 'Cafe', 'Car Dealer']); // Fallback
          setStates(['Madhya Pradesh', 'Gujarat']);
          setCities(['Surat', 'Ahmedabad', 'Indore', 'Bhopal']);
          setTowns(['Andheri East', 'Bandra']);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchCategories();
  }, []);

  const handleExport = () => {
    // Export only what matches the visible data
    const exportData = contacts.map(c => ({
      'Person Name': c.person_name || '',
      'Business Name': c.business_name || '',
      'Mobile Number': c.mobile_number,
      'Category': c.category || '',
      'State': c.state,
      'City': c.city,
      'Town': c.town,
      'Notes': c.notes,
      'Added On': c.created_at ? format(new Date(c.created_at), 'dd MMM yyyy HH:mm') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");
    XLSX.writeFile(workbook, `Contacts_Export_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  if (isSidebar) {
    return (
      <div className="flex flex-col gap-4 mt-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1">Filters</h3>
        
        {/* Category Filter */}
        <div>
          <div className="relative">
            <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="w-full pl-9 pr-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-xl text-sm outline-none focus:border-purple-500 text-slate-200 appearance-none cursor-pointer font-medium hover:border-slate-500 transition-colors"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* State Filter */}
        <div>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filters.state}
              onChange={(e) => setFilters({...filters, state: e.target.value})}
              className="w-full pl-9 pr-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-xl text-sm outline-none focus:border-purple-500 text-slate-200 appearance-none cursor-pointer font-medium hover:border-slate-500 transition-colors"
            >
              <option value="">All States</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* City Filter */}
        <div>
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filters.city}
              onChange={(e) => setFilters({...filters, city: e.target.value})}
              className="w-full pl-9 pr-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-xl text-sm outline-none focus:border-purple-500 text-slate-200 appearance-none cursor-pointer font-medium hover:border-slate-500 transition-colors"
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Town Filter */}
        <div>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filters.town}
              onChange={(e) => setFilters({...filters, town: e.target.value})}
              className="w-full pl-9 pr-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-xl text-sm outline-none focus:border-purple-500 text-slate-200 appearance-none cursor-pointer font-medium hover:border-slate-500 transition-colors"
            >
              <option value="">All Towns</option>
              {towns.map(town => (
                <option key={town} value={town}>{town}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(filters.state || filters.city || filters.town || filters.category) && (
          <button 
            onClick={() => setFilters({
              ...filters,
              timeRange: 'all',
              state: '',
              city: '',
              town: '',
              category: '',
              startDate: '',
              endDate: ''
            })}
            className="mt-2 text-sm font-bold text-slate-300 hover:text-white flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl transition-colors border-2 border-slate-700 hover:border-slate-500 w-full"
          >
            <X className="w-4 h-4" /> Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="md:hidden bg-slate-800/40 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-slate-700/50 mb-6 transition-all">
      <div className="flex flex-col gap-4 items-center justify-between">
        
        {/* Global Search */}
        <div className="w-full relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all text-white placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Buttons */}
        <div className="flex w-full gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${showFilters ? 'bg-purple-500 text-white border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-2 border-slate-600 hover:border-slate-400'}`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          <button 
            onClick={handleExport}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white border-2 border-green-500 hover:bg-green-500 hover:border-green-400 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
          >
            <Download className="w-4 h-4" />
            <span>Export View</span>
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-4 mt-5 pt-5 border-t border-slate-600 animate-in slide-in-from-top-2">
          
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Category</label>
            <div className="relative">
              <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border-2 border-slate-600 rounded-xl text-sm outline-none focus:border-purple-400 text-white appearance-none cursor-pointer font-medium"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Time Range Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Time Range</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border-2 border-slate-600 rounded-xl text-sm outline-none focus:border-purple-400 text-white appearance-none cursor-pointer font-medium"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>

          {/* Custom Date Inputs */}
          {filters.timeRange === 'custom' && (
            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-800 border-2 border-slate-600 rounded-xl text-sm outline-none focus:border-purple-400 text-white font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-800 border-2 border-slate-600 rounded-xl text-sm outline-none focus:border-purple-400 text-white font-medium"
                />
              </div>
            </div>
          )}

          {/* Location Filters */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">State</label>
            <input
              type="text"
              placeholder="Filter by state..."
              value={filters.state}
              onChange={(e) => setFilters({...filters, state: e.target.value})}
              className="w-full px-4 py-2.5 bg-slate-800 border-2 border-slate-600 rounded-xl text-sm outline-none focus:border-purple-400 text-white placeholder:text-slate-400 font-medium"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">City / Town</label>
            <input
              type="text"
              placeholder="Filter by city..."
              value={filters.city}
              onChange={(e) => setFilters({...filters, city: e.target.value})}
              className="w-full px-4 py-2.5 bg-slate-800 border-2 border-slate-600 rounded-xl text-sm outline-none focus:border-purple-400 text-white placeholder:text-slate-400 font-medium"
            />
          </div>
          
          {/* Clear Filters Button */}
          {(filters.timeRange !== 'all' || filters.state || filters.city || filters.category) && (
            <div className="md:col-span-4 flex justify-end mt-2">
              <button 
                onClick={() => setFilters({
                  ...filters,
                  timeRange: 'all',
                  state: '',
                  city: '',
                  category: '',
                  startDate: '',
                  endDate: ''
                })}
                className="text-sm font-bold text-slate-200 hover:text-white flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl transition-colors border-2 border-slate-500"
              >
                <X className="w-4 h-4" /> Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
