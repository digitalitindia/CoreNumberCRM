import { useState, useEffect } from 'react';
import { Edit2, Trash2, Copy, MessageCircle, Loader2, MoreVertical, ArrowUpDown, PhoneCall, Calendar, FileText, Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { isToday, isThisWeek, isThisMonth, isThisYear, parseISO, format, formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';

export default function ContactTable({ contacts, loading, filters, onEdit, onDelete, page = 0, itemsPerPage = 50 }) {
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [whatsappTemplate, setWhatsappTemplate] = useState('Hi {name}, ');
  const [localMessageCounts, setLocalMessageCounts] = useState({});
  const [localLastMessagedAt, setLocalLastMessagedAt] = useState({});

  useEffect(() => {
    const fetchWaTemplate = async () => {
      try {
        const { data } = await supabase.from('crm_settings').select('setting_value').eq('setting_type', 'whatsapp_template').maybeSingle();
        if (data && data.setting_value) {
          setWhatsappTemplate(data.setting_value);
        }
      } catch (e) {
        console.error('Failed to fetch WA template', e);
      }
    };
    fetchWaTemplate();
  }, []);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  const handleCopy = (number) => {
    navigator.clipboard.writeText(number);
    toast.success('Number copied to clipboard');
  };

  const handleWhatsApp = async (number, name, business, contactId, currentCount = 0) => {
    let finalMsg = whatsappTemplate
      .replace(/\{name\}/gi, name || '')
      .replace(/\{business\}/gi, business || '');
    const text = encodeURIComponent(finalMsg);
    window.open(`https://wa.me/91${number}?text=${text}`, '_blank');
    
    if (contactId) {
      const now = new Date().toISOString();
      const newCount = (localMessageCounts[contactId] !== undefined ? localMessageCounts[contactId] : currentCount) + 1;
      setLocalMessageCounts(prev => ({ ...prev, [contactId]: newCount }));
      setLocalLastMessagedAt(prev => ({ ...prev, [contactId]: now }));
      
      try {
        await supabase
          .from('contacts')
          .update({ 
            messages_sent: newCount,
            last_messaged_at: now
          })
          .eq('id', contactId);
      } catch (e) {
        console.error('Failed to update message count:', e);
      }
    }
  };

  const getStatusBadge = (status) => {
    const base = "px-1 py-[1px] text-[9px] font-bold rounded flex items-center gap-1 border";
    switch(status) {
      case 'follow_up': return <span className={`${base} bg-yellow-50 text-yellow-700 border-yellow-200/60`}><span className="text-[7px]">🟡</span> Follow-up</span>;
      case 'converted': return <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200/60`}><span className="text-[7px]">🟢</span> Converted</span>;
      case 'not_interested': return <span className={`${base} bg-red-50 text-red-700 border-red-200/60`}><span className="text-[7px]">🔴</span> Closed</span>;
      default: return <span className={`${base} bg-blue-50 text-blue-700 border-blue-200/60`}><span className="text-[7px]">🔵</span> Lead</span>;
    }
  };

  const filteredContacts = contacts.filter(contact => {
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
    
    if (filters.status && filters.status !== 'all') {
      const contactStatus = contact.status || 'lead';
      if (contactStatus !== filters.status) return false;
    }

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

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (sortConfig.key === 'name') {
      const nameA = (a.person_name || a.business_name || '').toLowerCase();
      const nameB = (b.person_name || b.business_name || '').toLowerCase();
      return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }
    if (sortConfig.key === 'location') {
      const locA = (a.city || '').toLowerCase();
      const locB = (b.city || '').toLowerCase();
      return sortConfig.direction === 'asc' ? locA.localeCompare(locB) : locB.localeCompare(locA);
    }
    if (sortConfig.key === 'created_at') {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return sortConfig.direction === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-lg font-medium text-slate-900">Loading contacts...</p>
      </div>
    );
  }

  if (filteredContacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500 bg-slate-50/40 rounded-xl border border-slate-200/50">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl opacity-50">📂</span>
        </div>
        <p className="text-lg font-medium text-slate-900">No records found</p>
        <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-100 text-indigo-600',
      'bg-purple-100 text-indigo-600',
      'bg-emerald-100 text-emerald-600',
      'bg-orange-100 text-orange-600',
      'bg-pink-100 text-pink-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <>
      {contacts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 mb-6 text-center shadow-sm">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mb-4 shadow-inner border border-indigo-100">
            <Search className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No contacts found</h3>
          <p className="text-slate-500 max-w-sm mb-6">It looks like there are no contacts matching your current filters or search criteria.</p>
        </div>
      )}

      {/* Mobile View */}
      <div className="md:hidden divide-y divide-slate-200">
        {sortedContacts.map((contact, index) => {
          const pName = contact.person_name?.trim();
          const bName = contact.business_name?.trim();
          const displayName = pName || bName || `UU-${contact.mobile_number?.slice(-4) || 'XXXX'}`;
          const avatarLetter = (displayName.charAt(0) || 'U').toUpperCase();
          const serialNo = page * itemsPerPage + index + 1;
          const sentCount = localMessageCounts[contact.id] !== undefined ? localMessageCounts[contact.id] : (contact.messages_sent || 0);
          const lastMessaged = localLastMessagedAt[contact.id] !== undefined ? localLastMessagedAt[contact.id] : contact.last_messaged_at;
          const timeAgo = lastMessaged ? `${format(parseISO(lastMessaged), 'dd MMM yyyy')} (${formatDistanceToNow(parseISO(lastMessaged), { addSuffix: true })})` : '';
          return (
            <div key={contact.id} className={`animate-fade-in-up p-3 active:bg-slate-100 transition-colors border-b border-slate-200/50 last:border-0 hover:bg-indigo-50/50 ${sentCount > 0 ? 'bg-green-50/80' : 'even:bg-slate-50/60'}`}>
              <div className="flex gap-3 relative pb-1">
                {/* Left Column: Avatar & Serial */}
                <div className="flex flex-col items-center gap-2 mt-1 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-sm font-bold text-slate-900">
                      {avatarLetter}
                    </span>
                  </div>
                  <div className="flex items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-100 rounded-md px-1.5 py-0.5">
                    #{serialNo}
                  </div>
                </div>

                {/* Right Column: Contact Details */}
                <div className="flex-1 min-w-0">
                  {/* Name and Menu Button */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0 pr-2">
                      <h3 className="font-bold text-slate-900 text-[15px] truncate capitalize flex items-center gap-1.5" title={displayName}>
                        {displayName}
                        {sentCount > 0 && (
                          <div className="relative flex items-center">
                            <span className="peer flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full cursor-help">
                              <CheckCircle2 className="w-3 h-3" /> Sent: {sentCount}
                            </span>
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden peer-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                              {timeAgo ? `Last sent: ${timeAgo}` : 'Last sent: Date not recorded'}
                            </div>
                          </div>
                        )}
                      </h3>
                      {contact.business_name && contact.person_name && (
                        <span className="text-[12px] text-slate-500 font-medium truncate capitalize" title={contact.business_name}>
                          {contact.business_name}
                        </span>
                      )}
                    </div>
                    <button className="p-1.5 -mr-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg shrink-0 transition-colors" onClick={() => onEdit(contact)}>
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {contact.category && (
                      <span className="px-1 py-[1px] text-[9px] font-bold rounded flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200/60">
                        <span className="text-[7px]">💼</span> {contact.category}
                      </span>
                    )}
                    {getStatusBadge(contact.status)}
                  </div>

                  {/* Phone & Date */}
                  <div className="flex items-center gap-3 mt-2">
                    <a href={`tel:+91${contact.mobile_number}`} className="text-[12px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm hover:text-indigo-600 transition-colors">
                      {contact.mobile_number}
                    </a>
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {contact.created_at ? format(parseISO(contact.created_at), 'dd MMM yy') : '--'}
                    </span>
                  </div>

                  {contact.notes && (
                    <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic line-clamp-2 leading-relaxed" title={contact.notes}>
                      <FileText className="w-3 h-3 inline mr-1 text-slate-400 -mt-0.5" />
                      {contact.notes}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100/60">
                      <a href={`tel:+91${contact.mobile_number}`} className="flex-1 flex justify-center items-center gap-1 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors text-[12px] font-bold shadow-sm" title="Call">
                        <PhoneCall className="w-3.5 h-3.5" /> Call
                      </a>
                      <button onClick={() => handleWhatsApp(contact.mobile_number, displayName, contact.business_name, contact.id, contact.messages_sent || 0)} className="flex-1 flex justify-center items-center gap-1 p-2 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 transition-colors text-[12px] font-bold shadow-sm" title="WhatsApp">
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </button>
                      <button onClick={() => handleCopy(contact.mobile_number)} className="p-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors shadow-sm" title="Copy">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View - Dense */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-12 text-center">#</th>
              <th onClick={() => handleSort('name')} className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group">
                <div className="flex items-center gap-1">Name & Business <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Phone</th>
              <th onClick={() => handleSort('location')} className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group">
                <div className="flex items-center gap-1">Location <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
              </th>
              <th onClick={() => handleSort('created_at')} className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group w-32">
                <div className="flex items-center gap-1">Added On <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 max-w-[120px]">Notes</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-20 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedContacts.map((contact, index) => {
              const pName = contact.person_name?.trim();
              const bName = contact.business_name?.trim();
              const displayName = pName || bName || `UU-${contact.mobile_number?.slice(-4) || 'XXXX'}`;
              const avatarLetter = (displayName.charAt(0) || 'U').toUpperCase();
              const serialNo = page * itemsPerPage + index + 1;
              const sentCount = localMessageCounts[contact.id] !== undefined ? localMessageCounts[contact.id] : (contact.messages_sent || 0);
              const lastMessaged = localLastMessagedAt[contact.id] !== undefined ? localLastMessagedAt[contact.id] : contact.last_messaged_at;
              const timeAgo = lastMessaged ? `${format(parseISO(lastMessaged), 'dd MMM yyyy')} (${formatDistanceToNow(parseISO(lastMessaged), { addSuffix: true })})` : '';
              return (
                <tr key={contact.id} className={`animate-fade-in-up transition-colors group cursor-default ${sentCount > 0 ? 'bg-green-50/80 hover:bg-green-100/80' : 'even:bg-slate-50/60 hover:bg-indigo-50/60'}`} style={{ animationDelay: `${index * 50}ms` }}>
                  <td className="px-3 py-1.5 whitespace-nowrap text-center">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {serialNo}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAvatarColor(displayName)} shadow-sm`}>
                        {avatarLetter}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 text-sm leading-tight capitalize flex items-center gap-1.5">
                          {displayName}
                          {sentCount > 0 && (
                            <div className="relative flex items-center">
                              <span className="peer flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full cursor-help">
                                <CheckCircle2 className="w-3 h-3" /> Sent: {sentCount}
                              </span>
                              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden peer-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                                {timeAgo ? `Last sent: ${timeAgo}` : 'Last sent: Date not recorded'}
                              </div>
                            </div>
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {contact.business_name && contact.person_name && (
                            <span className="text-[10px] text-slate-500 leading-tight capitalize">{contact.business_name}</span>
                          )}
                          {contact.category && (
                            <span className="px-1 py-[1px] text-[9px] font-bold rounded flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200/60">
                              <span className="text-[7px]">💼</span> {contact.category}
                            </span>
                          )}
                          {getStatusBadge(contact.status)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-sm font-medium text-slate-600">
                    <div className="flex items-center gap-2">
                      <a href={`tel:+91${contact.mobile_number}`} className="tracking-wide text-[12px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold hover:bg-slate-100 hover:text-indigo-600 transition-colors">{contact.mobile_number}</a>
                      <div className="flex gap-1 ml-1">
                        <a href={`tel:+91${contact.mobile_number}`} className="p-1 bg-blue-50 hover:bg-blue-100 rounded text-blue-600 transition-colors" title="Call">
                          <PhoneCall className="w-3 h-3" />
                        </a>
                        <button onClick={() => handleCopy(contact.mobile_number)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Copy">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleWhatsApp(contact.mobile_number, displayName, contact.business_name, contact.id, contact.messages_sent || 0)} className="p-1.5 bg-green-50 hover:bg-green-100 rounded text-green-600 transition-colors" title="WhatsApp">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-slate-500 truncate max-w-[150px] capitalize" title={[contact.town, contact.city, contact.state].filter(Boolean).join(', ')}>
                    {[contact.town, contact.city, contact.state].filter(Boolean).join(', ')}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-700 text-[13px]">{contact.created_at ? format(parseISO(contact.created_at), 'dd MMM yyyy') : 'N/A'}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{contact.created_at ? format(parseISO(contact.created_at), 'hh:mm a') : ''}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-slate-500 truncate max-w-[120px]" title={contact.notes || ''}>
                    {contact.notes || '--'}
                  </td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(contact)} className="p-1.5 text-indigo-600 hover:bg-blue-500/20 rounded" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(contact.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
