import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, query, where, orderBy } from 'firebase/firestore';
import { getDocsEncrypted as getDocs, setDocEncrypted as setDoc, getDocEncrypted as getDoc } from '../firebase/encryptedStore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { hasCampusAccess } from '../utils/roleUtils';

const ISSUE_OPTIONS = [
  "Dress Code", 
  "Grooming", 
  "Late Coming", 
  "Mobile Usage", 
  "Confidential", 
  "Others"
];

const ELEVATED_ROLES = [
  'admin',
  'director', 
  'assocdirector', 
  'campusadmin',
  'dean', 
  'assocdean', 
  'hod', 
  'assochod', 
  'coordinator',
  'adminassist',
  'studentcounsellor'
];

export default function ManageDisciplinary() {
  const { user, userRoles, deptCode } = useAuth();
  const isCampus = hasCampusAccess(userRoles);
  
  const [regNoInput, setRegNoInput] = useState('');
  const [studentDetails, setStudentDetails] = useState(null);
  const [fetchingStudent, setFetchingStudent] = useState(false);
  
  const [issueType, setIssueType] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [confidentialDetails, setConfidentialDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const hasElevatedAccess = userRoles?.some(r => ELEVATED_ROLES.includes(r));

  const handleFetchStudent = async () => {
    if (!regNoInput.trim()) return;
    
    setFetchingStudent(true);
    setStudentDetails(null);
    setHistory([]);
    
    try {
      const docRef = doc(db, 'students', regNoInput.trim());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const student = docSnap.data();
        setStudentDetails(student);
        fetchHistory(student.regNo);
      } else {
        alert("Student not found. Please ensure the Reg No is correct.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch student details.");
    } finally {
      setFetchingStudent(false);
    }
  };

  const fetchHistory = async (regNo) => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'disciplinaryReports'),
        where('regNo', '==', regNo)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort locally by timestamp descending
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClear = () => {
    setRegNoInput('');
    setStudentDetails(null);
    setIssueType('');
    setAdditionalDetails('');
    setConfidentialDetails('');
    setHistory([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentDetails) {
      alert("Please fetch student details first.");
      return;
    }
    if (!issueType) {
      alert("Please select an Issue Report type.");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const reportId = `DR_${studentDetails.regNo}_${now.getTime()}`;
      
      const payload = {
        id: reportId,
        regNo: studentDetails.regNo || '',
        studentName: studentDetails.studentName || '',
        programme: studentDetails.programme || '',
        batch: studentDetails.batch || '',
        issueType: issueType || '',
        additionalDetails: additionalDetails || '',
        confidentialDetails: issueType === 'Confidential' ? (confidentialDetails || '') : '',
        reportedByEmail: user?.email || 'Unknown',
        timestamp: now.toISOString(),
      };

      await setDoc(doc(db, 'disciplinaryReports', reportId), payload);
      
      alert("Disciplinary report submitted successfully.");
      
      // Reset form but keep student fetched
      setIssueType('');
      setAdditionalDetails('');
      setConfidentialDetails('');
      
      // Refresh history
      fetchHistory(studentDetails.regNo);
    } catch (err) {
      console.error(err);
      alert("Failed to submit report: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    if (!hasElevatedAccess) {
      alert("You do not have permission to export disciplinary reports.");
      return;
    }
    
    try {
      const snap = await getDocs(collection(db, 'disciplinaryReports'));
      const allReports = snap.docs.map(doc => doc.data());
      
      // Sort descending by date
      allReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const sData = allReports.map(r => ({
        "Date & Time": new Date(r.timestamp).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
        "Reg No": r.regNo,
        "Student Name": r.studentName,
        "Programme": r.programme,
        "Batch": r.batch,
        "Issue Type": r.issueType,
        "Additional Details": r.additionalDetails || '-',
        "Confidential Details": r.confidentialDetails || '-',
        "Reported By": r.reportedByEmail
      }));

      const ws = XLSX.utils.json_to_sheet(sData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Disciplinary_Reports");
      XLSX.writeFile(wb, "Disciplinary_Reports_Export.xlsx");
      
    } catch (err) {
      console.error(err);
      alert("Failed to export reports.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="mb-2">
          <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 w-max">
            <span>&larr;</span> Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Disciplinary Report</h1>
            <p className="text-sm text-gray-500 mt-1">Report and track student disciplinary issues</p>
          </div>
          {hasElevatedAccess && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 shadow-sm flex items-center gap-2"
            >
              Export All Reports
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Fetch & Form */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Fetch Student */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Select Student</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={regNoInput}
                  onChange={(e) => setRegNoInput(e.target.value)}
                  placeholder="Enter Reg No"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchStudent()}
                />
                <button
                  onClick={handleFetchStudent}
                  disabled={fetchingStudent || !regNoInput.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {fetchingStudent ? 'Fetching...' : 'Fetch'}
                </button>
              </div>
            </div>

            {/* Reporting Form */}
            {studentDetails && (
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Submit New Report</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue Report *</label>
                    <select
                      required
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
                    >
                      <option value="">Select Issue Type</option>
                      {ISSUE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
                    <textarea
                      rows="3"
                      value={additionalDetails}
                      onChange={(e) => setAdditionalDetails(e.target.value)}
                      placeholder="Optional details..."
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
                    ></textarea>
                  </div>

                  {issueType === 'Confidential' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <label className="block text-sm font-medium text-red-800 mb-1">Confidential Details *</label>
                      <p className="text-xs text-red-600 mb-2">These details will only be visible to elevated roles (Director, Dean, HoD, Student Counsellor, etc.).</p>
                      <textarea
                        required
                        rows="4"
                        value={confidentialDetails}
                        onChange={(e) => setConfidentialDetails(e.target.value)}
                        placeholder="Enter sensitive information here..."
                        className="w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm py-2 px-3 border"
                      ></textarea>
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-md font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md font-medium text-sm hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  </div>

                </form>
              </div>
            )}

          </div>

          {/* Right Column: Details & History */}
          <div className="lg:col-span-2 space-y-6">
            
            {studentDetails ? (
              <>
                {/* Student Profile Card */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Student Profile</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                    <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Name</span> <p className="font-medium text-gray-900 mt-1">{studentDetails.studentName || '-'}</p></div>
                    <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Reg No</span> <p className="font-medium text-gray-900 mt-1">{studentDetails.regNo || '-'}</p></div>
                    <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Programme & Batch</span> <p className="font-medium text-gray-900 mt-1">{studentDetails.programme || '-'} ({studentDetails.batch || '-'})</p></div>
                    
                    <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Email</span> <p className="font-medium text-gray-900 mt-1 truncate" title={studentDetails.christEmail || studentDetails.personalEmail}>{studentDetails.christEmail || studentDetails.personalEmail || '-'}</p></div>
                    <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Mobile</span> <p className="font-medium text-gray-900 mt-1">{studentDetails.mobile || '-'}</p></div>
                    
                    <div className="col-span-2 md:col-span-3 border-t pt-4 mt-2"></div>
                    <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Parent Mobile</span> <p className="font-medium text-gray-900 mt-1">{studentDetails.parentMobile || '-'}</p></div>
                    <div className="col-span-2"><span className="text-gray-500 block text-xs uppercase tracking-wider">Parent Email</span> <p className="font-medium text-gray-900 mt-1 truncate">{studentDetails.parentEmail || '-'}</p></div>
                  </div>
                </div>

                {/* History Table */}
                <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800">Disciplinary History</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-xs border-b">
                        <tr>
                          <th className="px-4 py-3">Date & Time</th>
                          <th className="px-4 py-3">Issue Type</th>
                          <th className="px-4 py-3">Details</th>
                          <th className="px-4 py-3">Reported By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingHistory ? (
                          <tr><td colSpan="4" className="text-center py-8 text-gray-500">Loading history...</td></tr>
                        ) : history.length === 0 ? (
                          <tr><td colSpan="4" className="text-center py-8 text-gray-500">No disciplinary records found.</td></tr>
                        ) : (
                          history.map(item => {
                            const isConfidential = item.issueType === 'Confidential';
                            const showConfidential = isConfidential && hasElevatedAccess;
                            const isOwnReport = item.reportedByEmail === user?.email;
                            
                            // Let the reporter see their own confidential notes, plus elevated roles
                            const canViewConfidential = showConfidential || isOwnReport;

                            return (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                  {new Date(item.timestamp).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    isConfidential ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {item.issueType}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {isConfidential ? (
                                    canViewConfidential ? (
                                      <div className="text-red-700 text-xs font-medium">
                                        [Confidential] {item.confidentialDetails}
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 italic text-xs">
                                        Hidden (Restricted Access)
                                      </div>
                                    )
                                  ) : (
                                    <span className="text-gray-700">{item.additionalDetails || '-'}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]" title={item.reportedByEmail}>
                                  {item.reportedByEmail}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-12 rounded-lg shadow border border-gray-200 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Student Selected</h3>
                <p className="text-gray-500 max-w-sm">Enter a Register Number on the left and click "Fetch" to view their profile and disciplinary history.</p>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
