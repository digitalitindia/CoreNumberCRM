import { useState, useEffect } from 'react';
import { X, Plus, Save, MapPin, Building2, Briefcase, Loader2, Home } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function SettingsModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [towns, setTowns] = useState([]);
  
  const [newValue, setNewValue] = useState('');
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
        console.error('Error fetching settings:', error);
        setStates([]);
        setCities([]);
        setCategories([]);
        setTowns([]);
        return;
      }

      setCategories(data.filter(s => s.setting_type === 'category'));
      setStates(data.filter(s => s.setting_type === 'state'));
      setCities(data.filter(s => s.setting_type === 'city'));
      setTowns(data.filter(s => s.setting_type === 'town'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addSetting = async (e) => {
    e.preventDefault();
    const val = newValue.trim();
    if (!val) return;

    const currentList = activeTab === 'categories' ? categories : 
                        activeTab === 'states' ? states : 
                        activeTab === 'towns' ? towns : cities;

    if (currentList.some(item => item.setting_value === val)) {
      toast.error(`Value already exists in ${activeTab}`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('crm_settings')
        .insert([{ setting_type: activeTab, setting_value: val }])
        .select();

      if (error) throw error;

      if (activeTab === 'categories') setCategories([...categories, data[0]]);
      if (activeTab === 'states') setStates([...states, data[0]]);
      if (activeTab === 'cities') setCities([...cities, data[0]]);
      if (activeTab === 'towns') setTowns([...towns, data[0]]);
      
      setNewValue('');
      toast.success('Added successfully');
    } catch (err) {
      toast.error('An error occurred while saving.');
    }
  };

  const removeSetting = async (id, type) => {
    try {
      const { error } = await supabase
        .from('crm_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (type === 'category') setCategories(categories.filter(i => i.id !== id));
      if (type === 'state') setStates(states.filter(i => i.id !== id));
      if (type === 'city') setCities(cities.filter(i => i.id !== id));
      if (type === 'town') setTowns(towns.filter(i => i.id !== id));
      
      toast.success('Removed successfully');
    } catch (err) {
      toast.error('An error occurred while deleting.');
    }
  };

  const currentList = activeTab === 'categories' ? categories : 
                      activeTab === 'states' ? states : 
                      activeTab === 'towns' ? towns : cities;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">CRM Settings</h2>
          <p className="text-slate-400 text-sm mt-1">Manage system configurations.</p>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full text-slate-300 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
           <div className="flex justify-center items-center h-40">
             <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
           </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex bg-slate-800 p-1.5 rounded-xl mb-6 shadow-inner overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setActiveTab('categories')}
                className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'categories' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Briefcase className="w-4 h-4" /> Categories
              </button>
              <button
                onClick={() => setActiveTab('states')}
                className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'states' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <MapPin className="w-4 h-4" /> States
              </button>
              <button
                onClick={() => setActiveTab('cities')}
                className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'cities' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Building2 className="w-4 h-4" /> Cities
              </button>
              <button
                onClick={() => setActiveTab('towns')}
                className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'towns' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Home className="w-4 h-4" /> Towns
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={addSetting} className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={newValue} 
                onChange={e => setNewValue(e.target.value)} 
                placeholder={`Add new ${activeTab.slice(0, -1)}...`} 
                className={`flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white focus:ring-2 transition-all ${
                  activeTab === 'categories' ? 'focus:border-purple-500 focus:ring-purple-500/20' : 
                  activeTab === 'states' ? 'focus:border-blue-500 focus:ring-blue-500/20' : 
                  activeTab === 'towns' ? 'focus:border-orange-500 focus:ring-orange-500/20' : 
                  'focus:border-emerald-500 focus:ring-emerald-500/20'
                }`}
              />
              <button type="submit" className={`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 text-white shadow-lg ${
                activeTab === 'categories' ? 'bg-purple-600 hover:bg-purple-500' : 
                activeTab === 'states' ? 'bg-blue-600 hover:bg-blue-500' : 
                activeTab === 'towns' ? 'bg-orange-600 hover:bg-orange-500' : 
                'bg-emerald-600 hover:bg-emerald-500'
              }`}>
                <Plus className="w-5 h-5" /> Add
              </button>
            </form>

            {/* List View */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {currentList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg hover:border-slate-500 transition-colors group">
                    <span className="text-slate-200 font-medium">{item.setting_value}</span>
                    <button onClick={() => removeSetting(item.id, item.setting_type)} type="button" className="text-slate-500 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {currentList.length === 0 && <div className="text-center py-8 text-slate-500 italic">No {activeTab} added yet</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700/50 bg-slate-800/80">
        <button 
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all shadow-lg"
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
