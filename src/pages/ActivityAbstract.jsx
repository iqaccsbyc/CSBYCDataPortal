import React, { useState } from 'react';
import { ArrowPathIcon, ArrowDownTrayIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { ACADEMIC_YEARS, getCurrentAcademicYear } from '../utils/academicYear';
import { useActivitiesData } from '../hooks/useActivitiesData';
import SummaryTab from '../components/abstract/SummaryTab';
import MonthwiseTable from '../components/abstract/MonthwiseTable';
import FacultyTab from '../components/abstract/FacultyTab';
import SDGTab from '../components/abstract/SDGTab';
import StrategicPlanTab from '../components/abstract/StrategicPlanTab';
import AuditTab from '../components/abstract/AuditTab';
import SearchAndDetailsTab from '../components/abstract/SearchAndDetailsTab';
import { SDGS, FOCUS_AREAS, PRIORITY_AREAS, NAAC_CRITERIA, AUDIT_METRICS } from '../hooks/useActivitiesData';

const TABS = [
  'Summary', 'Month-wise Table', 'Faculty-wise', 
  'SDG Mapping', 'Strategic Plan', 'NAAC / AQAR Audit',
  'Search & Details'
];

export default function ActivityAbstract() {
  const [selectedAY, setSelectedAY] = useState(getCurrentAcademicYear());
  const [activeTab, setActiveTab] = useState('Summary');
  const [searchFilters, setSearchFilters] = useState({});

  const {
    activities,
    facultyList,
    summary,
    monthMatrix,
    facultyCounts,
    dataEntrySummary,
    sdgCounts,
    sdgEvents,
    focusAreaCounts,
    focusAreaEvents,
    priorityAreaCounts,
    naacCounts,
    auditCounts,
    MONTHS,
    EVENT_TYPES,
    isLoading,
    error,
    refresh
  } = useActivitiesData(selectedAY);

  const handleMetricClick = (filters) => {
    setSearchFilters(filters);
    setActiveTab('Search & Details');
  };

  const handleExportFullExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Month-wise Summary
    if (monthMatrix) {
      const totals = { month: 'TOTAL', TotalEvents: monthMatrix.reduce((s, r) => s + r.TotalEvents, 0), Physical: monthMatrix.reduce((s, r) => s + r.Physical, 0), Online: monthMatrix.reduce((s, r) => s + r.Online, 0) };
      EVENT_TYPES.forEach(t => totals[t] = monthMatrix.reduce((s, r) => s + r[t], 0));
      const wsData1 = [
        ['Month', 'Total Events', 'Physical', 'Online', ...EVENT_TYPES],
        ...monthMatrix.map(row => [row.month, row.TotalEvents, row.Physical, row.Online, ...EVENT_TYPES.map(t => row[t])]),
        [totals.month, totals.TotalEvents, totals.Physical, totals.Online, ...EVENT_TYPES.map(t => totals[t])]
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData1), 'Month-wise Summary');
    }

    // 2. Faculty-wise
    if (facultyCounts) {
      const wsData2 = [
        ['Rank', 'Faculty Name', 'Events Organized'],
        ...facultyCounts.map(f => [f.rank, f.name, f.count])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData2), 'Faculty-wise');
    }

    // 3. SDG Mapping
    if (sdgCounts) {
      const wsData3 = [
        ['SDG Code', 'Description', 'No. of Events', '% of Total'],
        ...sdgCounts.map(s => [s.code, s.desc, s.count, s.percentage + '%']),
        ['TOTAL', 'Total SDG-linked events', sdgEvents, '']
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData3), 'SDG Mapping');
    }

    // 4. Focus Areas
    if (focusAreaCounts) {
      const wsData4 = [
        ['Focus Area', 'Description', 'No. of Events', '% of Total'],
        ...focusAreaCounts.map(f => [f.code, f.desc, f.count, f.percentage + '%']),
        ['TOTAL', 'Total Focus Area-linked events', focusAreaEvents, '']
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData4), 'Focus Areas');
    }

    // 5. Priority Areas
    if (priorityAreaCounts) {
      const wsData5 = [
        ['Priority Area', 'Description', 'No. of Events', '% of Total'],
        ...priorityAreaCounts.map(p => [p.code, p.desc, p.count, p.percentage + '%'])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData5), 'Priority Areas');
    }

    // 6. NAAC Criteria
    if (naacCounts) {
      const wsData6 = [
        ['Criteria', 'Description', 'No. of Events'],
        ...naacCounts.map(n => [n.code, n.desc, n.count])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData6), 'NAAC Criteria');
    }

    // 7. Audit Metrics
    if (auditCounts) {
      const wsData7 = [
        ['Description', 'Metric Code', 'Min Required', 'Actual Count', 'Status'],
        ...auditCounts.map(a => [a.desc, a.code, a.min, a.count, a.status])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData7), 'Audit Metrics');
    }

    XLSX.writeFile(wb, `CS-BYC-Activity-Abstract-${selectedAY}.xlsx`);
  };

  return (
    <div className="flex flex-col">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PresentationChartLineIcon className="w-7 h-7 text-indigo-600" />
            Activity Abstract
            <select
              value={selectedAY}
              onChange={(e) => setSelectedAY(e.target.value)}
              className="ml-2 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-1 font-semibold"
            >
              {ACADEMIC_YEARS.map(ay => <option key={ay} value={ay}>{ay}</option>)}
            </select>
          </h1>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={refresh}
              disabled={isLoading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={handleExportFullExcel}
              disabled={isLoading || !activities?.length}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export to Excel
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto hide-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {isLoading && !summary ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <ArrowPathIcon className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-gray-500 font-medium">Crunching data for AY {selectedAY}...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-bold">Failed to load data</p>
            <p className="text-red-500 text-sm mt-1">{error.message}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
            <PresentationChartLineIcon className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No activities found for AY {selectedAY}</h3>
            <p className="text-gray-500 max-w-md text-sm">
              Start by adding entries in the Activity Entry portal. Once data is added, your comprehensive dashboard will appear here.
            </p>
          </div>
        ) : (
          <div className="pb-20">
            {activeTab === 'Summary' && <SummaryTab summary={summary} onMetricClick={handleMetricClick} />}
            {activeTab === 'Month-wise Table' && <MonthwiseTable monthMatrix={monthMatrix} EVENT_TYPES={EVENT_TYPES} MONTHS={MONTHS} selectedAY={selectedAY} />}
            {activeTab === 'Faculty-wise' && <FacultyTab facultyCounts={facultyCounts} dataEntrySummary={dataEntrySummary} />}
            {activeTab === 'SDG Mapping' && <SDGTab sdgCounts={sdgCounts} sdgEvents={sdgEvents} onMetricClick={handleMetricClick} />}
            {activeTab === 'Strategic Plan' && <StrategicPlanTab focusAreaCounts={focusAreaCounts} focusAreaEvents={focusAreaEvents} priorityAreaCounts={priorityAreaCounts} naacCounts={naacCounts} onMetricClick={handleMetricClick} />}
            {activeTab === 'NAAC / AQAR Audit' && <AuditTab auditCounts={auditCounts} onMetricClick={handleMetricClick} selectedAY={selectedAY} />}
            {activeTab === 'Search & Details' && (
              <SearchAndDetailsTab 
                activities={activities}
                initialFilters={searchFilters}
                EVENT_TYPES={EVENT_TYPES}
                SDGS={SDGS}
                FOCUS_AREAS={FOCUS_AREAS}
                PRIORITY_AREAS={PRIORITY_AREAS}
                NAAC_CRITERIA={NAAC_CRITERIA}
                AUDIT_METRICS={AUDIT_METRICS}
              />
            )}
          </div>
        )}
        
      </main>
    </div>
  );
}

