import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function StrategicPlanTab({ focusAreaCounts, focusAreaEvents, priorityAreaCounts, naacCounts, onMetricClick }) {
  if (!focusAreaCounts || !priorityAreaCounts || !naacCounts) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* SUB-SECTION A: Focus Areas in Action */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Focus Areas in Action</h3>
            <p className="text-sm text-gray-500 mt-1">Activities aligned with strategic Focus Areas.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Total FA-Linked Events</p>
            <p className="text-2xl font-bold text-indigo-600">{focusAreaEvents}</p>
          </div>
        </div>

        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase w-32">Focus Area</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase">Full Description</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-600 uppercase w-32">Events</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-600 uppercase w-32">% of Total</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase w-48">Distribution</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {focusAreaCounts.map((fa) => (
                <tr 
                  key={fa.code} 
                  className="hover:bg-indigo-50 cursor-pointer transition-colors"
                  onClick={() => onMetricClick({ focusArea: fa.code })}
                >
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-indigo-700">{fa.code}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{fa.desc}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-gray-900">
                    {fa.count === 0 ? <span className="text-gray-300">—</span> : fa.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">{fa.percentage}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, Number(fa.percentage))}%` }}></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUB-SECTION B: Priority Areas in Action */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Priority Areas in Action</h3>
          <div className="overflow-hidden border border-gray-200 rounded-xl">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase w-24">Priority</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600 uppercase w-24">Events</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600 uppercase w-24">%</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {priorityAreaCounts.map((pa) => (
                  <tr 
                    key={pa.code} 
                    className="hover:bg-emerald-50 cursor-pointer transition-colors"
                    onClick={() => onMetricClick({ priorityArea: pa.code })}
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-emerald-700">{pa.code}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium text-xs">{pa.desc}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center font-bold text-gray-900">
                      {pa.count === 0 ? <span className="text-gray-300">—</span> : pa.count}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-gray-600">{pa.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h3 className="text-md font-bold text-gray-800 mb-6 text-center">Priority Areas Distribution</h3>
          <div className="flex-grow h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityAreaCounts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="code" type="category" width={80} tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 'bold', cursor: 'pointer' }} onClick={(data) => { if(data && data.value) onMetricClick({ priorityArea: data.value }) }} />
                <RechartsTooltip 
                  cursor={{ fill: '#f3f4f6' }} 
                  contentStyle={{ borderRadius: '8px' }}
                  formatter={(value, name, props) => [value, props.payload.desc]}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#4b5563', fontSize: 12 }} className="cursor-pointer" onClick={(data) => { if(data && data.code) onMetricClick({ priorityArea: data.code }) }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SUB-SECTION C: NAAC Criteria Distribution */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-4xl">
        <h3 className="text-xl font-bold text-gray-900 mb-6">NAAC Criteria Distribution</h3>
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase w-32">Criteria</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase">Description</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-600 uppercase w-32">Events</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {naacCounts.map((nc) => (
                <tr 
                  key={nc.code} 
                  className="hover:bg-purple-50 cursor-pointer transition-colors"
                  onClick={() => onMetricClick({ naac: nc.code })}
                >
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-purple-700">{nc.code}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{nc.desc}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-gray-900">
                    {nc.count === 0 ? <span className="text-gray-300">—</span> : nc.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
