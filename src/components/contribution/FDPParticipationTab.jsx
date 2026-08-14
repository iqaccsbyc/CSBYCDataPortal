import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PART_COLS = [
  "FDP", "QIP", "Workshop", "Seminar", "Webinar",
  "Certification Programme", "MOOC", "Training Programme", "Refresher Course"
];

export default function FDPParticipationTab({ participations, activeFaculty, monthOrder = [] }) {

  // --- SECTION A: KPIs ---
  const fdpCount = participations.filter(p => p.programmeType === 'FDP').length;
  const qipCount = participations.filter(p => p.programmeType === 'QIP').length;
  const certCount = participations.filter(p => p.programmeType === 'Certification Programme').length;
  const moocCount = participations.filter(p => p.programmeType === 'MOOC').length;

  // --- Month-wise Table ---
  const monthData = useMemo(() => {
    const rows = monthOrder.map(month => {
      const row = { month };
      let rowTotal = 0;
      PART_COLS.forEach(col => {
        const count = participations.filter(p => p.month === month && p.programmeType === col).length;
        row[col] = count;
        rowTotal += count;
      });
      row.total = rowTotal;
      return row;
    });

    const totalsRow = { month: 'TOTAL', total: 0 };
    PART_COLS.forEach(col => {
      const sum = rows.reduce((acc, r) => acc + r[col], 0);
      totalsRow[col] = sum;
      totalsRow.total += sum;
    });

    return { rows, totalsRow };
  }, [participations]);

  // --- SECTION B: Leaderboard ---
  const leaderboard = useMemo(() => {
    const cols = ["FDP", "QIP", "Workshop", "Webinar", "Certification Programme", "MOOC"];
    const rows = activeFaculty.map(fac => {
      const row = { facName: fac.facName };
      let total = 0;
      cols.forEach(col => {
        const count = participations.filter(p => p.submittedByName === fac.facName && p.programmeType === col).length;
        row[col] = count;
        total += count;
      });
      row.total = total;
      return row;
    });

    // Sort descending by total
    const sorted = rows.sort((a, b) => b.total - a.total);
    // Assign rank
    let currentRank = 1;
    let currentTotal = -1;
    sorted.forEach((r, idx) => {
      if (r.total !== currentTotal) {
        currentRank = idx + 1;
        currentTotal = r.total;
      }
      r.rank = currentRank;
    });

    return sorted;
  }, [participations, activeFaculty]);

  // --- SECTION C: Stacked Bar Chart ---
  const chartData = useMemo(() => {
    return monthOrder.map(month => {
      const monthParts = participations.filter(p => p.month === month);
      return {
        month,
        International: monthParts.filter(p => p.level === 'International').length,
        National: monthParts.filter(p => p.level === 'National').length,
        State: monthParts.filter(p => p.level === 'State').length,
        Institution: monthParts.filter(p => p.level === 'Institution').length,
      };
    });
  }, [participations]);

  const renderCell = (val) => val === 0 ? '—' : val;

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-yellow-50 border-l-4 border-yellow-400 font-medium';
    if (rank === 2) return 'bg-gray-100 border-l-4 border-gray-400 font-medium';
    if (rank === 3) return 'bg-orange-50 border-l-4 border-orange-500 font-medium';
    return 'bg-white';
  };

  return (
    <div className="space-y-10 animate-fade-in">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-blue-500">
          <p className="text-sm text-gray-500 font-medium">Total FDPs</p>
          <p className="text-3xl font-bold text-gray-900">{fdpCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-indigo-500">
          <p className="text-sm text-gray-500 font-medium">Total QIPs</p>
          <p className="text-3xl font-bold text-gray-900">{qipCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-green-500">
          <p className="text-sm text-gray-500 font-medium">Total Certifications</p>
          <p className="text-3xl font-bold text-gray-900">{certCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-purple-500">
          <p className="text-sm text-gray-500 font-medium">Total MOOCs</p>
          <p className="text-3xl font-bold text-gray-900">{moocCount}</p>
        </div>
      </div>

      {/* Month-wise Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h3 className="text-lg font-bold text-gray-800">Department Month-wise Participation</h3>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: '500px' }}>
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 shadow-sm text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 border border-gray-200 sticky left-0 z-30 bg-gray-100">Month</th>
                {PART_COLS.map(col => <th key={col} className="px-4 py-3 border border-gray-200 text-center">{col}</th>)}
                <th className="px-4 py-3 border border-gray-200 text-center bg-gray-200 text-gray-900">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {monthData.rows.map((row, idx) => (
                <tr key={row.month} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}>
                  <td className="px-4 py-2 border border-gray-200 sticky left-0 z-10 bg-inherit whitespace-nowrap">{row.month}</td>
                  {PART_COLS.map(col => <td key={col} className="px-4 py-2 border border-gray-200 text-center">{renderCell(row[col])}</td>)}
                  <td className="px-4 py-2 border border-gray-200 text-center font-bold bg-gray-100/50">{renderCell(row.total)}</td>
                </tr>
              ))}
              {/* TOTAL ROW */}
              <tr className="bg-gray-200 font-bold text-gray-900 sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                <td className="px-4 py-2 border border-gray-200 sticky left-0 z-10 bg-gray-200">TOTAL</td>
                {PART_COLS.map(col => <td key={`tot-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(monthData.totalsRow[col])}</td>)}
                <td className="px-4 py-2 border border-gray-200 text-center text-lg">{renderCell(monthData.totalsRow.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col h-[500px]">
          <div className="px-4 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" /></svg>
              Faculty Participation Leaderboard
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 p-0">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2 border-b">Rank</th>
                  <th className="px-4 py-2 border-b">Faculty Name</th>
                  <th className="px-2 py-2 border-b text-center">FDP</th>
                  <th className="px-2 py-2 border-b text-center">QIP</th>
                  <th className="px-2 py-2 border-b text-center">Work<br/>shop</th>
                  <th className="px-2 py-2 border-b text-center">Cert.</th>
                  <th className="px-2 py-2 border-b text-center">MOOC</th>
                  <th className="px-4 py-2 border-b text-center text-indigo-700">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map(row => (
                  <tr key={row.facName} className={`border-b hover:bg-indigo-50 ${getRankStyle(row.rank)}`}>
                    <td className="px-4 py-2 text-center">
                      {row.rank === 1 && <span className="text-yellow-500 font-bold text-lg">🥇</span>}
                      {row.rank === 2 && <span className="text-gray-400 font-bold text-lg">🥈</span>}
                      {row.rank === 3 && <span className="text-orange-500 font-bold text-lg">🥉</span>}
                      {row.rank > 3 && <span className="text-gray-500">{row.rank}</span>}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.facName}</td>
                    <td className="px-2 py-2 text-center">{renderCell(row.FDP)}</td>
                    <td className="px-2 py-2 text-center">{renderCell(row.QIP)}</td>
                    <td className="px-2 py-2 text-center">{renderCell(row.Workshop)}</td>
                    <td className="px-2 py-2 text-center">{renderCell(row["Certification Programme"])}</td>
                    <td className="px-2 py-2 text-center">{renderCell(row.MOOC)}</td>
                    <td className="px-4 py-2 text-center font-bold text-indigo-700 bg-indigo-50/30">{renderCell(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Level Distribution Chart */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 h-[500px] flex flex-col">
          <h4 className="text-md font-bold text-gray-700 mb-4 text-center">Participation Level Distribution</h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{fontSize: 12}} />
                <YAxis />
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                <Legend />
                <Bar dataKey="International" stackId="a" fill="#EF4444" />
                <Bar dataKey="National" stackId="a" fill="#F59E0B" />
                <Bar dataKey="State" stackId="a" fill="#10B981" />
                <Bar dataKey="Institution" stackId="a" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}
