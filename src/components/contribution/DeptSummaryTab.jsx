import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx';

// Columns exactly as requested
const PUB_COLS = [
  "Indexed Int. Journal", "Indexed Nat. Journal", "Indexed Conference Proceedings",
  "Indexed Book Chapter", "Non-Indexed Int. Journal", "Non-Indexed Nat. Journal",
  "Non-Indexed Book Chapter", "Non-Indexed Conference Presentations", "Book"
];

const IPR_COLS = [
  "National Design", "National Published", "National Copyright", "National Utility",
  "International Design", "International Published", "International Copyright", "International Utility"
];

const PRES_COLS = [
  "Invited Resource Person", "Keynote Speaker", "Presenter", "Session Chair", "Panel Member"
];

const PART_COLS = [
  "FDP", "QIP", "Workshop", "Seminar", "Webinar",
  "Certification Programme", "MOOC", "Training Programme", "Refresher Course"
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function DeptSummaryTab({ publications, presentations, iprOutcomes, participations, achievements, projects = [], consultancies = [], incentives = [], monthOrder = [] }) {
  // KPI Data
  const kpis = [
    { label: 'Total Publications', count: publications.length, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Total IPR Outcomes', count: iprOutcomes.length, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Total Presentations', count: presentations.length, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Total Participations', count: participations.length, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'Total Achievements', count: achievements.length, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { label: 'Total Projects', count: projects.length, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Total Consultancies', count: consultancies.length, color: 'text-teal-600', bg: 'bg-teal-100' },
    { label: 'Total Incentives', count: incentives.length, color: 'text-rose-600', bg: 'bg-rose-100' }
  ];

  // Table Data Calculation
  const tableData = monthOrder.map(month => {
    const row = { month };
    
    PUB_COLS.forEach(col => {
      row[`pub_${col}`] = publications.filter(p => p.month === month && p.publicationType === col).length;
    });
    IPR_COLS.forEach(col => {
      row[`ipr_${col}`] = iprOutcomes.filter(i => i.month === month && i.iprType === col).length;
    });
    PRES_COLS.forEach(col => {
      row[`pres_${col}`] = presentations.filter(p => p.month === month && p.role === col).length;
    });
    PART_COLS.forEach(col => {
      row[`part_${col}`] = participations.filter(p => p.month === month && p.programmeType === col).length;
    });
    row.projects = projects.filter(p => p.month === month).length;
    row.consultancies = consultancies.filter(c => c.month === month).length;
    row.incentives = incentives.filter(i => i.month === month).length;

    return row;
  });

  // Calculate Totals Row
  const totalsRow = { month: 'TOTAL' };
  [...PUB_COLS.map(c=>`pub_${c}`), ...IPR_COLS.map(c=>`ipr_${c}`), ...PRES_COLS.map(c=>`pres_${c}`), ...PART_COLS.map(c=>`part_${c}`), 'projects', 'consultancies', 'incentives'].forEach(key => {
    totalsRow[key] = tableData.reduce((sum, row) => sum + (row[key] || 0), 0);
  });
  
  const allRows = [...tableData, totalsRow];

  // Chart 1: Stacked Bar Chart
  const chart1Data = monthOrder.map(month => ({
    month,
    Publications: publications.filter(p => p.month === month).length,
    IPR: iprOutcomes.filter(i => i.month === month).length,
    Presentations: presentations.filter(p => p.month === month).length,
    Participations: participations.filter(p => p.month === month).length,
    Projects: projects.filter(p => p.month === month).length,
    Consultancy: consultancies.filter(c => c.month === month).length,
    Incentives: incentives.filter(i => i.month === month).length,
  }));

  // Chart 2: Publication Type Breakdown
  const indexedCount = publications.filter(p => p.indexedBy && (p.indexedBy.includes('SCOPUS') || p.indexedBy.includes('WOS'))).length;
  const bookCount = publications.filter(p => ['Book', 'Indexed Book Chapter', 'Non-Indexed Book Chapter'].includes(p.publicationType)).length;
  const nonIndexedCount = publications.length - indexedCount - bookCount;
  const chart2Data = [
    { name: 'Indexed (SCOPUS/WOS)', value: indexedCount },
    { name: 'Non-Indexed', value: nonIndexedCount },
    { name: 'Book/Chapter', value: bookCount }
  ].filter(d => d.value > 0);

  // Chart 3: IPR Type Breakdown
  const chart3DataMap = {};
  iprOutcomes.forEach(i => {
    let group = i.iprType;
    if (group?.includes('Copyright')) group = 'Copyright';
    if (group?.includes('Published')) group = 'Published';
    if (group?.includes('Utility')) group = 'Utility';
    chart3DataMap[group] = (chart3DataMap[group] || 0) + 1;
  });
  const chart3Data = Object.keys(chart3DataMap).map(key => ({ name: key, value: chart3DataMap[key] }));

  // Export specific table
  const handleExportTable = () => {
    const wsData = [];
    // Header Row 1 (Groups)
    const header1 = ["Month"];
    PUB_COLS.forEach((_, i) => header1.push(i === 0 ? "PUBLICATIONS" : ""));
    IPR_COLS.forEach((_, i) => header1.push(i === 0 ? "IPR OUTCOMES" : ""));
    PRES_COLS.forEach((_, i) => header1.push(i === 0 ? "PRESENTATIONS" : ""));
    PART_COLS.forEach((_, i) => header1.push(i === 0 ? "PARTICIPATIONS" : ""));
    header1.push("PROJECTS", "CONSULTANCY", "INCENTIVES");
    wsData.push(header1);

    // Header Row 2 (Columns)
    const header2 = ["Month", ...PUB_COLS, ...IPR_COLS, ...PRES_COLS, ...PART_COLS, "Count", "Count", "Count"];
    wsData.push(header2);

    // Data Rows
    allRows.forEach(row => {
      const dataRow = [row.month];
      PUB_COLS.forEach(col => dataRow.push(row[`pub_${col}`] || 0));
      IPR_COLS.forEach(col => dataRow.push(row[`ipr_${col}`] || 0));
      PRES_COLS.forEach(col => dataRow.push(row[`pres_${col}`] || 0));
      PART_COLS.forEach(col => dataRow.push(row[`part_${col}`] || 0));
      dataRow.push(row.projects || 0);
      dataRow.push(row.consultancies || 0);
      dataRow.push(row.incentives || 0);
      wsData.push(dataRow);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dept Month-wise");
    XLSX.writeFile(wb, "Department-Summary-Table.xlsx");
  };

  const renderCell = (val) => val === 0 ? '—' : val;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-100 flex items-center">
            <div className={`p-2 sm:p-3 rounded-full mr-3 sm:mr-4 ${kpi.bg} ${kpi.color}`}>
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900">{kpi.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Section A: Month-wise Combined Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h3 className="text-lg font-bold text-gray-800">Month-wise Combined Summary</h3>
          <button
            onClick={handleExportTable}
            className="text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 flex items-center shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export This Table
          </button>
        </div>
        
        <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 shadow-sm text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 border border-gray-200 sticky left-0 z-30 bg-gray-100" rowSpan={2}>Month</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-blue-50 text-blue-800" colSpan={PUB_COLS.length}>Publications</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-green-50 text-green-800" colSpan={IPR_COLS.length}>IPR Outcomes</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-purple-50 text-purple-800" colSpan={PRES_COLS.length}>Presentations</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-orange-50 text-orange-800" colSpan={PART_COLS.length}>Participations</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-indigo-50 text-indigo-800">Projects</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-teal-50 text-teal-800">Consultancy</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-rose-50 text-rose-800">Incentives</th>
              </tr>
              <tr>
                {PUB_COLS.map(col => <th key={`th-pub-${col}`} className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-blue-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>{col}</th>)}
                {IPR_COLS.map(col => <th key={`th-ipr-${col}`} className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-green-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>{col}</th>)}
                {PRES_COLS.map(col => <th key={`th-pres-${col}`} className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-purple-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>{col}</th>)}
                {PART_COLS.map(col => <th key={`th-part-${col}`} className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-orange-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>{col}</th>)}
                <th className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-indigo-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>Count</th>
                <th className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-teal-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>Count</th>
                <th className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-rose-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>Count</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map((row, idx) => {
                const isTotal = row.month === 'TOTAL';
                return (
                  <tr key={row.month} className={`${isTotal ? 'bg-gray-200 font-bold text-gray-900 sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}>
                    <td className={`px-4 py-2 border border-gray-200 whitespace-nowrap sticky left-0 z-10 ${isTotal ? 'bg-gray-200' : 'bg-inherit'}`}>{row.month}</td>
                    
                    {PUB_COLS.map(col => <td key={`td-pub-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(row[`pub_${col}`])}</td>)}
                    {IPR_COLS.map(col => <td key={`td-ipr-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(row[`ipr_${col}`])}</td>)}
                    {PRES_COLS.map(col => <td key={`td-pres-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(row[`pres_${col}`])}</td>)}
                    {PART_COLS.map(col => <td key={`td-part-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(row[`part_${col}`])}</td>)}
                    <td className="px-4 py-2 border border-gray-200 text-center bg-indigo-50/30">{renderCell(row.projects)}</td>
                    <td className="px-4 py-2 border border-gray-200 text-center bg-teal-50/30">{renderCell(row.consultancies)}</td>
                    <td className="px-4 py-2 border border-gray-200 text-center bg-rose-50/30">{renderCell(row.incentives)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section B: Department-level Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1 */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 col-span-1 lg:col-span-2">
          <h4 className="text-md font-bold text-gray-700 mb-4 text-center">Month-wise Contribution Distribution</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart1Data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{fontSize: 12}} />
                <YAxis />
                <RechartsTooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                <Legend />
                <Bar dataKey="Publications" stackId="a" fill="#3B82F6" />
                <Bar dataKey="IPR" stackId="a" fill="#10B981" />
                <Bar dataKey="Presentations" stackId="a" fill="#8B5CF6" />
                <Bar dataKey="Participations" stackId="a" fill="#F59E0B" />
                <Bar dataKey="Projects" stackId="a" fill="#4F46E5" />
                <Bar dataKey="Consultancy" stackId="a" fill="#14B8A6" />
                <Bar dataKey="Incentives" stackId="a" fill="#E11D48" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col items-center">
          <h4 className="text-md font-bold text-gray-700 mb-2">Publication Type Breakdown</h4>
          {chart2Data.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chart2Data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {chart2Data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-gray-400 mt-10">No publication data</p>}
        </div>

        {/* Chart 3 */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col items-center">
          <h4 className="text-md font-bold text-gray-700 mb-2">IPR Type Breakdown</h4>
          {chart3Data.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chart3Data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {chart3Data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-gray-400 mt-10">No IPR data</p>}
        </div>

      </div>
    </div>
  );
}
