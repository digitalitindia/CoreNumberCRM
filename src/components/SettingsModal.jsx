import { useState, useEffect, useCallback } from 'react';
import { X, Plus, MapPin, Building2, Briefcase, Loader2, Home, Edit2, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function SettingsModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [towns, setTowns] = useState([]);
  const [selectedParentState, setSelectedParentState] = useState('');
  const [selectedParentCity, setSelectedParentCity] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
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
      setCities(data.filter(s => s.setting_type === 'city' || s.setting_type.startsWith('city_')));
      setTowns(data.filter(s => s.setting_type === 'town' || s.setting_type.startsWith('town_')));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, [fetchSettings]);

  const addSetting = async (e) => {
    e.preventDefault();
    const val = newValue.trim();
    if (!val) return;

    if (activeTab === 'cities' && !selectedParentState) {
      toast.error('Please select a State first');
      return;
    }
    if (activeTab === 'towns' && !selectedParentCity) {
      toast.error('Please select a City first');
      return;
    }

    const settingType = activeTab === 'categories' ? 'category' : 
                        activeTab === 'states' ? 'state' : 
                        activeTab === 'cities' ? `city_${selectedParentState}` : 
                        `town_${selectedParentCity}`;

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
        .insert([{ setting_type: settingType, setting_value: val }])
        .select();

      if (error) throw error;

      if (activeTab === 'categories') setCategories([...categories, data[0]]);
      if (activeTab === 'states') setStates([...states, data[0]]);
      if (activeTab === 'cities') setCities([...cities, data[0]]);
      if (activeTab === 'towns') setTowns([...towns, data[0]]);
      
      setNewValue('');
      toast.success('Added successfully');
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while saving.');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValue(item.setting_value);
  };

  const saveEdit = async (item) => {
    const newVal = editValue.trim();
    if (!newVal || newVal === item.setting_value) {
      setEditingId(null);
      return;
    }

    const currentList = activeTab === 'categories' ? categories : 
                        activeTab === 'states' ? states : 
                        activeTab === 'towns' ? towns : cities;

    if (currentList.some(i => i.setting_value === newVal && i.id !== item.id)) {
      toast.error(`Value already exists in ${activeTab}`);
      return;
    }

    try {
      // 1. Update the setting itself
      const { error } = await supabase.from('crm_settings').update({ setting_value: newVal }).eq('id', item.id);
      if (error) throw error;

      // 2. Cascade contacts
      let cascadeCol = '';
      if (activeTab === 'categories') cascadeCol = 'category';
      if (activeTab === 'states') cascadeCol = 'state';
      if (activeTab === 'cities') cascadeCol = 'city';
      if (activeTab === 'towns') cascadeCol = 'town';
      
      if (cascadeCol) {
        await supabase.from('contacts').update({ [cascadeCol]: newVal }).eq(cascadeCol, item.setting_value);
      }

      // 3. Cascade nested settings
      if (activeTab === 'states') {
         const oldType = `city_${item.setting_value}`;
         const newType = `city_${newVal}`;
         await supabase.from('crm_settings').update({ setting_type: newType }).eq('setting_type', oldType);
      }
      if (activeTab === 'cities') {
         const oldType = `town_${item.setting_value}`;
         const newType = `town_${newVal}`;
         await supabase.from('crm_settings').update({ setting_type: newType }).eq('setting_type', oldType);
      }

      await fetchSettings();
      setEditingId(null);
      toast.success('Updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while updating.');
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
      console.error(err);
      toast.error('An error occurred while deleting.');
    }
  };

  const currentList = activeTab === 'categories' ? categories : 
                      activeTab === 'states' ? states : 
                      activeTab === 'towns' ? towns : cities;

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-wide">CRM Settings</h2>
          <p className="text-slate-500 text-sm mt-1">Manage system configurations.</p>
        </div>
        <button onClick={onClose} className="p-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-full text-slate-600 hover:text-slate-900 transition-colors">
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
            <div className="flex bg-white p-1.5 rounded-xl mb-6 shadow-inner overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setActiveTab('categories')}
                className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'categories' ? 'bg-purple-500 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Briefcase className="w-4 h-4" /> Categories
              </button>
              <button
                onClick={() => setActiveTab('states')}
                className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'states' ? 'bg-blue--white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <MapPin className="w-4 h-4" /> States
              </button>
              <button
                onClick={() => setActiveTab('cities')}
                className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'cities' ? 'bg-emerald-500 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Building2 className="w-4 h-4" /> Cities
              </button>
              <button
                onClick={() => setActiveTab('towns')}
                className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'towns' ? 'bg-orange-500 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Home className="w-4 h-4" /> Towns
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={addSetting} className="flex flex-col gap-3 mb-4">
              {activeTab === 'cities' && (
                <select
                  value={selectedParentState}
                  onChange={e => setSelectedParentState(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="">-- Select State --</option>
                  {states.map(s => <option key={s.id} value={s.setting_value}>{s.setting_value}</option>)}
                </select>
              )}
              {activeTab === 'towns' && (
                <select
                  value={selectedParentCity}
                  onChange={e => setSelectedParentCity(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                >
                  <option value="">-- Select City --</option>
                  {cities.map(c => <option key={c.id} value={c.setting_value}>{c.setting_value} {c.setting_type.startsWith('city_') ? `(${c.setting_type.replace('city_', '')})` : ''}</option>)}
                </select>
              )}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newValue} 
                  onChange={e => setNewValue(e.target.value)} 
                  placeholder={`Add new ${activeTab.slice(0, -1)}...`} 
                  className={`flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 focus:ring-2 transition-all ${
                    activeTab === 'categories' ? 'focus:border-blue-500 focus:ring-blue-500/20' : 
                    activeTab === 'states' ? 'focus:border-blue-500 focus:ring-blue-500/20' : 
                    activeTab === 'towns' ? 'focus:border-orange-500 focus:ring-orange-500/20' : 
                    'focus:border-emerald-500 focus:ring-emerald-500/20'
                  }`}
                />
                <button type="submit" className={`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 text-white600 hover:bg-blue-500' : 
                  activeTab === 'towns' ? 'bg-orange-600 hover:bg-orange-500' : 
                  'bg-emerald-600 hover:bg-emerald-500'
                }`}>
                  <Plus className="w-5 h-5" /> Add
                </button>
              </div>
            </form>

            {/* List View */}
            <div className="bg-white/40 border border-slate-200/50 rounded-xl p-4 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {currentList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg hover:border-slate-500 transition-colors group">
                    {editingId === item.id ? (
                      <div className="flex-1 flex items-center gap-2 mr-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-sm outline-none focus:border-blue-500"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); saveEdit(item); }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button onClick={() => saveEdit(item)} className="text-emerald-400 hover:bg-emerald-500/20 p-1.5 rounded-md transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-slate-500 hover:bg-slate-100 p-1.5 rounded-md transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-slate-800 font-medium">
                          {item.setting_value}
                          {item.setting_type.startsWith('city_') && <span className="text-slate-500 ml-2 text-xs">({item.setting_type.replace('city_', '')})</span>}
                          {item.setting_type.startsWith('town_') && <span className="text-slate-500 ml-2 text-xs">({item.setting_type.replace('town_', '')})</span>}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(item)} type="button" className="text-slate-500 hover:text-blue-400 p-1.5 rounded-md hover:bg-blue-500/10 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeSetting(item.id, item.setting_type)} type="button" className="text-slate-500 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {currentList.length === 0 && <div className="text-center py-8 text-slate-500 italic">No {activeTab} added yet</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200/50 bg-white/80">
        <button 
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 hover:bg-slate-600 text-slate-900 rounded-xl font-bold transition-all shadow-lg"
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
