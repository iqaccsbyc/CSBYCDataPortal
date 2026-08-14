import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SDGs = [
  { id: 'SDG-1', desc: 'No Poverty' },
  { id: 'SDG-2', desc: 'Zero Hunger' },
  { id: 'SDG-3', desc: 'Good Health and Well-being' },
  { id: 'SDG-4', desc: 'Quality Education' },
  { id: 'SDG-5', desc: 'Gender Equality' },
  { id: 'SDG-6', desc: 'Clean Water and Sanitation' },
  { id: 'SDG-7', desc: 'Affordable and Clean Energy' },
  { id: 'SDG-8', desc: 'Decent Work and Economic Growth' },
  { id: 'SDG-9', desc: 'Industry, Innovation and Infrastructure' },
  { id: 'SDG-10', desc: 'Reduced Inequalities' },
  { id: 'SDG-11', desc: 'Sustainable Cities and Communities' },
  { id: 'SDG-12', desc: 'Responsible Consumption and Production' },
  { id: 'SDG-13', desc: 'Climate Action' },
  { id: 'SDG-14', desc: 'Life Below Water' },
  { id: 'SDG-15', desc: 'Life on Land' },
  { id: 'SDG-16', desc: 'Peace, Justice and Strong Institutions' },
  { id: 'SDG-17', desc: 'Partnerships for the Goals' }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function SDGResearchTab({ publications, iprOutcomes, presentations }) {

  // --- SECTION A: SDG Mapping ---
  const sdgData = useMemo(() => {
    let totalPubsLinked = 0;
    let totalIPRsLinked = 0;

    publications.forEach(p => {
      if (p.sdgLinks && p.sdgLinks.length > 0) totalPubsLinked++;
    });
    iprOutcomes.forEach(i => {
      if (i.sdgLinks && i.sdgLinks.length > 0) totalIPRsLinked++;
    });

    const rows = SDGs.map(sdg => {
      const pubC = publications.filter(p => p.sdgLinks?.includes(sdg.id)).length;
      const iprC = iprOutcomes.filter(i => i.sdgLinks?.includes(sdg.id)).length;
      return {
        sdg: sdg.id,
        desc: sdg.desc,
        pubs: pubC,
        iprs: iprC,
        total: pubC + iprC
      };
    });

    return {
      rows,
      totalPubsLinked,
      totalIPRsLinked,
      grandTotal: totalPubsLinked + totalIPRsLinked
    };
  }, [publications, iprOutcomes]);

  const sdgChartData = [...sdgData.rows].sort((a, b) => b.total - a.total).filter(r => r.total > 0);

  // --- SECTION B: Quality Metrics ---
  const scopusCount = publications.filter(p => p.indexedBy?.includes('SCOPUS')).length;
  const wosCount = publications.filter(p => p.indexedBy?.includes('WOS')).length;
  const ugcCount = publications.filter(p => p.ugcCareListed === 'Yes' || p.ugcCareListed === true).length;
  const awardCount = publications.filter(p => p.anyAward === 'Yes' || p.anyAward === true).length;

  const indexedCount = publications.filter(p => p.indexedBy && (p.indexedBy.includes('SCOPUS') || p.indexedBy.includes('WOS'))).length;
  const nonIndexedCount = publications.length - indexedCount;
  const pieDataQuality = [
    { name: 'Indexed', value: indexedCount },
    { name: 'Non-Indexed', value: nonIndexedCount }
  ].filter(d => d.value > 0);

  // --- SECTION C: Level-wise Distribution ---
  const pubLevels = {
    International: publications.filter(p => p.levelOfPublisher === 'International').length,
    National: publications.filter(p => p.levelOfPublisher === 'National').length,
  };
  const pieDataPubLevels = Object.entries(pubLevels).map(([k, v]) => ({ name: k, value: v })).filter(d => d.value > 0);

  const presLevels = {
    International: presentations.filter(p => p.level === 'International').length,
    National: presentations.filter(p => p.level === 'National').length,
    State: presentations.filter(p => p.level === 'State').length,
  };
  const pieDataPresLevels = Object.entries(presLevels).map(([k, v]) => ({ name: k, value: v })).filter(d => d.value > 0);


  return (
    <div className="space-y-10 animate-fade-in">
      
      {/* SECTION B: Quality Metrics (Put at top for impact) */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Research Quality Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-blue-500">
            <p className="text-sm text-gray-500 font-medium">SCOPUS Indexed</p>
            <p className="text-3xl font-bold text-gray-900">{scopusCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-indigo-500">
            <p className="text-sm text-gray-500 font-medium">WOS Indexed</p>
            <p className="text-3xl font-bold text-gray-900">{wosCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-green-500">
            <p className="text-sm text-gray-500 font-medium">UGC CARE Listed</p>
            <p className="text-3xl font-bold text-gray-900">{ugcCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-t-4 border-yellow-500">
            <p className="text-sm text-gray-500 font-medium">Award Winning</p>
            <p className="text-3xl font-bold text-gray-900">{awardCount}</p>
          </div>
        </div>
      </div>

      {/* SECTION A: SDG Mapping */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">SDG Mapping for Research Outputs</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto" style={{ maxHeight: '500px' }}>
              <table className="min-w-full text-sm text-left border-collapse">
                <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 border-b">SDG</th>
                    <th className="px-4 py-3 border-b">Description</th>
                    <th className="px-4 py-3 border-b text-center">Pubs Linked</th>
                    <th className="px-4 py-3 border-b text-center">IPR Linked</th>
                    <th className="px-4 py-3 border-b text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sdgData.rows.map((row, idx) => (
                    <tr key={row.sdg} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                      <td className="px-4 py-2 border-b font-medium whitespace-nowrap text-blue-700">{row.sdg}</td>
                      <td className="px-4 py-2 border-b">{row.desc}</td>
                      <td className="px-4 py-2 border-b text-center">{row.pubs === 0 ? '—' : row.pubs}</td>
                      <td className="px-4 py-2 border-b text-center">{row.iprs === 0 ? '—' : row.iprs}</td>
                      <td className="px-4 py-2 border-b text-center font-bold bg-blue-50/30">{row.total === 0 ? '—' : row.total}</td>
                    </tr>
                  ))}
                  <tr className="bg-indigo-50 font-bold text-indigo-900 sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                    <td className="px-4 py-3 border-t" colSpan={2}>Total Unique SDG-linked Outcomes</td>
                    <td className="px-4 py-3 border-t text-center">{sdgData.totalPubsLinked}</td>
                    <td className="px-4 py-3 border-t text-center">{sdgData.totalIPRsLinked}</td>
                    <td className="px-4 py-3 border-t text-center text-lg">{sdgData.grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <h4 className="text-md font-bold text-gray-700 mb-4 text-center">Top SDGs by Research Impact</h4>
            {sdgChartData.length > 0 ? (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sdgChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="sdg" type="category" width={60} tick={{fontSize: 12}} />
                    <Tooltip cursor={{fill: '#F3F4F6'}} />
                    <Bar dataKey="total" fill="#0EA5E9" name="Total Outcomes" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-400">No SDG mappings found</div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION C: Level-wise Distribution */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Level-wise Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col items-center">
            <h4 className="text-md font-bold text-gray-700 mb-2">Publications (Indexed)</h4>
            {pieDataQuality.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieDataQuality} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name}) => name}>
                      <Cell fill="#3B82F6" />
                      <Cell fill="#9CA3AF" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-gray-400 mt-10">No data</p>}
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col items-center">
            <h4 className="text-md font-bold text-gray-700 mb-2">Publications Level</h4>
            {pieDataPubLevels.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieDataPubLevels} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name}) => name}>
                      {pieDataPubLevels.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-gray-400 mt-10">No data</p>}
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col items-center">
            <h4 className="text-md font-bold text-gray-700 mb-2">Presentations Level</h4>
            {pieDataPresLevels.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieDataPresLevels} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name}) => name}>
                      {pieDataPresLevels.map((e, i) => <Cell key={i} fill={COLORS[(i+2) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-gray-400 mt-10">No data</p>}
          </div>

        </div>
      </div>

    </div>
  );
}
