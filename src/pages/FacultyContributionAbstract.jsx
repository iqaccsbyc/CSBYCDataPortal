import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useContributionData } from '../hooks/useContributionData';

import DeptSummaryTab from '../components/contribution/DeptSummaryTab';
import FacultyMatrixTab from '../components/contribution/FacultyMatrixTab';
import IndividualFacultyTab from '../components/contribution/IndividualFacultyTab';
import SDGResearchTab from '../components/contribution/SDGResearchTab';
import FDPParticipationTab from '../components/contribution/FDPParticipationTab';
import AchievementsTab from '../components/contribution/AchievementsTab';
import ProjectsConsultancyTab from '../components/contribution/ProjectsConsultancyTab';

import { generateMonthsForAY, ACADEMIC_YEARS, getCurrentAcademicYear } from '../utils/academicYear';
const TABS = [
  { id: 'summary', label: 'Department Summary' },
  { id: 'matrix', label: 'Faculty-wise Matrix' },
  { id: 'individual', label: 'Individual Faculty' },
  { id: 'sdg', label: 'SDG & Research Impact' },
  { id: 'fdp', label: 'FDP & Participation' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'proj_cons', label: 'Projects, Cons. & Incentives' },
];

export default function FacultyContributionAbstract() {
  const [selectedAY, setSelectedAY] = useState(getCurrentAcademicYear());
  const monthOrder = React.useMemo(() => generateMonthsForAY(selectedAY), [selectedAY]);

  const {
    publications,
    presentations,
    iprOutcomes,
    participations,
    achievements,
    projects,
    consultancies,
    incentives,
    activeFaculty,
    isLoading,
    error,
    refresh
  } = useContributionData(selectedAY);

  const [activeTab, setActiveTab] = useState('summary');

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Reusable aggregations
    const activeFacNames = activeFaculty.map(f => f.facName);
    const pubCols = ["Indexed Int. Journal", "Indexed Nat. Journal", "Indexed Conference Proceedings", "Indexed Book Chapter", "Non-Indexed Int. Journal", "Non-Indexed Nat. Journal", "Non-Indexed Book Chapter", "Non-Indexed Conference Presentations", "Book"];
    const iprCols = ["National Design", "National Published", "National Copyright", "National Utility", "International Design", "International Published", "International Copyright", "International Utility"];
    const presCols = ["Invited Resource Person", "Keynote Speaker", "Presenter", "Session Chair", "Panel Member"];
    const partCols = ["FDP", "QIP", "Workshop", "Seminar", "Webinar", "Certification Programme", "MOOC", "Training Programme", "Refresher Course"];

    // ------------------------------------------
    // Sheet 1: Dept Month-wise
    // ------------------------------------------
    const s1Data = [
      ["Month", ...pubCols.map((c,i)=>i===0?"PUBLICATIONS":""), ...iprCols.map((c,i)=>i===0?"IPR OUTCOMES":""), ...presCols.map((c,i)=>i===0?"PRESENTATIONS":""), ...partCols.map((c,i)=>i===0?"PARTICIPATIONS":"")],
      ["Month", ...pubCols, ...iprCols, ...presCols, ...partCols]
    ];
    const s1Totals = new Array(pubCols.length + iprCols.length + presCols.length + partCols.length).fill(0);
    
    monthOrder.forEach(m => {
      const row = [m];
      let tIdx = 0;
      pubCols.forEach(c => { const val = publications.filter(p => p.month === m && p.publicationType === c).length; row.push(val); s1Totals[tIdx++] += val; });
      iprCols.forEach(c => { const val = iprOutcomes.filter(i => i.month === m && i.iprType === c).length; row.push(val); s1Totals[tIdx++] += val; });
      presCols.forEach(c => { const val = presentations.filter(p => p.month === m && p.role === c).length; row.push(val); s1Totals[tIdx++] += val; });
      partCols.forEach(c => { const val = participations.filter(p => p.month === m && p.programmeType === c).length; row.push(val); s1Totals[tIdx++] += val; });
      s1Data.push(row);
    });
    s1Data.push(["TOTAL", ...s1Totals]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1Data), "Dept Month-wise");

    // ------------------------------------------
    // Sheet 2: Faculty Pub+IPR Matrix
    // ------------------------------------------
    const pubColsMap = {"Indexed Conference Proceedings": "Indexed Conf. Proceedings", "Non-Indexed Conference Presentations": "Non-Indexed Conf. Presentations"};
    const mappedPubCols = pubCols.map(c => pubColsMap[c] || c);
    
    const s2Data = [
      ["Faculty Name", ...mappedPubCols.map((c,i)=>i===0?"PUBLICATIONS":""), "TOTAL Pubs", ...iprCols.map((c,i)=>i===0?"IPR OUTCOMES":""), "TOTAL IPR"],
      ["Faculty Name", ...mappedPubCols, "TOTAL Pubs", ...iprCols, "TOTAL IPR"]
    ];
    const s2Totals = new Array(mappedPubCols.length + 1 + iprCols.length + 1).fill(0);
    
    activeFacNames.forEach(fac => {
      const row = [fac];
      let tIdx = 0, fPubTotal = 0, fIprTotal = 0;
      
      mappedPubCols.forEach(col => {
        const fullCol = Object.keys(pubColsMap).find(k => pubColsMap[k] === col) || col;
        const val = publications.filter(p => p.csbyFacultyAuthors?.includes(fac) && p.publicationType === fullCol).length;
        row.push(val); s2Totals[tIdx++] += val; fPubTotal += val;
      });
      row.push(fPubTotal); s2Totals[tIdx++] += fPubTotal;
      
      iprCols.forEach(col => {
        const val = iprOutcomes.filter(i => i.csbyFacultyInventors?.includes(fac) && i.iprType === col).length;
        row.push(val); s2Totals[tIdx++] += val; fIprTotal += val;
      });
      row.push(fIprTotal); s2Totals[tIdx++] += fIprTotal;
      
      s2Data.push(row);
    });
    s2Data.push(["TOTAL", ...s2Totals]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2Data), "Faculty Pub+IPR Matrix");

    // ------------------------------------------
    // Sheet 3: Faculty Contributions
    // ------------------------------------------
    const s3PresCols = ["Invited Resource Person", "Keynote Speaker", "Presenter", "Session Chair"];
    const s3PartCols = ["FDP", "QIP", "Workshop", "Webinar"];
    const s3PartOthers = ["Certification Programme", "MOOC", "Training Programme", "Refresher Course"];
    
    const s3Data = [
      ["Faculty Name", ...s3PresCols.map((c,i)=>i===0?"PRESENTATIONS":""), "TOTAL Pres.", ...s3PartCols.map((c,i)=>i===0?"PARTICIPATIONS":""), "Others", "TOTAL Part.", "Achievements", "TOTAL Contributions"],
      ["Faculty Name", ...s3PresCols, "TOTAL Pres.", ...s3PartCols, "Others", "TOTAL Part.", "Achievements", "TOTAL Contributions"]
    ];
    const s3Totals = new Array(s3PresCols.length + 1 + s3PartCols.length + 2 + 1 + 1).fill(0);
    
    activeFacNames.forEach((fac, fIdx) => {
      const row = [fac];
      let tIdx = 0, fPresTotal = 0, fPartTotal = 0;
      
      s3PresCols.forEach(col => {
        const val = presentations.filter(p => p.submittedByName === fac && p.role === col).length;
        row.push(val); s3Totals[tIdx++] += val; fPresTotal += val;
      });
      row.push(fPresTotal); s3Totals[tIdx++] += fPresTotal;
      
      s3PartCols.forEach(col => {
        const val = participations.filter(p => p.submittedByName === fac && p.programmeType === col).length;
        row.push(val); s3Totals[tIdx++] += val; fPartTotal += val;
      });
      const othersVal = participations.filter(p => p.submittedByName === fac && s3PartOthers.includes(p.programmeType)).length;
      row.push(othersVal); s3Totals[tIdx++] += othersVal; fPartTotal += othersVal;
      row.push(fPartTotal); s3Totals[tIdx++] += fPartTotal;
      
      const achVal = achievements.filter(a => a.submittedByName === fac).length;
      row.push(achVal); s3Totals[tIdx++] += achVal;
      
      // Calculate Total Contributions (Pubs + IPR + Pres + Part + Ach)
      const fPub = s2Data[fIdx + 2][mappedPubCols.length + 1]; // +2 for headers
      const fIpr = s2Data[fIdx + 2][mappedPubCols.length + 2 + iprCols.length];
      const totalCont = fPub + fIpr + fPresTotal + fPartTotal + achVal;
      row.push(totalCont); s3Totals[tIdx++] += totalCont;
      
      s3Data.push(row);
    });
    s3Data.push(["TOTAL", ...s3Totals]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s3Data), "Faculty Contributions");

    // ------------------------------------------
    // Sheet 4: SDG Research Impact
    // ------------------------------------------
    const sdgs = ["SDG-1", "SDG-2", "SDG-3", "SDG-4", "SDG-5", "SDG-6", "SDG-7", "SDG-8", "SDG-9", "SDG-10", "SDG-11", "SDG-12", "SDG-13", "SDG-14", "SDG-15", "SDG-16", "SDG-17"];
    const s4Data = [["SDG", "Description", "Publications Linked", "IPR Linked", "Total"]];
    const sdgDesc = ["No Poverty","Zero Hunger","Good Health and Well-being","Quality Education","Gender Equality","Clean Water and Sanitation","Affordable and Clean Energy","Decent Work and Economic Growth","Industry, Innovation and Infrastructure","Reduced Inequalities","Sustainable Cities and Communities","Responsible Consumption and Production","Climate Action","Life Below Water","Life on Land","Peace, Justice and Strong Institutions","Partnerships for the Goals"];
    
    sdgs.forEach((sdg, i) => {
      const pubL = publications.filter(p => p.sdgLinks?.includes(sdg)).length;
      const iprL = iprOutcomes.filter(x => x.sdgLinks?.includes(sdg)).length;
      s4Data.push([sdg, sdgDesc[i], pubL, iprL, pubL + iprL]);
    });
    
    let uPubL = 0, uIprL = 0;
    publications.forEach(p => { if (p.sdgLinks?.length > 0) uPubL++; });
    iprOutcomes.forEach(i => { if (i.sdgLinks?.length > 0) uIprL++; });
    s4Data.push(["Total Unique SDG-linked Outcomes", "", uPubL, uIprL, uPubL + uIprL]);
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s4Data), "SDG Research Impact");

    // ------------------------------------------
    // Sheet 5: FDP Month-wise
    // ------------------------------------------
    const s5Data = [["Month", ...partCols, "TOTAL"]];
    const s5Totals = new Array(partCols.length + 1).fill(0);
    monthOrder.forEach(m => {
      const row = [m];
      let rTotal = 0, tIdx = 0;
      partCols.forEach(col => {
        const val = participations.filter(p => p.month === m && p.programmeType === col).length;
        row.push(val); s5Totals[tIdx++] += val; rTotal += val;
      });
      row.push(rTotal); s5Totals[tIdx++] += rTotal;
      s5Data.push(row);
    });
    s5Data.push(["TOTAL", ...s5Totals]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s5Data), "FDP Month-wise");

    // ------------------------------------------
    // Sheet 6: FDP Faculty Leaderboard
    // ------------------------------------------
    const s6Cols = ["FDP", "QIP", "Workshop", "Webinar", "Certification Programme", "MOOC"];
    const s6Rows = activeFacNames.map(fac => {
      const row = { facName: fac, total: 0 };
      s6Cols.forEach(col => {
        const count = participations.filter(p => p.submittedByName === fac && p.programmeType === col).length;
        row[col] = count; row.total += count;
      });
      return row;
    }).sort((a,b) => b.total - a.total);
    
    const s6Data = [["Rank", "Faculty Name", ...s6Cols, "TOTAL"]];
    let currRank = 1, currTotal = -1;
    s6Rows.forEach((r, idx) => {
      if (r.total !== currTotal) { currRank = idx + 1; currTotal = r.total; }
      s6Data.push([currRank, r.facName, ...s6Cols.map(c => r[c]), r.total]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s6Data), "FDP Faculty Leaderboard");

    // ------------------------------------------
    // Sheet 7: Achievements
    // ------------------------------------------
    const s7Data = [["Faculty Name", "Achievement Type", "Event/Details", "Honour", "Level", "Month"]];
    const sortedAchs = [...achievements].sort((a,b) => {
      const mDiff = monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      if (mDiff !== 0) return mDiff;
      return (a.submittedByName||'').localeCompare(b.submittedByName||'');
    });
    sortedAchs.forEach(a => {
      s7Data.push([a.submittedByName, a.achievementType, a.eventName || a.description || '', a.honourReceived || '', a.level, a.month]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s7Data), "Achievements");

    // ------------------------------------------
    // Sheet 8: Projects
    // ------------------------------------------
    const s8Data = [["Faculty Name", "Project Type", "Title", "Funding Agency", "Amount Sanctioned", "Status", "Start Date"]];
    const sortedProjects = [...projects].sort((a,b) => {
      const mDiff = monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      if (mDiff !== 0 && a.month && b.month) return mDiff;
      return (a.submittedByName||'').localeCompare(b.submittedByName||'');
    });
    sortedProjects.forEach(p => {
      s8Data.push([p.submittedByName, p.projectType, p.title, p.fundingAgency, p.amountSanctioned || 0, p.projectStatus, p.startDate]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s8Data), "Projects");

    // ------------------------------------------
    // Sheet 9: Consultancy
    // ------------------------------------------
    const s9Data = [["Faculty Name", "Nature of Consultancy", "Title", "Organization", "Status", "Total Amount", "Amount Received"]];
    const sortedConsultancies = [...consultancies].sort((a,b) => {
      const mDiff = monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      if (mDiff !== 0 && a.month && b.month) return mDiff;
      return (a.submittedByName||'').localeCompare(b.submittedByName||'');
    });
    sortedConsultancies.forEach(c => {
      s9Data.push([c.submittedByName, c.natureOfConsultancy, c.title, c.orgName, c.projectStatus, c.totalAmount || 0, c.amountReceived || 0]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s9Data), "Consultancy");

    // ------------------------------------------
    // Sheet 10: Financial Incentives
    // ------------------------------------------
    const s10Data = [["Faculty Name", "Nature of Incentive", "Amount (₹)", "Date of Receipt", "Semester", "Approval Status"]];
    const sortedIncentives = [...incentives].sort((a,b) => {
      const mDiff = monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      if (mDiff !== 0 && a.month && b.month) return mDiff;
      return (a.submittedBy||'').localeCompare(b.submittedBy||'');
    });
    sortedIncentives.forEach(i => {
      s10Data.push([i.submittedBy, i.natureOfIncentive, i.amount || 0, i.dateOfReceipt, i.semester, i.proofAccepted]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s10Data), "Financial Incentives");

    // Export Workbook
    XLSX.writeFile(wb, `CS-BYC-Faculty-Contribution-Abstract-AY${selectedAY}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading contribution data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg shadow">
          <h3 className="font-bold">Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={refresh} className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isDataEmpty = !publications.length && !presentations.length && !iprOutcomes.length && !participations.length && !achievements.length;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-3 sm:py-0 gap-3">
            <div className="flex items-center gap-3">
              <Link
                to="/faculty-entry"
                className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate flex items-center gap-2">
                Faculty Contribution Abstract
                <select
                  value={selectedAY}
                  onChange={(e) => setSelectedAY(e.target.value)}
                  className="ml-2 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-1"
                >
                  {ACADEMIC_YEARS.map(ay => <option key={ay} value={ay}>{ay}</option>)}
                </select>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refresh}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="mr-1.5 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={exportToExcel}
                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to Excel
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Desktop & Mobile */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-200">
          <div className="sm:hidden py-2">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>{tab.label}</option>
              ))}
            </select>
          </div>
          <div className="hidden sm:block">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isDataEmpty ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">No contributions found for AY {selectedAY}.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === 'summary' && (
              <DeptSummaryTab
                publications={publications}
                presentations={presentations}
                iprOutcomes={iprOutcomes}
                participations={participations}
                achievements={achievements}
                projects={projects}
                consultancies={consultancies}
                incentives={incentives}
                monthOrder={monthOrder}
              />
            )}
            {activeTab === 'matrix' && (
              <FacultyMatrixTab
                activeFaculty={activeFaculty}
                publications={publications}
                presentations={presentations}
                iprOutcomes={iprOutcomes}
                participations={participations}
                achievements={achievements}
              />
            )}
            {activeTab === 'individual' && (
              <IndividualFacultyTab
                activeFaculty={activeFaculty}
                publications={publications}
                presentations={presentations}
                iprOutcomes={iprOutcomes}
                participations={participations}
                achievements={achievements}
                projects={projects}
                consultancies={consultancies}
                monthOrder={monthOrder}
                selectedAY={selectedAY}
              />
            )}
            {activeTab === 'sdg' && (
              <SDGResearchTab
                publications={publications}
                iprOutcomes={iprOutcomes}
                presentations={presentations}
              />
            )}
            {activeTab === 'fdp' && (
              <FDPParticipationTab
                participations={participations}
                activeFaculty={activeFaculty}
                monthOrder={monthOrder}
              />
            )}
            {activeTab === 'achievements' && (
              <AchievementsTab
                achievements={achievements}
                activeFaculty={activeFaculty}
                monthOrder={monthOrder}
              />
            )}
            {activeTab === 'proj_cons' && (
              <ProjectsConsultancyTab
                projects={projects}
                consultancies={consultancies}
                incentives={incentives}
                activeFaculty={activeFaculty}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
