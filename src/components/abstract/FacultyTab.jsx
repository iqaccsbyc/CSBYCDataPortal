import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ActivityDetailView from '../ActivityDetailView';

export default function FacultyTab({ facultyCounts, dataEntrySummary }) {
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  if (!facultyCounts || !dataEntrySummary) return null;

  const top15 = facultyCounts.slice(0, 15);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* SECTION A: Organized Activities */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Activities Organized per Faculty</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Table */}
          <div className="overflow-hidden border border-gray-200 rounded-xl max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Faculty Name</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider">Events</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facultyCounts.map((faculty) => (
                  <tr key={faculty.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">{faculty.rank}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">{faculty.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${faculty.count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                        {faculty.count === 0 ? '—' : faculty.count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button 
                        onClick={() => setSelectedFaculty(faculty)}
                        disabled={faculty.count === 0}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${faculty.count > 0 ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-gray-400 cursor-not-allowed'}`}
                      >
                        <EyeIcon className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart */}
          <div className="h-[600px] border border-gray-100 rounded-xl p-4 flex flex-col">
            <h4 className="text-md font-bold text-gray-700 mb-4 text-center">Top 15 Faculty by Event Count</h4>
            <div className="flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top15} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#4b5563' }} />
                  <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#4b5563', fontSize: 12 }}>
                    {top15.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`rgba(59, 130, 246, ${Math.max(0.4, 1 - index * 0.05)})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: Data Entry Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Data Entry Summary</h3>
        <p className="text-sm text-gray-500 mb-6">Overview of activities created per admin/assistant account.</p>
        
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase">User Email</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-600 uppercase">Entries Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dataEntrySummary.map((entry) => (
                <tr key={entry.email} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{entry.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700 font-bold">{entry.count}</td>
                </tr>
              ))}
              {dataEntrySummary.length === 0 && (
                <tr>
                  <td colSpan="2" className="px-6 py-8 text-center text-gray-500">No data entry records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Drawer for View Events */}
      {selectedFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">
                Events Organized by <span className="text-indigo-600">{selectedFaculty.name}</span>
              </h3>
              <button 
                onClick={() => setSelectedFaculty(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {selectedFaculty.events.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No events found.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Event Title</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedFaculty.events.map(event => (
                        <tr 
                          key={event.id} 
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedActivity(event)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">{event.startDate}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium max-w-md truncate" title={event.eventName}>{event.eventName}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">{event.eventType}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${event.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {event.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSelectedFaculty(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Details Modal */}
      {selectedActivity && (
        <ActivityDetailView 
          activity={selectedActivity} 
          onClose={() => setSelectedActivity(null)} 
        />
      )}
    </div>
  );
}
