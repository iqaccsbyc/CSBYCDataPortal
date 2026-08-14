import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AuditTab({ auditCounts, onMetricClick, selectedAY }) {

  if (!auditCounts) return null;

  const metCount = auditCounts.filter(m => m.status === 'Met').length;
  const partialCount = auditCounts.filter(m => m.status === 'Partial').length;
  const notMetCount = auditCounts.filter(m => m.status === 'Not Met').length;

  const pieData = [
    { name: 'Met', value: metCount, color: '#10b981' },
    { name: 'Partial', value: partialCount, color: '#f59e0b' },
    { name: 'Not Met', value: notMetCount, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 animate-fade-in">
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Academic Audit Metrics — AY {selectedAY}</h2>
        <p className="text-gray-500 mt-2">Based on AQAR criteria stored against each activity</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-6">Overall Compliance</h3>
          <div className="flex gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex-1 text-center">
              <p className="text-3xl font-bold text-green-600">{metCount}</p>
              <p className="text-sm font-medium text-green-800 mt-1 uppercase">Met</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex-1 text-center">
              <p className="text-3xl font-bold text-amber-600">{partialCount}</p>
              <p className="text-sm font-medium text-amber-800 mt-1 uppercase">Partial</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex-1 text-center">
              <p className="text-3xl font-bold text-red-600">{notMetCount}</p>
              <p className="text-sm font-medium text-red-800 mt-1 uppercase">Not Met</p>
            </div>
          </div>
          <p className="text-gray-600 font-medium text-center">
            {metCount} of {auditCounts.length} metrics fully satisfied.
          </p>
        </div>

        <div className="h-64 flex justify-center items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider w-1/3">Description</th>
              <th className="px-6 py-4 text-center font-semibold text-gray-600 uppercase tracking-wider">Metric</th>
              <th className="px-6 py-4 text-center font-semibold text-gray-600 uppercase tracking-wider">Target</th>
              <th className="px-6 py-4 text-center font-semibold text-gray-600 uppercase tracking-wider">Actual</th>
              <th className="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider w-48">Progress</th>
              <th className="px-6 py-4 text-center font-semibold text-gray-600 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {auditCounts.map((metric) => {
              const progressPercentage = metric.min === 0 
                ? (metric.count > 0 ? 100 : 0) 
                : Math.min(100, (metric.count / metric.min) * 100);
              let statusBadgeClass = '';
              let countClass = '';
              let progressColorClass = '';

              if (metric.status === 'Met') {
                statusBadgeClass = 'bg-green-100 text-green-800 border-green-200';
                countClass = 'text-green-600';
                progressColorClass = 'bg-green-500';
              } else if (metric.status === 'Partial') {
                statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                countClass = 'text-amber-600';
                progressColorClass = 'bg-amber-500';
              } else {
                statusBadgeClass = 'bg-red-100 text-red-800 border-red-200';
                countClass = 'text-red-600';
                progressColorClass = 'bg-red-500';
              }

              return (
                <tr 
                  key={metric.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onMetricClick({ aqar: metric.code })}
                >
                  <td className="px-6 py-4 text-gray-900 font-medium">{metric.desc}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-indigo-700">{metric.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600 font-semibold">{metric.min}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-center font-bold text-lg ${countClass}`}>
                    {metric.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`${progressColorClass} h-2.5 rounded-full`} style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeClass}`}>
                      {metric.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
