import React, { useState, useEffect, useMemo } from 'react';
import ActivityDetailView from '../ActivityDetailView';
import StatusBadge from '../StatusBadge';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SearchAndDetailsTab({
  activities,
  initialFilters,
  EVENT_TYPES,
  SDGS,
  FOCUS_AREAS,
  PRIORITY_AREAS,
  NAAC_CRITERIA,
  AUDIT_METRICS
}) {
  const [filters, setFilters] = useState({
    eventType: '',
    sdg: '',
    focusArea: '',
    priorityArea: '',
    naac: '',
    aqar: '',
    status: '',
  });

  const [selectedActivity, setSelectedActivity] = useState(null);

  // Sync initial filters (from dashboard clicks) to local state
  useEffect(() => {
    if (initialFilters) {
      setFilters(prev => ({
        ...prev,
        ...initialFilters
      }));
    }
  }, [initialFilters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      eventType: '',
      sdg: '',
      focusArea: '',
      priorityArea: '',
      naac: '',
      aqar: '',
      status: '',
    });
  };

  // Filter activities based on selected criteria
  const filteredActivities = useMemo(() => {
    if (!activities) return [];

    return activities.filter(a => {
      if (filters.eventType && a.eventType !== filters.eventType) return false;
      if (filters.status && a.status !== filters.status) return false;
      if (filters.sdg && (!a.sdgLinks || !a.sdgLinks.includes(filters.sdg))) return false;
      if (filters.focusArea && (!a.focusAreas || !a.focusAreas.includes(filters.focusArea))) return false;
      if (filters.priorityArea && (!a.priorityAreas || !a.priorityAreas.includes(filters.priorityArea))) return false;
      if (filters.naac && (!a.naacCriteria || !a.naacCriteria.includes(filters.naac))) return false;
      
      // AQAR filtering requires checking multiple codes if applicable
      if (filters.aqar) {
        const metric = AUDIT_METRICS.find(m => m.code === filters.aqar);
        const searchCodes = metric?.searchCodes || [filters.aqar];
        if (!a.aqarCriteria || !searchCodes.some(code => a.aqarCriteria.includes(code))) {
          return false;
        }
      }

      return true;
    });
  }, [activities, filters, AUDIT_METRICS]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Filter Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Search & Filter Events</h3>
          <button 
            onClick={handleClearFilters}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Clear All Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Event Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Event Type</label>
            <select 
              name="eventType" 
              value={filters.eventType} 
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Types</option>
              {EVENT_TYPES?.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* SDG */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">SDG Mapping</label>
            <select 
              name="sdg" 
              value={filters.sdg} 
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All SDGs</option>
              {SDGS?.map(s => (
                <option key={s.code} value={s.code}>{s.code} - {s.desc}</option>
              ))}
            </select>
          </div>

          {/* Focus Area */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Strategic Focus Area</label>
            <select 
              name="focusArea" 
              value={filters.focusArea} 
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Focus Areas</option>
              {FOCUS_AREAS?.map(f => (
                <option key={f.code} value={f.code}>{f.code} - {f.desc.substring(0, 30)}...</option>
              ))}
            </select>
          </div>

          {/* Priority Area */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Strategic Priority Area</label>
            <select 
              name="priorityArea" 
              value={filters.priorityArea} 
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Priority Areas</option>
              {PRIORITY_AREAS?.map(p => (
                <option key={p.code} value={p.code}>{p.code} - {p.desc}</option>
              ))}
            </select>
          </div>

          {/* NAAC Criteria */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">NAAC Criteria</label>
            <select 
              name="naac" 
              value={filters.naac} 
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All NAAC Criteria</option>
              {NAAC_CRITERIA?.map(n => (
                <option key={n.code} value={n.code}>{n.code} - {n.desc}</option>
              ))}
            </select>
          </div>

          {/* AQAR Metric */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">AQAR Metric</label>
            <select 
              name="aqar" 
              value={filters.aqar} 
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All AQAR Metrics</option>
              {AUDIT_METRICS?.map(a => (
                <option key={a.id} value={a.code}>{a.code} - {a.desc.substring(0, 40)}...</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</label>
            <select 
              name="status" 
              value={filters.status} 
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending_faculty">Pending Faculty</option>
              <option value="pending_iqac">Pending IQAC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700">
            Search Results <span className="text-indigo-600 ml-2 bg-indigo-100 px-2 py-0.5 rounded-full">{filteredActivities.length}</span>
          </h3>
          <p className="text-xs text-gray-500">Click on an event to view details</p>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No events match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Event Name</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Type</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Mode</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredActivities.map(a => (
                  <tr 
                    key={a.id} 
                    onClick={() => setSelectedActivity(a)}
                    className="hover:bg-indigo-50 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-gray-900 max-w-sm truncate">{a.eventName}</td>
                    <td className="py-4 px-6 text-gray-600 whitespace-nowrap">{formatDate(a.startDate)}</td>
                    <td className="py-4 px-6 text-gray-600">{a.eventType}</td>
                    <td className="py-4 px-6 text-gray-600">{a.physicalOnline}</td>
                    <td className="py-4 px-6">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedActivity && (
        <ActivityDetailView 
          activity={selectedActivity} 
          onClose={() => setSelectedActivity(null)} 
        />
      )}
    </div>
  );
}
