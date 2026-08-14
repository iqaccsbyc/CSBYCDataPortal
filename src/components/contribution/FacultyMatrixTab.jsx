import React, { useState, useMemo } from 'react';

const PUB_COLS = [
  "Indexed Int. Journal", "Indexed Nat. Journal", "Indexed Conf. Proceedings",
  "Indexed Book Chapter", "Non-Indexed Int. Journal", "Non-Indexed Nat. Journal",
  "Non-Indexed Book Chapter", "Non-Indexed Conf. Presentations", "Book"
];
// Mapping short names to full names in db if needed, but per request it matches mostly.
const PUB_COLS_MAP = {
  "Indexed Conf. Proceedings": "Indexed Conference Proceedings",
  "Non-Indexed Conf. Presentations": "Non-Indexed Conference Presentations"
};

const IPR_COLS = [
  "National Design", "National Published", "National Copyright", "National Utility",
  "International Design", "International Published", "International Copyright", "International Utility"
];

const PRES_COLS = [
  "Invited Resource Person", "Keynote Speaker", "Presenter", "Session Chair"
];

const PART_COLS = [
  "FDP", "QIP", "Workshop", "Webinar"
];
const PART_OTHERS = ["Certification Programme", "MOOC", "Training Programme", "Refresher Course"];

