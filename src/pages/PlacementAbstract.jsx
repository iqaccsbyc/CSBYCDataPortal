import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { BriefcaseIcon, ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { ACADEMIC_YEARS, getCurrentAcademicYear } from '../utils/academicYear';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function PlacementAbstract() {
  const [selectedAY, setSelectedAY] = useState(getCurrentAcademicYear());
  const [placements, setPlacements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const snap = await getDocs(query(collection(db, 'placements'), where('academicYear', '==', selectedAY)));
      const data = snap.docs.map(doc => doc.data());
      setPlacements(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load placement data. ' + (err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAY]);

  // Aggregations
  const totalOffers = placements.length;
  const placementCount = placements.filter(p => p.placementType === 'Placement').length;
  const internshipCount = placements.filter(p => p.placementType === 'Internship').length;
  const summerInternshipCount = placements.filter(p => p.placementType === 'Summer Internship').length;
  const uniqueStudents = new Set(placements.map(p => p.regNo)).size;

  // Chart 1: Pie Chart for Placement Types
  const typeChartData = [
    { name: 'Placement', value: placementCount },
    { name: 'Internship', value: internshipCount },
    { name: 'Summer Internship', value: summerInternshipCount }
  ].filter(d => d.value > 0);

  // Chart 2: Bar Chart for Top Companies
  const companyCounts = {};
  placements.forEach(p => {
    const comp = p.company || 'Unknown';
    companyCounts[comp] = (companyCounts[comp] || 0) + 1;
  });
  const companyChartData = Object.entries(companyCounts)
    .map(([name, count]) => ({ name, Count: count }))
    .sort((a, b) => b.Count - a.Count)
    .slice(0, 10); // Top 10 companies

  // Table Data: Aggregated by Company
  const tableData = Object.keys(companyCounts).map(comp => {
    const pForComp = placements.filter(p => p.company === comp);
    return {
      company: comp,
      total: pForComp.length,
      placements: pForComp.filter(p => p.placementType === 'Placement').length,
      internships: pForComp.filter(p => p.placementType === 'Internship').length,
      summerInternships: pForComp.filter(p => p.placementType === 'Summer Internship').length,
    };
  }).sort((a, b) => b.total - a.total);

  const handleExport = () => {
    const wsData = [
      ['Company / Organization', 'Total Offers', 'Placements', 'Internships', 'Summer Internships'],
      ...tableData.map(row => [
        row.company, row.total, row.placements, row.internships, row.summerInternships
      ]),
      ['TOTAL', totalOffers, placementCount, internshipCount, summerInternshipCount]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Company-wise Aggregation");
    XLSX.writeFile(wb, `Placement_Abstract_AY${selectedAY}.xlsx`);
  };

  return (
    <div className="flex flex-col">

      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BriefcaseIcon className="w-7 h-7 text-indigo-600" />
            Placement Dashboard
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
              onClick={fetchData}
              disabled={isLoading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={handleExport}
              disabled={isLoading || tableData.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <ArrowPathIcon className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-gray-500 font-medium">Crunching placement data for AY {selectedAY}...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-bold">Failed to load data</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        ) : placements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
            <BriefcaseIcon className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No placements found for AY {selectedAY}</h3>
            <p className="text-gray-500 max-w-md text-sm">
              Start by adding entries in the Placement Entry portal.
            </p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow p-4 border border-gray-100 flex items-center">
                <div className="p-3 rounded-full mr-4 bg-indigo-100 text-indigo-600">
                  <BriefcaseIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Offers</p>
                  <p className="text-2xl font-bold text-gray-900">{totalOffers}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border border-gray-100 flex items-center">
                <div className="p-3 rounded-full mr-4 bg-blue-100 text-blue-600">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Unique Students</p>
                  <p className="text-2xl font-bold text-gray-900">{uniqueStudents}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border border-gray-100 flex items-center">
                <div className="p-3 rounded-full mr-4 bg-green-100 text-green-600">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Placements</p>
                  <p className="text-2xl font-bold text-gray-900">{placementCount}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border border-gray-100 flex items-center">
                <div className="p-3 rounded-full mr-4 bg-orange-100 text-orange-600">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Internships</p>
                  <p className="text-2xl font-bold text-gray-900">{internshipCount}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border border-gray-100 flex items-center">
                <div className="p-3 rounded-full mr-4 bg-yellow-100 text-yellow-600">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Summer Interns</p>
                  <p className="text-2xl font-bold text-gray-900">{summerInternshipCount}</p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Pie Chart: Types */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col items-center">
                <h4 className="text-md font-bold text-gray-700 mb-2">Offer Types Breakdown</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeChartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {typeChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart: Top Companies */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <h4 className="text-md font-bold text-gray-700 mb-4 text-center">Top Companies by Offer Count</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={companyChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                      <RechartsTooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                      <Bar dataKey="Count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Table Section */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Company-wise Aggregation</h3>
              </div>
              <div className="overflow-x-auto" style={{ maxHeight: '500px' }}>
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 shadow-sm text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 border border-gray-200 sticky left-0 z-30 bg-gray-100">Company / Organization</th>
                      <th className="px-4 py-3 border border-gray-200 text-center text-indigo-700">Total Offers</th>
                      <th className="px-4 py-3 border border-gray-200 text-center text-green-700">Placements</th>
                      <th className="px-4 py-3 border border-gray-200 text-center text-orange-700">Internships</th>
                      <th className="px-4 py-3 border border-gray-200 text-center text-yellow-700">Summer Internships</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, idx) => (
                      <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}>
                        <td className="px-4 py-3 border border-gray-200 font-medium sticky left-0 bg-inherit">{row.company}</td>
                        <td className="px-4 py-3 border border-gray-200 text-center font-bold text-indigo-600">{row.total}</td>
                        <td className="px-4 py-3 border border-gray-200 text-center">{row.placements || '-'}</td>
                        <td className="px-4 py-3 border border-gray-200 text-center">{row.internships || '-'}</td>
                        <td className="px-4 py-3 border border-gray-200 text-center">{row.summerInternships || '-'}</td>
                      </tr>
                    ))}
                    {tableData.length > 0 && (
                      <tr className="bg-gray-200 font-bold text-gray-900 sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                        <td className="px-4 py-3 border border-gray-200 sticky left-0 bg-gray-200">TOTAL</td>
                        <td className="px-4 py-3 border border-gray-200 text-center text-indigo-700">{totalOffers}</td>
                        <td className="px-4 py-3 border border-gray-200 text-center text-green-700">{placementCount}</td>
                        <td className="px-4 py-3 border border-gray-200 text-center text-orange-700">{internshipCount}</td>
                        <td className="px-4 py-3 border border-gray-200 text-center text-yellow-700">{summerInternshipCount}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
