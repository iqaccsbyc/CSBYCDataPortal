import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316'];

export default function ProjectsConsultancyTab({ projects = [], consultancies = [], incentives = [], activeFaculty = [] }) {
  
  const { topFaculty, projTypeData, consNatureData, incNatureData } = useMemo(() => {
    // 1. Projects by Type
    const projTypeMap = {};
    projects.forEach(p => {
      const type = p.projectType || 'Unknown';
      projTypeMap[type] = (projTypeMap[type] || 0) + 1;
    });
    const pTypeData = Object.keys(projTypeMap).map(k => ({ name: k, value: projTypeMap[k] }));

    // 2. Consultancy by Nature
    const consNatureMap = {};
    consultancies.forEach(c => {
      const nat = c.natureOfConsultancy || 'Unknown';
      consNatureMap[nat] = (consNatureMap[nat] || 0) + 1;
    });
    const cNatureData = Object.keys(consNatureMap).map(k => ({ name: k, value: consNatureMap[k] }));

    // 3. Incentives by Nature
    const incNatureMap = {};
    incentives.forEach(i => {
      const nat = i.natureOfIncentive || 'Unknown';
      incNatureMap[nat] = (incNatureMap[nat] || 0) + 1;
    });
    const iNatureData = Object.keys(incNatureMap).map(k => ({ name: k, value: incNatureMap[k] }));

    // 4. Top Faculty by Funding Amount (incl. Incentives)
    const facFunding = {};
    const facEmailToName = {};
    activeFaculty.forEach(fac => {
      facFunding[fac.facName] = 0;
      if (fac.facEmail) facEmailToName[fac.facEmail] = fac.facName;
    });
    
    projects.forEach(p => {
      if (p.submittedByName && facFunding[p.submittedByName] !== undefined) {
        facFunding[p.submittedByName] += Number(p.amountSanctioned) || 0;
      }
    });
    consultancies.forEach(c => {
      if (c.submittedByName && facFunding[c.submittedByName] !== undefined) {
        facFunding[c.submittedByName] += Number(c.totalAmount) || 0;
      }
    });
    incentives.forEach(i => {
      const name = i.submittedByName || facEmailToName[i.submittedBy];
      if (name && facFunding[name] !== undefined) {
        facFunding[name] += Number(i.amount) || 0;
      }
    });

    const topFac = Object.keys(facFunding)
      .map(k => ({ name: k, Funding: facFunding[k] }))
      .filter(f => f.Funding > 0)
      .sort((a, b) => b.Funding - a.Funding)
      .slice(0, 10); // top 10

    return {
      topFaculty: topFac,
      projTypeData: pTypeData,
      consNatureData: cNatureData,
      incNatureData: iNatureData
    };
  }, [projects, consultancies, incentives, activeFaculty]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top 10 Faculty by Funding */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 col-span-1 lg:col-span-3">
          <h4 className="text-md font-bold text-gray-700 mb-4 text-center">Top Faculty by Total Funding Amount (₹)</h4>
          <div className="h-80">
            {topFaculty.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFaculty} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{fontSize: 11}} height={60} />
                  <YAxis tickFormatter={(val) => `₹${val/1000}k`} />
                  <RechartsTooltip formatter={(val) => `₹${val.toLocaleString()}`} cursor={{fill: '#F3F4F6'}} />
                  <Bar dataKey="Funding" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-gray-400">No funding data available</div>}
          </div>
        </div>

        {/* Project Types */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col items-center">
          <h4 className="text-md font-bold text-gray-700 mb-2">Projects by Type</h4>
          {projTypeData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={projTypeData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {projTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="flex h-full items-center justify-center text-gray-400">No project data</div>}
        </div>

        {/* Consultancy Nature */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col items-center">
          <h4 className="text-md font-bold text-gray-700 mb-2">Consultancy by Nature</h4>
          {consNatureData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={consNatureData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {consNatureData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="flex h-full items-center justify-center text-gray-400">No consultancy data</div>}
        </div>

        {/* Incentives Nature */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col items-center">
          <h4 className="text-md font-bold text-gray-700 mb-2">Incentives by Nature</h4>
          {incNatureData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={incNatureData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {incNatureData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="flex h-full items-center justify-center text-gray-400">No incentives data</div>}
        </div>

      </div>

      {/* Projects Detailed Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-200 bg-indigo-50">
          <h3 className="text-lg font-bold text-indigo-900">Projects Directory</h3>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: '500px' }}>
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 border-b">Lead Faculty</th>
                <th className="px-4 py-3 border-b">Title</th>
                <th className="px-4 py-3 border-b">Type</th>
                <th className="px-4 py-3 border-b">Funding Agency</th>
                <th className="px-4 py-3 border-b text-right">Sanctioned (₹)</th>
                <th className="px-4 py-3 border-b text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.length > 0 ? projects.map((p, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{p.submittedByName}</td>
                  <td className="px-4 py-3">{p.title}</td>
                  <td className="px-4 py-3">{p.projectType}</td>
                  <td className="px-4 py-3">{p.fundingAgency}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">
                    {p.amountSanctioned ? Number(p.amountSanctioned).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      p.projectStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {p.projectStatus}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-6 text-gray-500">No projects recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consultancy Detailed Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-200 bg-teal-50">
          <h3 className="text-lg font-bold text-teal-900">Consultancy Directory</h3>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: '500px' }}>
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 border-b">Lead Faculty</th>
                <th className="px-4 py-3 border-b">Title</th>
                <th className="px-4 py-3 border-b">Nature</th>
                <th className="px-4 py-3 border-b">Organization</th>
                <th className="px-4 py-3 border-b text-right">Total Amt (₹)</th>
                <th className="px-4 py-3 border-b text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {consultancies.length > 0 ? consultancies.map((c, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{c.submittedByName}</td>
                  <td className="px-4 py-3">{c.title}</td>
                  <td className="px-4 py-3">{c.natureOfConsultancy}</td>
                  <td className="px-4 py-3">{c.orgName}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">
                    {c.totalAmount ? Number(c.totalAmount).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      c.projectStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {c.projectStatus}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-6 text-gray-500">No consultancy recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incentives Detailed Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-200 bg-rose-50">
          <h3 className="text-lg font-bold text-rose-900">Financial Incentives Directory</h3>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: '500px' }}>
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 border-b">Faculty Name/Email</th>
                <th className="px-4 py-3 border-b">Nature of Incentive</th>
                <th className="px-4 py-3 border-b">Semester</th>
                <th className="px-4 py-3 border-b">Date of Receipt</th>
                <th className="px-4 py-3 border-b text-right">Amount (₹)</th>
                <th className="px-4 py-3 border-b text-center">Approval</th>
              </tr>
            </thead>
            <tbody>
              {incentives.length > 0 ? incentives.map((i, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{i.submittedByName || i.submittedBy}</td>
                  <td className="px-4 py-3">{i.natureOfIncentive}</td>
                  <td className="px-4 py-3">{i.semester}</td>
                  <td className="px-4 py-3">{i.dateOfReceipt}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">
                    {i.amount ? Number(i.amount).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      i.proofAccepted === 'Accepted' ? 'bg-green-100 text-green-800' :
                      i.proofAccepted === 'Revision Needed' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {i.proofAccepted || 'Pending'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-6 text-gray-500">No financial incentives recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
