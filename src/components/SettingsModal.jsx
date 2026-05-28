import { useState, useEffect } from 'react';
import { X, Plus, Save, MapPin, Building2, Briefcase, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function SettingsModal({ onClose }) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [newState, setNewState] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_settings')
        .select('*');
        
      if (error) {
        // Fallback to empty if table doesn't exist yet
        console.error('Error fetching settings:', error);
        setStates([]);
        setCities([]);
        setCategories([]);
        return;
      }

      const loadedStates = data.filter(s => s.setting_type === 'state').map(s => s.setting_value);
      const loadedCities = data.filter(s => s.setting_type === 'city').map(s => s.setting_value);
      const loadedCategories = data.filter(s => s.setting_type === 'category').map(s => s.setting_value);

      setStates(loadedStates);
      setCities(loadedCities);
      setCategories(loadedCategories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addSetting = async (type, value, setLocalState, localState, clearInput) => {
    const val = value.trim();
    if (!val) return;
    if (localState.includes(val)) {
      toast.error(`${type} already exists`);
      return;
    }

    // Optimistic UI update
    setLocalState([...localState, val]);
    clearInput('');

    try {
      const { error } = await supabase
        .from('crm_settings')
        .insert([{ setting_type: type, setting_value: val }]);

      if (error) {
        toast.error(`Failed to save ${type} to database`);
        // Revert UI on error
        setLocalState(localState);
      }
    } catch (err) {
      toast.error('An error occurred while saving.');
    }
  };

  const removeSetting = async (type, value, setLocalState, localState) => {
    // Optimistic UI update
    setLocalState(localState.filter(item => item !== value));

    try {
      const { error } = await supabase
        .from('crm_settings')
        .delete()
        .match({ setting_type: type, setting_value: value });

      if (error) {
        toast.error(`Failed to remove ${type} from database`);
        // Revert UI on error
        setLocalState(localState);
      }
    } catch (err) {
      toast.error('An error occurred while deleting.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">CRM Settings</h2>
          <p className="text-slate-400 text-sm mt-1">Manage dropdown lists for the database.</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {loading ? (
           <div className="flex justify-center items-center h-40">
             <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
           </div>
        ) : (
          <>
            {/* Categories Section */}
            <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
              <div className="flex items-center gap-2 mb-4 text-purple-400">
                <Briefcase className="w-5 h-5" />
                <h3 className="text-lg font-semibold text-slate-200">Manage Categories</h3>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); addSetting('category', newCategory, setCategories, categories, setNewCategory); }} className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newCategory} 
                  onChange={e => setNewCategory(e.target.value)} 
                  placeholder="Add new category (e.g. IT, Doctor)..." 
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-white"
                />
                <button type="submit" className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-xl font-medium transition-colors flex items-center gap-1 border border-purple-500/30">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>

              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-300">
                    {cat}
                    <button onClick={() => removeSetting('category', cat, setCategories, categories)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {categories.length === 0 && <span className="text-sm text-slate-500 italic">No categories added</span>}
              </div>
            </div>

            {/* States Section */}
            <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <MapPin className="w-5 h-5" />
                <h3 className="text-lg font-semibold text-slate-200">Manage States</h3>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); addSetting('state', newState, setStates, states, setNewState); }} className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newState} 
                  onChange={e => setNewState(e.target.value)} 
                  placeholder="Add new state (e.g. Maharashtra)..." 
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-white"
                />
                <button type="submit" className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl font-medium transition-colors flex items-center gap-1 border border-blue-500/30">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                {states.map(state => (
                  <div key={state} className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-300">
                    {state}
                    <button onClick={() => removeSetting('state', state, setStates, states)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {states.length === 0 && <span className="text-sm text-slate-500 italic">No states added</span>}
              </div>
            </div>

            {/* Cities Section */}
            <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
              <div className="flex items-center gap-2 mb-4 text-teal-400">
                <Building2 className="w-5 h-5" />
                <h3 className="text-lg font-semibold text-slate-200">Manage Cities</h3>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); addSetting('city', newCity, setCities, cities, setNewCity); }} className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newCity} 
                  onChange={e => setNewCity(e.target.value)} 
                  placeholder="Add new city (e.g. Mumbai)..." 
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-white"
                />
                <button type="submit" className="px-4 py-2 bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 rounded-xl font-medium transition-colors flex items-center gap-1 border border-teal-500/30">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                {cities.map(city => (
                  <div key={city} className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-300">
                    {city}
                    <button onClick={() => removeSetting('city', city, setCities, cities)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {cities.length === 0 && <span className="text-sm text-slate-500 italic">No cities added</span>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/80">
        <button 
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)]"
        >
          Close Settings
        </button>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 10px; }
      `}</style>
    </div>
  );
}
