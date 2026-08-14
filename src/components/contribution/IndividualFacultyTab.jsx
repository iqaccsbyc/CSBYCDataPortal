import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function IndividualFacultyTab({ activeFaculty, publications, presentations, iprOutcomes, participations, achievements, projects = [], consultancies = [], incentives = [], monthOrder = [], selectedAY }) {
  const [selectedFacId, setSelectedFacId] = useState('');

  const selectedFac = useMemo(() => {
    return activeFaculty.find(f => f.id === selectedFacId) || null;
  }, [activeFaculty, selectedFacId]);

  const facData = useMemo(() => {
    if (!selectedFac) return null;
    const facName = selectedFac.facName;

    const pubs = publications.filter(p => p.csbyFacultyAuthors?.includes(facName));
    const iprs = iprOutcomes.filter(i => i.csbyFacultyInventors?.includes(facName));
    const pres = presentations.filter(p => p.submittedByName === facName);
    const parts = participations.filter(p => p.submittedByName === facName);
    const achs = achievements.filter(a => a.submittedByName === facName);
    const projs = projects.filter(p => p.submittedByName === facName || p.csbycCoInvestigators?.includes(facName));
    const cons = consultancies.filter(c => c.submittedByName === facName || c.csbycCoFaculty?.includes(facName));
    const incs = incentives.filter(i => i.submittedByName === facName || i.submittedBy === selectedFac.email);

    const monthlyCounts = monthOrder.map(month => {
      const pubC = pubs.filter(p => p.month === month).length;
      const iprC = iprs.filter(i => i.month === month).length;
      const presC = pres.filter(p => p.month === month).length;
      const partC = parts.filter(p => p.month === month).length;
      const achC = achs.filter(a => a.month === month).length;
      const projC = projs.filter(p => (p.startDate && p.startDate.startsWith('2026') ? '2026-06' : p.month) === month || p.month === month).length; // Approximating month if not stored identically, but let's just use month field if it exists
      const consC = cons.filter(c => c.month === month).length;
      const incC = incs.filter(i => i.month === month).length;
      return {
        month,
        count: pubC + iprC + presC + partC + achC + projC + consC + incC
      };
    });

    return {
      pubs, iprs, pres, parts, achs, projs, cons, incs, monthlyCounts,
      totalContributions: pubs.length + iprs.length + pres.length + parts.length + achs.length + projs.length + cons.length + incs.length
    };
  }, [selectedFac, publications, iprOutcomes, presentations, participations, achievements, projects, consultancies, incentives]);

  const handlePrint = () => {
    window.print();
  };

  const getInitials = (name) => {
    if (!name) return 'F';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fade-in print:bg-white print:m-0 print:p-0">
      
      {/* Selector & Print Button */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-center gap-4 border border-gray-200 print:hidden">
        <div className="w-full sm:w-1/3">
          <label htmlFor="faculty-select" className="block text-sm font-medium text-gray-700 mb-1">Select Faculty</label>
          <select
            id="faculty-select"
            value={selectedFacId}
            onChange={(e) => setSelectedFacId(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="" disabled>Select a faculty member</option>
            {activeFaculty.map(f => (
              <option key={f.id} value={f.id}>{f.facName}</option>
            ))}
          </select>
        </div>
        {selectedFac && (
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Profile
          </button>
        )}
      </div>

      {!selectedFac ? (
        <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200 print:hidden">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Faculty Selected</h3>
          <p className="mt-1 text-sm text-gray-500">Please select a faculty member from the dropdown above to view their profile.</p>
        </div>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 flex items-center gap-6 print:shadow-none print:border-b print:rounded-none print:pb-4">
            <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-bold shrink-0">
              {getInitials(selectedFac.facName)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedFac.facName}</h2>
              <p className="text-gray-600 text-sm mt-1">{selectedFac.designation || 'Faculty'} | {selectedFac.email}</p>
              <p className="text-gray-500 text-sm mt-1">Department: CS-BYC | AY: {selectedAY}</p>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Publications</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{facData.pubs.length}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide">IPR Outcomes</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{facData.iprs.length}</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-center">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wide">Presentations</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{facData.pres.length}</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 text-center">
              <p className="text-xs text-orange-600 font-bold uppercase tracking-wide">Participations</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{facData.parts.length}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 text-center">
              <p className="text-xs text-yellow-600 font-bold uppercase tracking-wide">Achievements</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">{facData.achs.length}</p>
            </div>
            <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-4 text-center">
              <p className="text-xs text-cyan-600 font-bold uppercase tracking-wide">Projects</p>
              <p className="text-2xl font-bold text-cyan-900 mt-1">{facData.projs.length}</p>
            </div>
            <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 text-center">
              <p className="text-xs text-teal-600 font-bold uppercase tracking-wide">Consultancy</p>
              <p className="text-2xl font-bold text-teal-900 mt-1">{facData.cons.length}</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 text-center">
              <p className="text-xs text-rose-600 font-bold uppercase tracking-wide">Incentives</p>
              <p className="text-2xl font-bold text-rose-900 mt-1">{facData.incs.length}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center shadow-sm md:col-span-2 lg:col-span-1">
              <p className="text-xs text-indigo-700 font-bold uppercase tracking-wide">Total Contribs</p>
              <p className="text-2xl font-extrabold text-indigo-900 mt-1">{facData.totalContributions}</p>
            </div>
          </div>

          {/* Monthly Trend Chart */}
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200 print:hidden">
            <h4 className="text-md font-bold text-gray-700 mb-4">Monthly Contribution Trend</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facData.monthlyCounts}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{fontSize: 12}} />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{fill: '#F3F4F6'}} />
                  <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} name="Contributions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Publications Table */}
          {facData.pubs.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <h4 className="font-bold text-blue-900">Publications ({facData.pubs.length})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Month</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">Title</th>
                      <th className="px-4 py-2 font-semibold">Journal/Conf</th>
                      <th className="px-4 py-2 font-semibold">Indexed By</th>
                      <th className="px-4 py-2 font-semibold">DOI</th>
                      <th className="px-4 py-2 font-semibold">Proof Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facData.pubs.map((p, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{p.month}</td>
                        <td className="px-4 py-2 text-xs">{p.publicationType}</td>
                        <td className="px-4 py-2 font-medium group relative">
                          <span className="cursor-help border-b border-dashed border-gray-400">
                            {p.title?.length > 70 ? p.title.substring(0, 70) + '...' : p.title}
                          </span>
                          <div className="hidden group-hover:block absolute z-10 w-96 p-2 bg-gray-900 text-white text-xs rounded shadow-lg top-full left-0 mt-1 whitespace-normal">
                            {p.title}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs">{p.journalName || p.conferenceName || '—'}</td>
                        <td className="px-4 py-2 text-xs">{p.indexedBy?.join(', ') || '—'}</td>
                        <td className="px-4 py-2 text-xs">
                          {p.doiOrUrl ? <a href={p.doiOrUrl.startsWith('http') ? p.doiOrUrl : `https://doi.org/${p.doiOrUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Link</a> : '—'}
                        </td>
                        <td className="px-4 py-2 text-xs">{p.proofStatus || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* IPR Outcomes Table */}
          {facData.iprs.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                <h4 className="font-bold text-green-900">IPR Outcomes ({facData.iprs.length})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Month</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">Title</th>
                      <th className="px-4 py-2 font-semibold">Patent No.</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold">Proof Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facData.iprs.map((i, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{i.month}</td>
                        <td className="px-4 py-2 text-xs">{i.iprType}</td>
                        <td className="px-4 py-2 font-medium">{i.title}</td>
                        <td className="px-4 py-2 text-xs">{i.patentNumber || '—'}</td>
                        <td className="px-4 py-2 text-xs">{i.status || '—'}</td>
                        <td className="px-4 py-2 text-xs">{i.proofStatus || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Presentations Table */}
          {facData.pres.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
                <h4 className="font-bold text-purple-900">Presentations ({facData.pres.length})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Month</th>
                      <th className="px-4 py-2 font-semibold">Programme</th>
                      <th className="px-4 py-2 font-semibold">Role</th>
                      <th className="px-4 py-2 font-semibold">Level</th>
                      <th className="px-4 py-2 font-semibold">Mode</th>
                      <th className="px-4 py-2 font-semibold">Proof Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facData.pres.map((p, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{p.month}</td>
                        <td className="px-4 py-2 font-medium">{p.programmeName}</td>
                        <td className="px-4 py-2 text-xs">{p.role}</td>
                        <td className="px-4 py-2 text-xs">{p.level}</td>
                        <td className="px-4 py-2 text-xs">{p.mode}</td>
                        <td className="px-4 py-2 text-xs">{p.proofStatus || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Participations Table */}
          {facData.parts.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                <h4 className="font-bold text-orange-900">Participations ({facData.parts.length})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Month</th>
                      <th className="px-4 py-2 font-semibold">Programme</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">Level</th>
                      <th className="px-4 py-2 font-semibold">Mode</th>
                      <th className="px-4 py-2 font-semibold">Days</th>
                      <th className="px-4 py-2 font-semibold">Proof Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facData.parts.map((p, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{p.month}</td>
                        <td className="px-4 py-2 font-medium">{p.programmeName}</td>
                        <td className="px-4 py-2 text-xs">{p.programmeType}</td>
                        <td className="px-4 py-2 text-xs">{p.level}</td>
                        <td className="px-4 py-2 text-xs">{p.mode}</td>
                        <td className="px-4 py-2 text-xs">{p.durationDays}</td>
                        <td className="px-4 py-2 text-xs">{p.proofStatus || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Achievements Table */}
          {facData.achs.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100">
                <h4 className="font-bold text-yellow-900">Achievements ({facData.achs.length})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Month</th>
                      <th className="px-4 py-2 font-semibold">Achievement Type</th>
                      <th className="px-4 py-2 font-semibold">Event</th>
                      <th className="px-4 py-2 font-semibold">Honour</th>
                      <th className="px-4 py-2 font-semibold">Level</th>
                      <th className="px-4 py-2 font-semibold">Proof Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facData.achs.map((a, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{a.month}</td>
                        <td className="px-4 py-2 text-xs">{a.achievementType}</td>
                        <td className="px-4 py-2 font-medium">{a.eventName}</td>
                        <td className="px-4 py-2 text-xs">{a.honourReceived}</td>
                        <td className="px-4 py-2 text-xs">{a.level}</td>
                        <td className="px-4 py-2 text-xs">{a.proofStatus || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Projects Table */}
          {facData.projs.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-cyan-50 border-b border-cyan-100">
                <h4 className="font-bold text-cyan-900">Projects ({facData.projs.length})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Date/Month</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">Title</th>
                      <th className="px-4 py-2 font-semibold">Funding Agency</th>
                      <th className="px-4 py-2 font-semibold">Sanctioned Amt (₹)</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold">Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facData.projs.map((p, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{p.startDate || p.month}</td>
                        <td className="px-4 py-2 text-xs">{p.projectType}</td>
                        <td className="px-4 py-2 font-medium">{p.title}</td>
                        <td className="px-4 py-2 text-xs">{p.fundingAgency}</td>
                        <td className="px-4 py-2 text-xs">{p.amountSanctioned || '-'}</td>
                        <td className="px-4 py-2 text-xs">{p.projectStatus}</td>
                        <td className="px-4 py-2 text-xs">{p.proofStatus || p.proofAccepted || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Consultancies Table */}
          {facData.cons.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-teal-50 border-b border-teal-100">
                <h4 className="font-bold text-teal-900">Consultancy ({facData.cons.length})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Date/Month</th>
                      <th className="px-4 py-2 font-semibold">Nature</th>
                      <th className="px-4 py-2 font-semibold">Title</th>
                      <th className="px-4 py-2 font-semibold">Organization</th>
                      <th className="px-4 py-2 font-semibold">Total Amt (₹)</th>
                      <th className="px-4 py-2 font-semibold">Received Amt (₹)</th>
                      <th className="px-4 py-2 font-semibold">Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facData.cons.map((c, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{c.startDate || c.month}</td>
                        <td className="px-4 py-2 text-xs">{c.natureOfConsultancy}</td>
                        <td className="px-4 py-2 font-medium">{c.title}</td>
                        <td className="px-4 py-2 text-xs">{c.orgName}</td>
                        <td className="px-4 py-2 text-xs">{c.totalAmount || '-'}</td>
                        <td className="px-4 py-2 text-xs">{c.amountReceived || '-'}</td>
                        <td className="px-4 py-2 text-xs">{c.proofStatus || c.proofAccepted || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Incentives Table */}
          {facData.incs.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-rose-50 border-b border-rose-100">
                <h4 className="font-bold text-rose-900">Financial Incentives ({facData.incs.length})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Date/Month</th>
                      <th className="px-4 py-2 font-semibold">Nature</th>
                      <th className="px-4 py-2 font-semibold">Semester</th>
                      <th className="px-4 py-2 font-semibold">Amount (₹)</th>
                      <th className="px-4 py-2 font-semibold">Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facData.incs.map((i, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{i.dateOfReceipt || i.month}</td>
                        <td className="px-4 py-2 text-xs">{i.natureOfIncentive}</td>
                        <td className="px-4 py-2 text-xs">{i.semester}</td>
                        <td className="px-4 py-2 text-xs">{i.amount || '-'}</td>
                        <td className="px-4 py-2 text-xs">{i.proofStatus || i.proofAccepted || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
