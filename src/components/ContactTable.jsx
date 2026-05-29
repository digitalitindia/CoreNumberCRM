import { useState } from 'react';
import { Edit2, Trash2, Copy, MessageCircle, Loader2, MoreVertical, ArrowUpDown, PhoneCall, Calendar, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { isToday, isThisWeek, isThisMonth, isThisYear, parseISO, format } from 'date-fns';

export default function ContactTable({ contacts, loading, filters, onEdit, onDelete, page = 0, itemsPerPage = 50 }) {
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

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
      {/* Mobile View */}
      <div className="md:hidden divide-y divide-slate-200">
        {sortedContacts.map((contact, index) => {
          const displayName = contact.person_name || contact.business_name || 'Unknown Contact';
          const serialNo = page * itemsPerPage + index + 1;
          return (
            <div key={contact.id} className="animate-fade-in-up p-3 active:bg-slate-100 transition-colors border-b border-slate-200/50 last:border-0 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-1">
                  #{serialNo}
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex flex-col items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-slate-900">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 text-[15px] truncate max-w-[150px]">
                      {displayName}
                    </h3>
                    <span className="text-[13px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">+91 {contact.mobile_number}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2 text-[12px] text-slate-500">
                      {contact.business_name && contact.person_name && (
                        <span className="truncate max-w-[150px] font-medium">{contact.business_name}</span>
                      )}
                      {contact.category && (
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded">
                          {contact.category}
                        </span>
                      )}
                    </div>
                  </div>
                  {contact.notes && (
                    <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic line-clamp-2">
                      <FileText className="w-3 h-3 inline mr-1 text-slate-400" />
                      {contact.notes}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {contact.created_at ? format(parseISO(contact.created_at), 'dd MMM yyyy') : 'Unknown Date'}
                    </span>
                    <div className="flex gap-1.5">
                        <button onClick={() => handleCopy(contact.mobile_number)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleWhatsApp(contact.mobile_number)} className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                </div>
                <button className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full shrink-0 transition-colors" onClick={() => onEdit(contact)}>
                  <MoreVertical className="w-4 h-4" />
                </button>
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
              const displayName = contact.person_name || contact.business_name || 'Unknown Contact';
              const serialNo = page * itemsPerPage + index + 1;
              return (
                <tr key={contact.id} className="animate-fade-in-up hover:bg-slate-50 transition-colors group cursor-default" style={{ animationDelay: `${index * 50}ms` }}>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {serialNo}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(displayName)} shadow-sm`}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 text-sm leading-tight">{displayName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {contact.business_name && contact.person_name && (
                            <span className="text-[11px] text-slate-500 leading-tight">{contact.business_name}</span>
                          )}
                          {contact.category && (
                            <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 bg-purple-500/20 text-indigo-600 rounded">
                              {contact.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="tracking-wide text-[13px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold">+91 {contact.mobile_number}</span>
                      <div className="flex gap-1.5 ml-2">
                        <button onClick={() => handleCopy(contact.mobile_number)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Copy">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleWhatsApp(contact.mobile_number)} className="p-1.5 bg-green-50 hover:bg-green-100 rounded text-green-600 transition-colors" title="WhatsApp">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 truncate max-w-[150px]">
                    {[contact.town, contact.city, contact.state].filter(Boolean).join(', ')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-700 text-[13px]">{contact.created_at ? format(parseISO(contact.created_at), 'dd MMM yyyy') : 'N/A'}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{contact.created_at ? format(parseISO(contact.created_at), 'hh:mm a') : ''}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 max-w-[120px] truncate" title={contact.notes}>
                    {contact.notes || <span className="italic text-slate-300">--</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
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
