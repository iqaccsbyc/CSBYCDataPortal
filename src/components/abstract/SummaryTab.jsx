import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function SummaryTab({ summary, onMetricClick }) {
  if (!summary) return null;

  const pieData = [
    { name: 'Physical', value: summary.physical, color: '#3b82f6' },
    { name: 'Online', value: summary.online, color: '#10b981' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => onMetricClick({})}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Activities</p>
          <p className="text-4xl font-bold text-gray-900 mt-2">{summary.total}</p>
        </div>
        <div 
          onClick={() => onMetricClick({ status: 'completed' })}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center cursor-pointer hover:border-green-300 hover:shadow-md transition-all"
        >
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Completed</p>
          <p className="text-4xl font-bold text-green-600 mt-2">{summary.completed}</p>
        </div>
        <div 
          onClick={() => onMetricClick({ status: 'pending_faculty' })}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center cursor-pointer hover:border-amber-300 hover:shadow-md transition-all"
        >
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending</p>
          <p className="text-4xl font-bold text-amber-500 mt-2">{summary.pending}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Participants</p>
          <p className="text-4xl font-bold text-blue-600 mt-2">{summary.totalParticipants}</p>
        </div>
      </div>

      {/* Top Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity Count */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Monthly Activity Count</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyCounts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Physical vs Online */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Physical vs Online</h3>
          <div className="h-72 flex justify-center items-center">
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
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 10 Event Types */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Top 10 Event Types</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.topEventTypes} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
              <YAxis dataKey="type" type="category" width={150} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563', cursor: 'pointer' }} onClick={(data) => { if(data && data.value) onMetricClick({ eventType: data.value }) }} />
              <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#4b5563', fontSize: 12 }} onClick={(data) => { if(data && data.type) onMetricClick({ eventType: data.type }) }} className="cursor-pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
