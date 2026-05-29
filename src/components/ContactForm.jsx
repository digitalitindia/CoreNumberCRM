import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ContactForm({ initialData, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [availableStates, setAvailableStates] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableTowns, setAvailableTowns] = useState([]);
  const [allSettings, setAllSettings] = useState([]);
  
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        mobile_number: initialData.mobile_number || '',
        notes: initialData.notes || '',
        state: initialData.state || '',
        city: initialData.city || '',
        town: initialData.town || '',
        category: initialData.category || '',
        business_name: initialData.business_name || '',
        person_name: initialData.person_name || '',
        status: initialData.status || 'lead'
      };
    }
    return {
      mobile_number: '',
      notes: '',
      state: '',
      city: '',
      town: '',
      category: '',
      business_name: '',
      person_name: '',
      status: 'lead'
    };
  });

  useEffect(() => {
    // Load states, cities, categories from Supabase
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase.from('crm_settings').select('*');
        if (!error && data) {
          setAllSettings(data);
          setAvailableStates(data.filter(s => s.setting_type === 'state').map(s => s.setting_value));
          setAvailableCategories(data.filter(s => s.setting_type === 'category').map(s => s.setting_value));
          
          // Apply dynamic defaults for new contacts
          if (!initialData) {
            const defState = data.find(s => s.setting_type === 'default_state')?.setting_value;
            const defCity = data.find(s => s.setting_type === 'default_city')?.setting_value;
            setFormData(prev => ({
              ...prev,
              state: prev.state || defState || 'Gujarat',
              city: prev.city || defCity || 'Ahmedabad'
            }));
          }
        } else {
          // Fallback
          setAvailableStates(['Madhya Pradesh', 'Gujarat']);
          setAvailableCities(['Surat', 'Ahmedabad', 'Indore', 'Bhopal']);
          setAvailableCategories(['Healthcare', 'Legal', 'Logistics', 'Finance', 'Education', 'Social Media', 'Media & OTT', 'Insurance', 'Travel', 'Retail', 'Manufacturing', 'Construction', 'Beauty & Lifestyle', 'Sports', 'On Demand', 'Marketplace', 'IT & Telecom', 'Automotive', 'Real Estate', 'Energy & Utilities', 'Agriculture', 'Government', 'Non-Profit', 'Hospitality', 'Food & Bev']);
          setAvailableTowns(['Andheri East', 'Bandra']);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    loadSettings();
  }, []);

  useEffect(() => {
    if (!allSettings.length) return;
    
    // Filter cities based on selected state
    const cities = formData.state 
      ? allSettings.filter(s => s.setting_type === `city_${formData.state}` || s.setting_type === 'city').map(s => s.setting_value)
      : allSettings.filter(s => s.setting_type.startsWith('city')).map(s => s.setting_value);
      
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvailableCities([...new Set(cities)]);

    // Filter towns based on selected city
    const towns = formData.city
      ? allSettings.filter(s => s.setting_type === `town_${formData.city}` || s.setting_type === 'town').map(s => s.setting_value)
      : allSettings.filter(s => s.setting_type.startsWith('town')).map(s => s.setting_value);
      
     
    setAvailableTowns([...new Set(towns)]);
  }, [formData.state, formData.city, allSettings]);

  const [exactMatch, setExactMatch] = useState(false);

  // Debounced duplicate check
  const checkDuplicate = useCallback(async (number) => {
    if (!number || number.length < 2) {
      setDuplicateWarning(null);
      setExactMatch(false);
      setCheckingDuplicate(false);
      return;
    }
    
    setCheckingDuplicate(true);
    try {
      let query = supabase
        .from('contacts')
        .select('person_name, business_name, mobile_number')
        .ilike('mobile_number', `${number}%`)
        .limit(3);
        
      if (initialData?.id) {
        query = query.neq('id', initialData.id);
      }

      const { data } = await query;
      
      if (data && data.length > 0) {
        const exact = data.find(c => c.mobile_number === number);
        if (number.length === 10 && exact) {
          const name = exact.person_name || exact.business_name || 'an existing contact';
          setDuplicateWarning(`This number is already saved as "${name}".`);
          setExactMatch(true);
        } else {
          // Partial matches
          const matchNames = data.map(c => `${c.mobile_number} (${c.person_name || c.business_name || 'Unknown'})`).join(', ');
          setDuplicateWarning(`Similar matches: ${matchNames}${data.length === 3 ? '...' : ''}`);
          setExactMatch(false);
        }
      } else {
        setDuplicateWarning(null);
        setExactMatch(false);
      }
    } catch (err) {
      console.error(err);
      setDuplicateWarning(null);
      setExactMatch(false);
    } finally {
      setCheckingDuplicate(false);
    }
  }, [initialData]);

  // Handle debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      checkDuplicate(formData.mobile_number);
    }, 400);
    return () => clearTimeout(timer);
  }, [formData.mobile_number, checkDuplicate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'mobile_number') {
      const cleanValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: cleanValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.mobile_number.length !== 10) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }
    setLoading(true);

    try {
      let finalData = { ...formData };
      
      // Handle empty names per user request
      if (!finalData.person_name.trim() || !finalData.business_name.trim()) {
        const { count } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
        const nextId = (count || 0) + 1;
        
        if (!finalData.person_name.trim()) {
          finalData.person_name = `UU-${nextId}`;
        }
        if (!finalData.business_name.trim()) {
          finalData.business_name = `UB-${nextId}`;
        }
      }

      if (initialData) {
        const { error } = await supabase
          .from('contacts')
          .update(finalData)
          .eq('id', initialData.id);
        if (error) throw error;
        toast.success('Contact updated');
      } else {
        const { error } = await supabase
          .from('contacts')
          .insert([finalData]);
        if (error) {
          if (error.code === '23505') {
            throw new Error('This mobile number already exists in your contacts.');
          }
          throw error;
        }
        toast.success('Contact added');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error(error.message || 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 bg-slate-50/50 backdrop-blur-md sticky top-0 z-10">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r text-indigo-700">
          {initialData ? 'Edit Contact' : 'New Contact'}
        </h2>
        <button 
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <form id="contact-form" onSubmit={handleSubmit} className="space-y-4 max-w-3xl mx-auto">
          
          <div className="bg-white/40 p-4 rounded-2xl border border-slate-200/50 space-y-3 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Mobile Number *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                  +91
                </span>
                <input
                  type="tel"
                  name="mobile_number"
                  required
                  autoFocus
                  value={formData.mobile_number}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className={`w-full pl-10 pr-10 py-2 bg-slate-50 border ${duplicateWarning ? 'border-red-500 focus:border-red-400 focus:ring-red-500/30' : formData.mobile_number.length === 10 && !checkingDuplicate ? 'border-emerald-500 focus:border-emerald-400 focus:ring-emerald-500/30' : 'border-slate-300 focus:border-blue-400 focus:ring-purple-500/30'} rounded-xl focus:ring-2 outline-none transition-all text-base tracking-wider placeholder:text-slate-500 text-slate-900 font-medium`}
                />
                
                {/* Visual Feedback Icons */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {checkingDuplicate && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
                  {!checkingDuplicate && formData.mobile_number.length === 10 && !duplicateWarning && (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  )}
                  {!checkingDuplicate && exactMatch && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              {duplicateWarning && (
                <div className={`mt-2.5 flex items-start gap-2 text-sm font-medium p-2.5 rounded-lg border ${exactMatch ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-orange-500 bg-orange-50 border-orange-200'}`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{duplicateWarning}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="person_name"
                  value={formData.person_name}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all placeholder:text-slate-500 text-slate-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Business
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  placeholder="e.g. Reliance Industries"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all placeholder:text-slate-500 text-slate-900 font-medium"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all text-slate-900 font-medium appearance-none cursor-pointer"
              >
                <option value="" disabled className="text-slate-500">Select Category</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white/40 p-4 rounded-2xl border border-slate-200/50 space-y-3 shadow-sm relative overflow-hidden mb-6">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  State
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all text-slate-900 font-medium appearance-none cursor-pointer"
                >
                  <option value="" disabled className="text-slate-500">Select State</option>
                  {availableStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  City
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all text-slate-900 font-medium appearance-none cursor-pointer"
                >
                  <option value="" disabled className="text-slate-500">Select City</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Town / Area
                </label>
                <select
                  name="town"
                  value={formData.town}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all text-slate-900 font-medium appearance-none cursor-pointer"
                >
                  <option value="" disabled className="text-slate-500">Select Town</option>
                  {availableTowns.map(town => (
                    <option key={town} value={town}>{town}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Pipeline Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all text-slate-900 font-bold appearance-none cursor-pointer"
              >
                <option value="lead">🔵 New Lead</option>
                <option value="follow_up">🟡 Follow-up</option>
                <option value="converted">🟢 Converted</option>
                <option value="not_interested">🔴 Not Interested</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional details..."
                rows="2"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all resize-none placeholder:text-slate-500 text-slate-900 font-medium custom-scrollbar"
              ></textarea>
            </div>
          </div>

          <datalist id="states-list">
            {availableStates.map(state => <option key={state} value={state} />)}
          </datalist>
          <datalist id="cities-list">
            {availableCities.map(city => <option key={city} value={city} />)}
          </datalist>
          <datalist id="categories-list">
            {availableCategories.map(cat => <option key={cat} value={cat} />)}
          </datalist>
        </form>
      </div>

      {/* Footer Actions */}
      <div className="p-4 md:p-6 border-t border-slate-200/50 bg-slate-50/80 backdrop-blur-md sticky bottom-0 z-10 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 text-slate-600 font-medium hover:bg-white rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="contact-form"
          disabled={loading || !!duplicateWarning}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-8 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{initialData ? 'Update' : 'Save'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
