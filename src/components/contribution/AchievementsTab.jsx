import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AchievementsTab({ achievements, monthOrder = [] }) {
  const [filterLevel, setFilterLevel] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // --- SECTION A: KPIs ---
  const intl = achievements.filter(a => a.level === 'International').length;
  const natl = achievements.filter(a => a.level === 'National').length;
  const state = achievements.filter(a => a.level === 'State').length;
  const inst = achievements.filter(a => a.level === 'Institution').length;

  // --- SECTION B: Month-wise Table ---
  const monthData = useMemo(() => {
    const rows = monthOrder.map(month => {
      const monthAchs = achievements.filter(a => a.month === month);
      const row = { month };
      row.International = monthAchs.filter(a => a.level === 'International').length;
      row.National = monthAchs.filter(a => a.level === 'National').length;
      row.State = monthAchs.filter(a => a.level === 'State').length;
      row.Institution = monthAchs.filter(a => a.level === 'Institution').length;
      row.total = row.International + row.National + row.State + row.Institution;
      return row;
    });

    const totalsRow = { month: 'TOTAL' };
    ['International', 'National', 'State', 'Institution', 'total'].forEach(col => {
      totalsRow[col] = rows.reduce((acc, r) => acc + r[col], 0);
    });

    return { rows, totalsRow };
  }, [achievements]);

  // --- SECTION C: Achievement Type Breakdown ---
  const chartData = useMemo(() => {
    const typeMap = {};
    achievements.forEach(a => {
      const type = a.achievementType || 'Other';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    return Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [achievements]);

  // --- SECTION D: Faculty Achievement Table ---
  const tableData = useMemo(() => {
    let filtered = [...achievements];
    if (filterLevel) filtered = filtered.filter(a => a.level === filterLevel);
    if (filterType) filtered = filtered.filter(a => a.achievementType === filterType);
    if (filterMonth) filtered = filtered.filter(a => a.month === filterMonth);

    // Sort by month (using MONTH_ORDER), then faculty name
    filtered.sort((a, b) => {
      const monthDiff = monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      if (monthDiff !== 0) return monthDiff;
      return (a.submittedByName || '').localeCompare(b.submittedByName || '');
    });

    return filtered;
  }, [achievements, filterLevel, filterType, filterMonth]);

  const uniqueLevels = [...new Set(achievements.map(a => a.level).filter(Boolean))];
  const uniqueTypes = [...new Set(achievements.map(a => a.achievementType).filter(Boolean))];
  const uniqueMonths = monthOrder.filter(m => achievements.some(a => a.month === m));

  const renderCell = (val) => val === 0 ? '—' : val;

  return (
    <div className="space-y-10 animate-fade-in">
      
      {/* SECTION A: KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-indigo-600">
          <p className="text-sm text-gray-500 font-medium">Total Achievements</p>
          <p className="text-3xl font-bold text-gray-900">{achievements.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-red-500">
          <p className="text-sm text-gray-500 font-medium">International</p>
          <p className="text-3xl font-bold text-gray-900">{intl}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-yellow-500">
          <p className="text-sm text-gray-500 font-medium">National</p>
          <p className="text-3xl font-bold text-gray-900">{natl}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-green-500">
          <p className="text-sm text-gray-500 font-medium">State</p>
          <p className="text-3xl font-bold text-gray-900">{state}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-blue-500">
          <p className="text-sm text-gray-500 font-medium">Institution</p>
          <p className="text-3xl font-bold text-gray-900">{inst}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION B: Month-wise Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-4 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h3 className="text-lg font-bold text-gray-800">Month-wise Summary</h3>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: '400px' }}>
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 shadow-sm text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 border-b">Month</th>
                  <th className="px-4 py-3 border-b text-center text-red-700 bg-red-50">Intl</th>
                  <th className="px-4 py-3 border-b text-center text-yellow-700 bg-yellow-50">Natl</th>
                  <th className="px-4 py-3 border-b text-center text-green-700 bg-green-50">State</th>
                  <th className="px-4 py-3 border-b text-center text-blue-700 bg-blue-50">Inst</th>
                  <th className="px-4 py-3 border-b text-center text-indigo-900 bg-indigo-100">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {monthData.rows.map((row, idx) => (
                  <tr key={row.month} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                    <td className="px-4 py-2 border-b font-medium">{row.month}</td>
                    <td className="px-4 py-2 border-b text-center">{renderCell(row.International)}</td>
                    <td className="px-4 py-2 border-b text-center">{renderCell(row.National)}</td>
                    <td className="px-4 py-2 border-b text-center">{renderCell(row.State)}</td>
                    <td className="px-4 py-2 border-b text-center">{renderCell(row.Institution)}</td>
                    <td className="px-4 py-2 border-b text-center font-bold">{renderCell(row.total)}</td>
                  </tr>
                ))}
                {/* TOTAL ROW */}
                <tr className="bg-gray-200 font-bold text-gray-900 sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                  <td className="px-4 py-3 border-t">TOTAL</td>
                  <td className="px-4 py-3 border-t text-center text-red-800">{renderCell(monthData.totalsRow.International)}</td>
                  <td className="px-4 py-3 border-t text-center text-yellow-800">{renderCell(monthData.totalsRow.National)}</td>
                  <td className="px-4 py-3 border-t text-center text-green-800">{renderCell(monthData.totalsRow.State)}</td>
                  <td className="px-4 py-3 border-t text-center text-blue-800">{renderCell(monthData.totalsRow.Institution)}</td>
                  <td className="px-4 py-3 border-t text-center text-indigo-900 text-lg">{renderCell(monthData.totalsRow.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION C: Achievement Type Breakdown */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h4 className="text-md font-bold text-gray-700 mb-4 text-center">Achievement Type Breakdown</h4>
          {chartData.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="type" type="category" width={120} tick={{fontSize: 11}} />
                  <Tooltip cursor={{fill: '#F3F4F6'}} />
                  <Bar dataKey="count" fill="#8B5CF6" name="Count" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-400">No achievements found</div>
          )}
        </div>
      </div>

      {/* SECTION D: Faculty Achievement Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-bold text-gray-800 flex-shrink-0">Faculty Achievements Log</h3>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select 
              value={filterMonth} 
              onChange={e => setFilterMonth(e.target.value)}
              className="text-sm rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 py-1 pl-2 pr-8"
            >
              <option value="">All Months</option>
              {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select 
              value={filterLevel} 
              onChange={e => setFilterLevel(e.target.value)}
              className="text-sm rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 py-1 pl-2 pr-8"
            >
              <option value="">All Levels</option>
              {uniqueLevels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="text-sm rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 py-1 pl-2 pr-8"
            >
              <option value="">All Types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(filterMonth || filterLevel || filterType) && (
              <button 
                onClick={() => { setFilterMonth(''); setFilterLevel(''); setFilterType(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 underline px-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 border-b">Month</th>
                <th className="px-4 py-3 border-b">Faculty Name</th>
                <th className="px-4 py-3 border-b">Achievement Type</th>
                <th className="px-4 py-3 border-b">Event/Details</th>
                <th className="px-4 py-3 border-b">Honour</th>
                <th className="px-4 py-3 border-b">Level</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No achievements match your filters.</td>
                </tr>
              ) : (
                tableData.map((a, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap">{a.month}</td>
                    <td className="px-4 py-2 font-medium">{a.submittedByName}</td>
                    <td className="px-4 py-2">{a.achievementType}</td>
                    <td className="px-4 py-2 text-xs w-1/3">{a.eventName || a.description || '—'}</td>
                    <td className="px-4 py-2 text-xs text-indigo-700 font-medium">{a.honourReceived || '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        a.level === 'International' ? 'bg-red-100 text-red-800' :
                        a.level === 'National' ? 'bg-yellow-100 text-yellow-800' :
                        a.level === 'State' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {a.level}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
