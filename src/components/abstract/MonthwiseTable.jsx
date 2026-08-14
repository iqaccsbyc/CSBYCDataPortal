import React from 'react';
import * as XLSX from 'xlsx';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function MonthwiseTable({ monthMatrix, EVENT_TYPES, MONTHS, selectedAY }) {
  if (!monthMatrix) return null;

  // Calculate totals for each column
  const totals = {
    month: 'TOTAL',
    TotalEvents: monthMatrix.reduce((sum, row) => sum + row.TotalEvents, 0),
    Physical: monthMatrix.reduce((sum, row) => sum + row.Physical, 0),
    Online: monthMatrix.reduce((sum, row) => sum + row.Online, 0),
  };
  EVENT_TYPES.forEach(t => {
    totals[t] = monthMatrix.reduce((sum, row) => sum + row[t], 0);
  });

  const columns = ['TotalEvents', 'Physical', 'Online', ...EVENT_TYPES];

  const exportTable = () => {
    const wsData = [
      ['Month', 'Total Events', 'Physical', 'Online', ...EVENT_TYPES],
      ...monthMatrix.map(row => [
        row.month,
        row.TotalEvents,
        row.Physical,
        row.Online,
        ...EVENT_TYPES.map(t => row[t])
      ]),
      [
        totals.month,
        totals.TotalEvents,
        totals.Physical,
        totals.Online,
        ...EVENT_TYPES.map(t => totals[t])
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Month-wise Summary');
    XLSX.writeFile(wb, `CS-BYC-Month-wise-Summary-${selectedAY || 'All'}.xlsx`);
  };

  const renderCell = (val) => {
    if (val === 0) return <span className="text-gray-300">—</span>;
    return <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{val}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-20">
              <tr>
                <th className="px-4 py-4 sticky left-0 z-30 bg-gray-100 border-b border-r border-gray-200">Month</th>
                <th className="px-4 py-4 border-b border-gray-200 font-bold text-blue-800 bg-blue-50/50 min-w-[120px]">Total Events</th>
                <th className="px-4 py-4 border-b border-gray-200 font-bold bg-gray-50 min-w-[100px]">Physical</th>
                <th className="px-4 py-4 border-b border-gray-200 font-bold bg-gray-50 min-w-[100px]">Online</th>
                {EVENT_TYPES.map(t => (
                  <th key={t} className="px-4 py-4 border-b border-gray-200 bg-gray-50 max-w-[150px] whitespace-normal align-bottom">
                    <div className="-rotate-12 transform origin-bottom-left truncate" title={t}>
                      {t}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthMatrix.map((row, idx) => (
                <tr key={row.month} className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="px-4 py-3 sticky left-0 z-10 bg-inherit border-r border-gray-100 font-semibold text-gray-800">
                    {row.month}
                  </td>
                  <td className="px-4 py-3 bg-blue-50/20 text-center font-bold text-blue-900">
                    {row.TotalEvents === 0 ? <span className="text-gray-300">—</span> : row.TotalEvents}
                  </td>
                  <td className="px-4 py-3 text-center">{renderCell(row.Physical)}</td>
                  <td className="px-4 py-3 text-center">{renderCell(row.Online)}</td>
                  {EVENT_TYPES.map(t => (
                    <td key={t} className="px-4 py-3 text-center">{renderCell(row[t])}</td>
                  ))}
                </tr>
              ))}
              {/* TOTAL ROW */}
              <tr className="bg-gray-800 text-white font-bold sticky bottom-0 z-20">
                <td className="px-4 py-4 sticky left-0 z-30 bg-gray-900 border-r border-gray-700">
                  {totals.month}
                </td>
                <td className="px-4 py-4 text-center bg-gray-800 text-blue-300">
                  {totals.TotalEvents}
                </td>
                <td className="px-4 py-4 text-center">{totals.Physical}</td>
                <td className="px-4 py-4 text-center">{totals.Online}</td>
                {EVENT_TYPES.map(t => (
                  <td key={t} className="px-4 py-4 text-center">
                    {totals[t] === 0 ? <span className="text-gray-500">—</span> : totals[t]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={exportTable}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          Export This Table to Excel
        </button>
      </div>
    </div>
  );
}
