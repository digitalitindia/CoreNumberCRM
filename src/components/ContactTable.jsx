import { Edit2, Trash2, Copy, MessageCircle, MapPin, MoreVertical, SearchX, UserPlus, Loader2, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, isToday, isThisWeek, isThisMonth, isThisYear, parseISO } from 'date-fns';

export default function ContactTable({ contacts, loading, filters, onEdit, onDelete }) {
  
  const handleCopy = (number) => {
    navigator.clipboard.writeText(number);
    toast.success('Number copied to clipboard');
  };

  const handleWhatsApp = (number) => {
    window.open(`https://wa.me/91${number}`, '_blank');
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-medium text-white">Loading contacts...</p>
      </div>
    );
  }

  if (filteredContacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-lg">
        <div className="bg-slate-800 p-6 rounded-full mb-6 border border-slate-600 shadow-xl">
          <UserPlus className="w-12 h-12 text-blue-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">Contact list is empty</h3>
        <p className="text-slate-300 max-w-md mx-auto text-base">
          Click the <span className="font-semibold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-600">Create Contact</span> button to start adding people to your directory.
        </p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-[#eaf1fb] text-[#0a56d1]';
      case 'Interested': return 'bg-[#f3e8fd] text-[#6b25a8]';
      case 'Follow Up': return 'bg-[#fef7e0] text-[#b06000]';
      case 'Converted': return 'bg-[#e6f4ea] text-[#137333]';
      case 'Not Interested': return 'bg-[#f1f3f4] text-[#3c4043]';
      default: return 'bg-[#f1f3f4] text-[#3c4043]';
    }
  };

  const getAvatarColor = (name) => {
    const colors = ['bg-[#c2e7ff] text-[#001d35]', 'bg-[#ffdad6] text-[#410002]', 'bg-[#eaddff] text-[#21005d]', 'bg-[#c4eed0] text-[#00210e]', 'bg-[#ffdeb4] text-[#2e1500]'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden divide-y divide-slate-700/50">
        {filteredContacts.map((contact) => {
          const displayName = contact.person_name || contact.business_name || 'Unknown Contact';
          return (
            <div key={contact.id} className="animate-fade-in-up p-3 active:bg-slate-800 transition-colors border-b border-slate-700/50 last:border-0 hover:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-slate-600 flex flex-col items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-slate-200">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white text-[15px] truncate max-w-[150px]">
                      {displayName}
                    </h3>
                    <span className="text-[13px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">+91 {contact.mobile_number}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2 text-[12px] text-slate-400">
                      {contact.business_name && contact.person_name && (
                        <span className="truncate max-w-[150px] font-medium">{contact.business_name}</span>
                      )}
                      {contact.category && (
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                          {contact.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full shrink-0 transition-colors" onClick={() => onEdit(contact)}>
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View - Dense */}
      <div className="hidden md:block overflow-x-auto bg-slate-900/40 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700/50">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-700/50">
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Name & Business</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Phone</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Location</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredContacts.map((contact, index) => {
              const displayName = contact.person_name || contact.business_name || 'Unknown Contact';
              return (
                <tr key={contact.id} className="animate-fade-in-up hover:bg-slate-800/80 transition-colors group cursor-default" style={{ animationDelay: `${index * 50}ms` }}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(displayName)} shadow-lg`}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200 text-sm leading-tight">{displayName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {contact.business_name && contact.person_name && (
                            <span className="text-[11px] text-slate-500 leading-tight">{contact.business_name}</span>
                          )}
                          {contact.category && (
                            <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                              {contact.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-slate-300">
                    <div className="flex items-center gap-1.5">
                      +91 {contact.mobile_number}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <button onClick={() => handleCopy(contact.mobile_number)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Copy">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleWhatsApp(contact.mobile_number)} className="p-1 hover:bg-green-500/20 rounded text-green-400" title="WhatsApp">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400 truncate max-w-[150px]">
                    {[contact.town, contact.city, contact.state].filter(Boolean).join(', ')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(contact)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded" title="Edit">
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