export default function FacultyMatrixTab({ activeFaculty, publications, presentations, iprOutcomes, participations, achievements }) {
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // --- SUB-TABLE A DATA ---
  const matrixA = useMemo(() => {
    let totalsRow = { facName: 'TOTAL' };
    PUB_COLS.forEach(c => totalsRow[`pub_${c}`] = 0);
    totalsRow.totalPubs = 0;
    IPR_COLS.forEach(c => totalsRow[`ipr_${c}`] = 0);
    totalsRow.totalIPR = 0;

    const rows = activeFaculty.map(fac => {
      const row = { facName: fac.facName };
      let totalPubs = 0;
      let totalIPR = 0;

      PUB_COLS.forEach(col => {
        const fullCol = PUB_COLS_MAP[col] || col;
        const count = publications.filter(p => 
          p.csbyFacultyAuthors?.includes(fac.facName) && p.publicationType === fullCol
        ).length;
        row[`pub_${col}`] = count;
        totalPubs += count;
        totalsRow[`pub_${col}`] += count;
      });
      row.totalPubs = totalPubs;
      totalsRow.totalPubs += totalPubs;

      IPR_COLS.forEach(col => {
        const count = iprOutcomes.filter(i => 
          i.csbyFacultyInventors?.includes(fac.facName) && i.iprType === col
        ).length;
        row[`ipr_${col}`] = count;
        totalIPR += count;
        totalsRow[`ipr_${col}`] += count;
      });
      row.totalIPR = totalIPR;
      totalsRow.totalIPR += totalIPR;

      return row;
    });

    return { rows, totalsRow, grandTotalIPR: iprOutcomes.length };
  }, [activeFaculty, publications, iprOutcomes]);

  // --- SUB-TABLE B DATA ---
  const matrixB = useMemo(() => {
    let totalsRow = { facName: 'TOTAL' };
    PRES_COLS.forEach(c => totalsRow[`pres_${c}`] = 0);
    totalsRow.totalPres = 0;
    PART_COLS.forEach(c => totalsRow[`part_${c}`] = 0);
    totalsRow.partOthers = 0;
    totalsRow.totalPart = 0;
    totalsRow.achievements = 0;
    totalsRow.totalContributions = 0;

    const rows = activeFaculty.map(fac => {
      const row = { facName: fac.facName };
      let totalPres = 0;
      let totalPart = 0;

      PRES_COLS.forEach(col => {
        const count = presentations.filter(p => p.submittedByName === fac.facName && p.role === col).length;
        row[`pres_${col}`] = count;
        totalPres += count;
        totalsRow[`pres_${col}`] += count;
      });
      row.totalPres = totalPres;
      totalsRow.totalPres += totalPres;

      PART_COLS.forEach(col => {
        const count = participations.filter(p => p.submittedByName === fac.facName && p.programmeType === col).length;
        row[`part_${col}`] = count;
        totalPart += count;
        totalsRow[`part_${col}`] += count;
      });
      const othersCount = participations.filter(p => p.submittedByName === fac.facName && PART_OTHERS.includes(p.programmeType)).length;
      row.partOthers = othersCount;
      totalsRow.partOthers += othersCount;
      totalPart += othersCount;
      row.totalPart = totalPart;
      totalsRow.totalPart += totalPart;

      const achCount = achievements.filter(a => a.submittedByName === fac.facName).length;
      row.achievements = achCount;
      totalsRow.achievements += achCount;

      const totalA = matrixA.rows.find(r => r.facName === fac.facName);
      row.totalContributions = (totalA?.totalPubs || 0) + (totalA?.totalIPR || 0) + totalPres + totalPart + achCount;
      totalsRow.totalContributions += row.totalContributions;

      return row;
    });

    // Identify top 5 contributors
    const sorted = [...rows].sort((a, b) => b.totalContributions - a.totalContributions);
    const top5Threshold = sorted[4]?.totalContributions || 0;
    rows.forEach(r => {
      r.isTop5 = r.totalContributions >= top5Threshold && r.totalContributions > 0;
    });

    return { rows, totalsRow };
  }, [activeFaculty, presentations, participations, achievements, matrixA]);


  const handleFacultyClick = (facName) => {
    setSelectedFaculty(facName);
    setModalOpen(true);
  };

  const renderCell = (val) => val === 0 ? '—' : val;

  const facPubs = selectedFaculty ? publications.filter(p => p.csbyFacultyAuthors?.includes(selectedFaculty)) : [];
  const facIPRs = selectedFaculty ? iprOutcomes.filter(i => i.csbyFacultyInventors?.includes(selectedFaculty)) : [];

  return (
    <div className="space-y-10 animate-fade-in">
      
      {/* Sub-Table A */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h3 className="text-lg font-bold text-gray-800">Sub-Table A: Publications & IPR per Faculty</h3>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 shadow-sm text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 border border-gray-200 sticky left-0 z-30 bg-gray-100" rowSpan={2}>Faculty Name</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-blue-50 text-blue-800" colSpan={PUB_COLS.length + 1}>Publications</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-green-50 text-green-800" colSpan={IPR_COLS.length + 1}>IPR Outcomes</th>
              </tr>
              <tr>
                {PUB_COLS.map(col => <th key={`tha-pub-${col}`} className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-blue-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>{col}</th>)}
                <th className="px-2 py-3 border border-gray-200 font-bold bg-blue-100 whitespace-nowrap text-center text-blue-900" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>TOTAL Pubs</th>
                {IPR_COLS.map(col => <th key={`tha-ipr-${col}`} className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-green-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>{col}</th>)}
                <th className="px-2 py-3 border border-gray-200 font-bold bg-green-100 whitespace-nowrap text-center text-green-900" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>TOTAL IPR</th>
              </tr>
            </thead>
            <tbody>
              {matrixA.rows.map((row, idx) => (
                <tr key={row.facName} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}>
                  <td className="px-4 py-2 border border-gray-200 sticky left-0 z-10 bg-inherit font-medium">
                    <button onClick={() => handleFacultyClick(row.facName)} className="text-indigo-600 hover:underline text-left w-full">
                      {row.facName}
                    </button>
                  </td>
                  {PUB_COLS.map(col => <td key={`tda-pub-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(row[`pub_${col}`])}</td>)}
                  <td className="px-4 py-2 border border-gray-200 text-center font-bold bg-blue-50/50">{renderCell(row.totalPubs)}</td>
                  {IPR_COLS.map(col => <td key={`tda-ipr-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(row[`ipr_${col}`])}</td>)}
                  <td className="px-4 py-2 border border-gray-200 text-center font-bold bg-green-50/50">{renderCell(row.totalIPR)}</td>
                </tr>
              ))}
              {/* TOTAL ROW */}
              <tr className="bg-gray-200 font-bold text-gray-900 sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                <td className="px-4 py-2 border border-gray-200 sticky left-0 z-10 bg-gray-200">TOTAL</td>
                {PUB_COLS.map(col => <td key={`tda-pub-tot-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(matrixA.totalsRow[`pub_${col}`])}</td>)}
                <td className="px-4 py-2 border border-gray-200 text-center text-blue-900">{renderCell(matrixA.totalsRow.totalPubs)}</td>
                {IPR_COLS.map(col => <td key={`tda-ipr-tot-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(matrixA.totalsRow[`ipr_${col}`])}</td>)}
                <td className="px-4 py-2 border border-gray-200 text-center text-green-900">{renderCell(matrixA.totalsRow.totalIPR)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-white border-t border-gray-200 flex justify-end">
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded shadow text-sm font-bold">
            Grand Total IPR (All Faculty): {matrixA.grandTotalIPR}
          </div>
        </div>
      </div>

      {/* Sub-Table B */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h3 className="text-lg font-bold text-gray-800">Sub-Table B: Presentations, Participations & Achievements per Faculty</h3>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 shadow-sm text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 border border-gray-200 sticky left-0 z-30 bg-gray-100" rowSpan={2}>Faculty Name</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-purple-50 text-purple-800" colSpan={PRES_COLS.length + 1}>Presentations</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-orange-50 text-orange-800" colSpan={PART_COLS.length + 2}>Participations</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-yellow-50 text-yellow-800" rowSpan={2}>Achievements</th>
                <th className="px-4 py-2 border border-gray-200 text-center bg-indigo-100 text-indigo-900" rowSpan={2}>TOTAL Contributions</th>
              </tr>
              <tr>
                {PRES_COLS.map(col => <th key={`thb-pres-${col}`} className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-purple-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>{col}</th>)}
                <th className="px-2 py-3 border border-gray-200 font-bold bg-purple-100 whitespace-nowrap text-center text-purple-900" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>TOTAL Pres.</th>
                
                {PART_COLS.map(col => <th key={`thb-part-${col}`} className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-orange-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>{col}</th>)}
                <th className="px-2 py-3 border border-gray-200 whitespace-nowrap bg-orange-50" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>Others</th>
                <th className="px-2 py-3 border border-gray-200 font-bold bg-orange-100 whitespace-nowrap text-center text-orange-900" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>TOTAL Part.</th>
              </tr>
            </thead>
            <tbody>
              {matrixB.rows.map((row, idx) => (
                <tr key={row.facName} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors ${row.isTop5 ? 'border-l-4 border-l-amber-500' : ''}`}>
                  <td className="px-4 py-2 border border-gray-200 sticky left-0 z-10 bg-inherit font-medium">
                    {row.facName} {row.isTop5 && <span className="ml-1 text-xs text-amber-600 font-bold" title="Top 5 Contributor">★</span>}
                  </td>
                  
                  {PRES_COLS.map(col => <td key={`tdb-pres-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(row[`pres_${col}`])}</td>)}
                  <td className="px-4 py-2 border border-gray-200 text-center font-bold bg-purple-50/50">{renderCell(row.totalPres)}</td>
                  
                  {PART_COLS.map(col => <td key={`tdb-part-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(row[`part_${col}`])}</td>)}
                  <td className="px-4 py-2 border border-gray-200 text-center">{renderCell(row.partOthers)}</td>
                  <td className="px-4 py-2 border border-gray-200 text-center font-bold bg-orange-50/50">{renderCell(row.totalPart)}</td>
                  
                  <td className="px-4 py-2 border border-gray-200 text-center bg-yellow-50/30">{renderCell(row.achievements)}</td>
                  <td className="px-4 py-2 border border-gray-200 text-center font-bold bg-indigo-50/50 text-indigo-700">{renderCell(row.totalContributions)}</td>
                </tr>
              ))}
              {/* TOTAL ROW */}
              <tr className="bg-gray-200 font-bold text-gray-900 sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                <td className="px-4 py-2 border border-gray-200 sticky left-0 z-10 bg-gray-200">TOTAL</td>
                
                {PRES_COLS.map(col => <td key={`tdb-pres-tot-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(matrixB.totalsRow[`pres_${col}`])}</td>)}
                <td className="px-4 py-2 border border-gray-200 text-center text-purple-900">{renderCell(matrixB.totalsRow.totalPres)}</td>
                
                {PART_COLS.map(col => <td key={`tdb-part-tot-${col}`} className="px-4 py-2 border border-gray-200 text-center">{renderCell(matrixB.totalsRow[`part_${col}`])}</td>)}
                <td className="px-4 py-2 border border-gray-200 text-center">{renderCell(matrixB.totalsRow.partOthers)}</td>
                <td className="px-4 py-2 border border-gray-200 text-center text-orange-900">{renderCell(matrixB.totalsRow.totalPart)}</td>
                
                <td className="px-4 py-2 border border-gray-200 text-center text-yellow-900">{renderCell(matrixB.totalsRow.achievements)}</td>
                <td className="px-4 py-2 border border-gray-200 text-center text-indigo-900">{renderCell(matrixB.totalsRow.totalContributions)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Faculty Details */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                      {selectedFaculty} - Publications & IPR
                    </h3>
                    
                    <div className="mt-6">
                      <h4 className="text-md font-bold text-blue-800 mb-2 border-b pb-1">Publications ({facPubs.length})</h4>
                      {facPubs.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs border border-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 border-b">Month</th>
                                <th className="px-3 py-2 border-b">Type</th>
                                <th className="px-3 py-2 border-b">Title</th>
                                <th className="px-3 py-2 border-b">Journal/Conf</th>
                              </tr>
                            </thead>
                            <tbody>
                              {facPubs.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 border-b">{p.month}</td>
                                  <td className="px-3 py-2 border-b">{p.publicationType}</td>
                                  <td className="px-3 py-2 border-b font-medium">{p.title}</td>
                                  <td className="px-3 py-2 border-b">{p.journalName || p.conferenceName || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-sm text-gray-500">No publications found.</p>}
                    </div>

                    <div className="mt-6">
                      <h4 className="text-md font-bold text-green-800 mb-2 border-b pb-1">IPR Outcomes ({facIPRs.length})</h4>
                      {facIPRs.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs border border-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 border-b">Month</th>
                                <th className="px-3 py-2 border-b">Type</th>
                                <th className="px-3 py-2 border-b">Title</th>
                                <th className="px-3 py-2 border-b">Patent No.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {facIPRs.map(i => (
                                <tr key={i.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 border-b">{i.month}</td>
                                  <td className="px-3 py-2 border-b">{i.iprType}</td>
                                  <td className="px-3 py-2 border-b font-medium">{i.title}</td>
                                  <td className="px-3 py-2 border-b">{i.patentNumber || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-sm text-gray-500">No IPR outcomes found.</p>}
                    </div>

                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
