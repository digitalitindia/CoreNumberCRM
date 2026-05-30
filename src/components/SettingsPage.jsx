import { useState, useEffect, useCallback } from 'react';
import { X, Plus, MapPin, Building2, Briefcase, Loader2, Home, Edit2, Check, Users, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function SettingsPage({ currentUser, onClose }) {
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

  // Users Tab States
  const [appUsers, setAppUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [appUsersError, setAppUsersError] = useState(false);
  const [passwordResetTarget, setPasswordResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  // WhatsApp Tab States
  const [whatsappTemplate, setWhatsappTemplate] = useState('Hi {name}, ');
  const [savingTemplate, setSavingTemplate] = useState(false);

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
      
      const waTemplateData = data.find(s => s.setting_type === 'whatsapp_template');
      if (waTemplateData) {
        setWhatsappTemplate(waTemplateData.setting_value);
      }
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

  useEffect(() => {
    if (activeTab === 'users') {
      const fetchAppUsers = async () => {
        setLoadingUsers(true);
        setAppUsersError(false);
        try {
          const { data, error } = await supabase.from('app_users').select('*').order('last_sign_in_at', { ascending: false });
          if (error) throw error;
          setAppUsers(data || []);
        } catch (err) {
          console.error('Error fetching users:', err);
          setAppUsersError(true);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchAppUsers();
    }
  }, [activeTab]);

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Are you sure you want to completely delete the user ${email}?`)) return;
    setAdminActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
      if (error) throw error;
      toast.success(`User ${email} deleted.`);
      setAppUsers(appUsers.filter(u => u.id !== userId));
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to delete user. Did you run the SQL script?');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setAdminActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_update_user_password', { 
        target_user_id: passwordResetTarget.id, 
        new_password: newPassword 
      });
      if (error) throw error;
      toast.success(`Password updated for ${passwordResetTarget.email}`);
      setPasswordResetTarget(null);
      setNewPassword('');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update password. Did you run the SQL script?');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const saveWhatsappTemplate = async () => {
    setSavingTemplate(true);
    try {
      const { data: existing } = await supabase.from('crm_settings').select('id').eq('setting_type', 'whatsapp_template').maybeSingle();
      if (existing) {
        const { error } = await supabase.from('crm_settings').update({ setting_value: whatsappTemplate }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_settings').insert([{ setting_type: 'whatsapp_template', setting_value: whatsappTemplate }]);
        if (error) throw error;
      }
      toast.success('WhatsApp template saved!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

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
    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[calc(100vh-8rem)] text-slate-800">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white sticky top-0 z-10">
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
            <div className="flex bg-white p-1.5 rounded-xl mb-6 shadow-inner overflow-x-auto custom-scrollbar gap-1">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Users className="w-4 h-4" /> Users
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'categories' ? 'bg-purple-500 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Briefcase className="w-4 h-4" /> Categories
              </button>
              <button
                onClick={() => setActiveTab('states')}
                className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'states' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
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
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'whatsapp' ? 'bg-green-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
            </div>

            {activeTab === 'users' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="bg-white border border-slate-200 rounded-xl p-5 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Active App Users</h3>
                    <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm">
                      Total: {appUsers.length}
                    </span>
                  </div>
                  
                  {loadingUsers ? (
                    <div className="flex justify-center items-center h-32">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                  ) : appUsersError ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-xl shadow-sm">
                      <h4 className="font-bold text-lg mb-2">Supabase Configuration Required</h4>
                      <p className="text-sm mb-4">To view active users, please run this SQL script in your Supabase SQL Editor once:</p>
                      <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-xs overflow-x-auto font-mono shadow-inner border border-slate-700">
{`CREATE OR REPLACE VIEW public.app_users AS
SELECT id, email, created_at, last_sign_in_at
FROM auth.users;

GRANT SELECT ON public.app_users TO authenticated;`}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appUsers.map(user => (
                        <div key={user.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row md:justify-between md:items-center shadow-sm gap-4">
                          <div>
                            <p className="font-bold text-slate-800 flex items-center gap-2">
                              {user.email} 
                              {['rajeshrshiv@gmail.com', 'infodigitalitindia@gmail.com'].includes(user.email) && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">Super Admin</span>}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 font-mono">ID: {user.id.substring(0,8)}...</p>
                            <p className="text-[11px] font-medium text-slate-400 mt-1.5">
                              Last login: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
                            <p className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded border border-emerald-200 inline-block">Active</p>
                            
                            {['rajeshrshiv@gmail.com', 'infodigitalitindia@gmail.com'].includes(currentUser) && currentUser !== user.email && (
                              <div className="flex flex-wrap gap-2">
                                <button 
                                  onClick={() => { setPasswordResetTarget(user); setNewPassword(''); }}
                                  disabled={adminActionLoading}
                                  className="text-xs font-bold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                                >
                                  Change Password
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  disabled={adminActionLoading}
                                  className="text-xs font-bold px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {appUsers.length === 0 && !appUsersError && (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">No users found.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Password Reset Modal */}
                  {passwordResetTarget && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-lg text-slate-800">Change Password</h3>
                          <button onClick={() => setPasswordResetTarget(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">Set a new password for <span className="font-bold text-slate-800">{passwordResetTarget.email}</span></p>
                        
                        <form onSubmit={handlePasswordResetSubmit}>
                          <input 
                            type="text"
                            autoComplete="off"
                            placeholder="New password (min 6 chars)" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 mb-4 text-slate-900 font-medium"
                          />
                          <button 
                            type="submit" 
                            disabled={adminActionLoading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                          >
                            {adminActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div className="flex flex-col h-full">
                <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-8 flex-1">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-green-500" /> WhatsApp Message Template
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Configure the default message sent when you click the WhatsApp button on a contact.</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-sm text-slate-600">
                    <p className="font-bold text-slate-700 mb-2">Available Smart Variables:</p>
                    <ul className="space-y-1 font-mono text-xs">
                      <li><span className="bg-white px-1.5 py-0.5 border border-slate-200 rounded text-indigo-600">{"{name}"}</span> - The contact's person name</li>
                      <li><span className="bg-white px-1.5 py-0.5 border border-slate-200 rounded text-indigo-600">{"{business}"}</span> - The contact's business name</li>
                    </ul>
                  </div>

                  <textarea
                    value={whatsappTemplate}
                    onChange={(e) => setWhatsappTemplate(e.target.value)}
                    rows={6}
                    placeholder="E.g. Hi {name}, we noticed you are from {business}..."
                    className="w-full p-4 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-slate-800 resize-none shadow-sm mb-4"
                  />

                  <button
                    onClick={saveWhatsappTemplate}
                    disabled={savingTemplate}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {savingTemplate ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Save Template
                  </button>
                </div>
              </div>
            )}

            {activeTab !== 'users' && activeTab !== 'whatsapp' && (
              <>
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
                  className={`flex-1 px-4 py-3 min-w-0 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 focus:ring-2 transition-all ${
                    activeTab === 'categories' ? 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-blue-500/20' : 
                    activeTab === 'states' ? 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-blue-500/20' : 
                    activeTab === 'towns' ? 'focus:border-orange-500 focus:ring-orange-500/20' : 
                    'focus:border-emerald-500 focus:ring-emerald-500/20'
                  }`}
                />
                <button type="submit" className={`px-6 py-3 shrink-0 whitespace-nowrap rounded-xl font-bold transition-colors flex items-center gap-2 text-white ${
                  activeTab === 'categories' ? 'bg-indigo-600 hover:bg-indigo-500' : 
                  activeTab === 'states' ? 'bg-blue-600 hover:bg-blue-500' : 
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
                  <div key={item.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg hover:border-slate-300 transition-colors group">
                    {editingId === item.id ? (
                      <div className="flex-1 flex items-center gap-2 mr-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); saveEdit(item); }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button onClick={() => saveEdit(item)} className="text-emerald-600 hover:bg-emerald-500/20 p-1.5 rounded-md transition-colors">
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
                          <button onClick={() => startEdit(item)} type="button" className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-md hover:bg-blue-500/10 transition-colors">
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
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
        <button 
          onClick={onClose}
          className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-all"
        >
          Back to Dashboard
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
