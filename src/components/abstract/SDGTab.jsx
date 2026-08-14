import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

const SDG_COLORS = {
  'SDG-1': '#E5243B',
  'SDG-2': '#DDA63A',
  'SDG-3': '#4C9F38',
  'SDG-4': '#C5192D',
  'SDG-5': '#FF3A21',
  'SDG-6': '#26BDE2',
  'SDG-7': '#FCC30B',
  'SDG-8': '#A21942',
  'SDG-9': '#FD6925',
  'SDG-10': '#DD1367',
  'SDG-11': '#FD9D24',
  'SDG-12': '#BF8B2E',
  'SDG-13': '#3F7E44',
  'SDG-14': '#0A97D9',
  'SDG-15': '#56C02B',
  'SDG-16': '#00689D',
  'SDG-17': '#19486A',
};

export default function SDGTab({ sdgCounts, sdgEvents, onMetricClick }) {
  if (!sdgCounts) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* SECTION A: SDG Summary Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">SDG Mapping Summary</h3>
            <p className="text-sm text-gray-500 mt-1">Activities mapped to Sustainable Development Goals.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Total SDG-Linked Events</p>
            <p className="text-2xl font-bold text-blue-600">{sdgEvents}</p>
          </div>
        </div>

        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider w-32">SDG Code</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider w-40">No. of Events</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider w-40">% of Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sdgCounts.map((sdg) => (
                <tr 
                  key={sdg.code} 
                  className="hover:bg-indigo-50 transition-colors cursor-pointer"
                  onClick={() => onMetricClick({ sdg: sdg.code })}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: SDG_COLORS[sdg.code] || '#6b7280' }}
                    >
                      {sdg.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{sdg.desc}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900 font-bold">
                    {sdg.count === 0 ? <span className="text-gray-300">—</span> : sdg.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600 font-medium">
                    {sdg.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION B: SDG Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">SDG Distribution</h3>
        <div className="h-[600px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sdgCounts} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="code" type="category" width={80} tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 'bold', cursor: 'pointer' }} onClick={(data) => { if(data && data.value) onMetricClick({ sdg: data.value }) }} />
              <RechartsTooltip 
                cursor={{ fill: '#f3f4f6' }} 
                contentStyle={{ borderRadius: '8px' }} 
                formatter={(value, name, props) => [value, props.payload.desc]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#4b5563', fontSize: 12, fontWeight: 'bold' }} onClick={(data) => { if(data && data.code) onMetricClick({ sdg: data.code }) }} className="cursor-pointer">
                {sdgCounts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SDG_COLORS[entry.code] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
