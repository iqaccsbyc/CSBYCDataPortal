import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, deleteDoc, query, where } from 'firebase/firestore';
import { getDocsEncrypted as getDocs, setDocEncrypted as setDoc } from '../firebase/encryptedStore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { hasCampusAccess } from '../utils/roleUtils';
import * as XLSX from 'xlsx';

const INITIAL_FORM_STATE = {
  classCode: '',
  className: '',
  departmentCode: '',
  programme: '',
  level: 'UG',
  semester: '',
  batch: '',
  regNoPrefix: '',
  regNoStart: '01',
  regNoEnd: '60',
  studentsAdmitted: '',
  isActive: 'Yes',
  classTeacherId: '',
  classTeacherName: '',
  classTeacherMobile: '',
  classTeacherEmail: '',
  batchCounsellorId: '',
  batchCounsellorName: '',
  batchCounsellorMobile: '',
  batchCounsellorEmail: '',
  cr1RegNo: '', cr1Name: '', cr1Mobile: '', cr1Email: '',
  cr2RegNo: '', cr2Name: '', cr2Mobile: '', cr2Email: '',
  pr1RegNo: '', pr1Name: '', pr1Mobile: '', pr1Email: '',
  pr2RegNo: '', pr2Name: '', pr2Mobile: '', pr2Email: '',
  remarks: ''
};

export default function ManageClasses() {
  const { userRoles, deptCode } = useAuth();
  const isCampus = hasCampusAccess(userRoles);
  const [classes, setClasses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [viewData, setViewData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [filterDept, setFilterDept] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const canEdit = userRoles?.some(r => ['admin', 'hod', 'assochod', 'coordinator', 'adminassist'].includes(r)) || isCampus;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [clsSnap, facSnap, deptSnap, progSnap] = await Promise.all([
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'faculty')),
        getDocs(collection(db, 'departments')),
        getDocs(collection(db, 'programmes'))
      ]);

      setClasses(clsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFaculty(facSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setProgrammes(progSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      alert('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSemester = (prefix, level) => {
    if (!prefix || prefix.length < 2) return '';
    const yearStr = prefix.substring(0, 2);
    const batchStartYear = parseInt(`20${yearStr}`);
    if (isNaN(batchStartYear)) return '';
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const yearsElapsed = currentYear - batchStartYear;
    
    if (yearsElapsed < 0) return '';
    
    const baseOddSem = yearsElapsed * 2 + 1;
    const isOdd = currentMonth >= 5 && currentMonth <= 11;
    const semNum = isOdd ? baseOddSem : baseOddSem + 1;
    const maxSem = level === 'PG' ? 4 : 8;
    
    if (semNum > 0 && semNum <= maxSem) {
      return `Semester ${semNum} (${isOdd ? 'ODD' : 'EVEN'})`;
    }
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      
      if (name === 'regNoPrefix' || name === 'level') {
        const prefix = name === 'regNoPrefix' ? value : prev.regNoPrefix;
        const level = name === 'level' ? value : prev.level;
        
        if (prefix.length >= 2) {
          const yearStr = prefix.substring(0, 2);
          const year = parseInt(yearStr, 10);
          if (!isNaN(year)) {
            next.batch = `20${yearStr}-${(year + 1).toString().padStart(2, '0')}`;
            next.semester = calculateSemester(prefix, level);
          }
          if (name === 'regNoPrefix') next.classCode = prefix;
        }
      }
      return next;
    });
  };

  const handleTeacherSearch = (e) => {
    const val = e.target.value;
    handleInputChange(e);
    const found = faculty.find(f => f.facName.toLowerCase() === val.toLowerCase() && (!formData.departmentCode || f.deptCode === formData.departmentCode));
    if (found) {
      setFormData(prev => ({ ...prev, classTeacherId: found.facId, classTeacherMobile: found.facMob || '', classTeacherEmail: found.facEmail || '' }));
    }
  };

  const handleCounsellorSearch = (e) => {
    const val = e.target.value;
    handleInputChange(e);
    const found = faculty.find(f => f.facName.toLowerCase() === val.toLowerCase());
    if (found) {
      setFormData(prev => ({ ...prev, batchCounsellorId: found.facId, batchCounsellorMobile: found.facMob || '', batchCounsellorEmail: found.facEmail || '' }));
    }
  };

  const handleStudentSearch = async (name, regNo) => {
    if (regNo.length >= 5) {
      try {
        const q = query(collection(db, 'students'), where('regNo', '==', regNo));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const student = snap.docs[0].data();
          const baseName = name.replace('RegNo', '');
          setFormData(prev => ({
            ...prev,
            [baseName + 'Name']: student.studentName || '',
            [baseName + 'Mobile']: student.mobile || '',
            [baseName + 'Email']: student.christEmail || student.personalEmail || ''
          }));
        }
      } catch (err) {
         console.error(err);
      }
    }
  };

  const openViewModal = async (cls) => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'students'), 
        where('regNo', '>=', `${cls.classCode}00`), 
        where('regNo', '<=', `${cls.classCode}99`)
      );
      const snap = await getDocs(q);
      const students = snap.docs.map(d => d.data());
      const onRoll = students.filter(s => s.Status === 'Onroll' || s.onroll === 'Yes').length;
      const completed = students.filter(s => s.Status === 'Completed').length;
      
      setViewData({ ...cls, studentsOnRoll: onRoll, studentsCompleted: completed });
      setIsViewModalOpen(true);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch class details');
    } finally {
      setIsLoading(false);
    }
  };

  const saveClass = async (e) => {
    e.preventDefault();
    if (!formData.classCode || !formData.className) return alert('Class Code and Name required');
    try {
      await setDoc(doc(db, 'classes', formData.classCode), formData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to save');
    }
  };

  const deleteClass = async (code) => {
    if (window.confirm('Delete this class?')) {
      await deleteDoc(doc(db, 'classes', code));
      fetchData();
    }
  };

  const exportExcel = () => {
    const dataToExport = filteredClasses.map(c => ({
      "Class Code": c.classCode,
      "Class Name": c.className,
      "Department": departments.find(d => d.id === c.departmentCode)?.deptName || c.departmentCode,
      "Programme": c.programme,
      "Level": c.level,
      "Semester": c.semester,
      "Batch": c.batch,
      "Reg No Range": `${c.regNoPrefix}${c.regNoStart} - ${c.regNoPrefix}${c.regNoEnd}`,
      "Students Admitted": c.studentsAdmitted,
      "Active": c.isActive,
      "Class Teacher": c.classTeacherName,
      "Class Teacher Mobile": c.classTeacherMobile,
      "Class Teacher Email": c.classTeacherEmail,
      "Batch Counsellor": c.batchCounsellorName,
      "Batch Counsellor Mobile": c.batchCounsellorMobile,
      "Batch Counsellor Email": c.batchCounsellorEmail,
      "CR 1 Reg No": c.cr1RegNo, "CR 1 Name": c.cr1Name, "CR 1 Mobile": c.cr1Mobile, "CR 1 Email": c.cr1Email,
      "CR 2 Reg No": c.cr2RegNo, "CR 2 Name": c.cr2Name, "CR 2 Mobile": c.cr2Mobile, "CR 2 Email": c.cr2Email,
      "PR 1 Reg No": c.pr1RegNo, "PR 1 Name": c.pr1Name, "PR 1 Mobile": c.pr1Mobile, "PR 1 Email": c.pr1Email,
      "PR 2 Reg No": c.pr2RegNo, "PR 2 Name": c.pr2Name, "PR 2 Mobile": c.pr2Mobile, "PR 2 Email": c.pr2Email,
      "Remarks": c.remarks
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classes");
    XLSX.writeFile(wb, "Classes.xlsx");
  };

  const filteredClasses = classes.filter(c => {
    if (filterDept !== 'all' && c.departmentCode !== filterDept) return false;
    if (searchQuery && !c.className.toLowerCase().includes(searchQuery.toLowerCase()) && !c.classCode.includes(searchQuery)) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow">
        <div>
          <h1 className="text-2xl font-bold">Manage Classes</h1>
        </div>
        <div className="flex gap-2">
          {canEdit && <button onClick={() => { setFormData(INITIAL_FORM_STATE); setIsEditing(false); setIsModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded">Add Class</button>}
          <button onClick={exportExcel} className="px-4 py-2 bg-gray-100 border rounded">Export</button>
        </div>
      </div>

      <div className="flex gap-4 bg-white p-4 rounded shadow">
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="border p-2 rounded">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.deptName}</option>)}
        </select>
        <input type="text" placeholder="Search class..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="border p-2 rounded flex-1" />
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Name</th>
              <th className="p-3">Dept</th>
              <th className="p-3">Programme</th>
              <th className="p-3">Batch</th>
              <th className="p-3">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClasses.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{c.classCode}</td>
                <td className="p-3">{c.className}</td>
                <td className="p-3">{departments.find(d => d.id === c.departmentCode)?.deptName || c.departmentCode}</td>
                <td className="p-3">{c.programme}</td>
                <td className="p-3">{c.batch}</td>
                <td className="p-3">{c.isActive}</td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => openViewModal(c)} className="text-blue-600">View</button>
                  {canEdit && <button onClick={() => { setFormData(c); setIsEditing(true); setIsModalOpen(true); }} className="text-indigo-600">Edit</button>}
                  {canEdit && <button onClick={() => deleteClass(c.id)} className="text-red-600">Del</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit' : 'Add'} Class</h2>
            <form onSubmit={saveClass} className="grid grid-cols-2 gap-4">
              <div><label>Reg No Prefix (Class Code)</label><input required name="regNoPrefix" value={formData.regNoPrefix} onChange={handleInputChange} className="w-full border p-2 rounded" disabled={isEditing} /></div>
              <div><label>Class Name</label><input required name="className" value={formData.className} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
              <div><label>Department</label>
                <select name="departmentCode" value={formData.departmentCode} onChange={handleInputChange} className="w-full border p-2 rounded">
                  <option value="">Select Dept</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.deptName || d.id}</option>)}
                </select>
              </div>
              <div><label>Programme</label>
                <select name="programme" value={formData.programme} onChange={handleInputChange} className="w-full border p-2 rounded">
                  <option value="">Select Prog</option>
                  {programmes.filter(p => !formData.departmentCode || p.departmentCode === formData.departmentCode).map(p => <option key={p.id} value={p.id}>{p.ProgrammeName}</option>)}
                </select>
              </div>
              <div><label>Level</label>
                <select name="level" value={formData.level} onChange={handleInputChange} className="w-full border p-2 rounded">
                  <option value="UG">UG</option><option value="PG">PG</option>
                </select>
              </div>
              <div><label>Semester</label>
                <select name="semester" value={formData.semester} onChange={handleInputChange} className="w-full border p-2 rounded">
                  <option value="">Select</option>
                  {Array.from({length: formData.level === 'PG' ? 4 : 8}).map((_, i) => (
                    <option key={i} value={`Semester ${i+1} (${(i+1)%2?'ODD':'EVEN'})`}>{`Semester ${i+1} (${(i+1)%2?'ODD':'EVEN'})`}</option>
                  ))}
                </select>
              </div>
              <div><label>Batch</label><input name="batch" value={formData.batch} onChange={handleInputChange} className="w-full border p-2 rounded bg-gray-50" readOnly /></div>
              <div><label>Students Admitted (Initial)</label><input type="number" name="studentsAdmitted" value={formData.studentsAdmitted} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
              <div>
                <label>Class Teacher Name</label>
                <input name="classTeacherName" value={formData.classTeacherName} onChange={handleTeacherSearch} list="facultylist" className="w-full border p-2 rounded" />
                {(formData.classTeacherMobile || formData.classTeacherEmail) && (
                  <div className="text-xs text-gray-500 mt-1">{formData.classTeacherMobile} | {formData.classTeacherEmail}</div>
                )}
              </div>
              <div>
                <label>Batch Counsellor Name</label>
                <input name="batchCounsellorName" value={formData.batchCounsellorName} onChange={handleCounsellorSearch} list="counsellorlist" className="w-full border p-2 rounded" />
                {(formData.batchCounsellorMobile || formData.batchCounsellorEmail) && (
                  <div className="text-xs text-gray-500 mt-1">{formData.batchCounsellorMobile} | {formData.batchCounsellorEmail}</div>
                )}
              </div>
              
              <div className="col-span-2 grid grid-cols-2 gap-4 mt-4 border-t pt-4">
                <div><label>CR 1 Reg No</label><input name="cr1RegNo" value={formData.cr1RegNo} onChange={e => { handleInputChange(e); handleStudentSearch('cr1RegNo', e.target.value); }} className="w-full border p-2 rounded" /></div>
                <div>
                  <label>CR 1 Name</label>
                  <input readOnly value={formData.cr1Name} className="w-full border p-2 rounded bg-gray-50" />
                  {(formData.cr1Mobile || formData.cr1Email) && <div className="text-xs text-gray-500 mt-1">{formData.cr1Mobile} | {formData.cr1Email}</div>}
                </div>
                <div><label>CR 2 Reg No</label><input name="cr2RegNo" value={formData.cr2RegNo} onChange={e => { handleInputChange(e); handleStudentSearch('cr2RegNo', e.target.value); }} className="w-full border p-2 rounded" /></div>
                <div>
                  <label>CR 2 Name</label>
                  <input readOnly value={formData.cr2Name} className="w-full border p-2 rounded bg-gray-50" />
                  {(formData.cr2Mobile || formData.cr2Email) && <div className="text-xs text-gray-500 mt-1">{formData.cr2Mobile} | {formData.cr2Email}</div>}
                </div>
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-4 mt-4 border-t pt-4">
                <div><label>PR 1 Reg No</label><input name="pr1RegNo" value={formData.pr1RegNo} onChange={e => { handleInputChange(e); handleStudentSearch('pr1RegNo', e.target.value); }} className="w-full border p-2 rounded" /></div>
                <div>
                  <label>PR 1 Name</label>
                  <input readOnly value={formData.pr1Name} className="w-full border p-2 rounded bg-gray-50" />
                  {(formData.pr1Mobile || formData.pr1Email) && <div className="text-xs text-gray-500 mt-1">{formData.pr1Mobile} | {formData.pr1Email}</div>}
                </div>
                <div><label>PR 2 Reg No</label><input name="pr2RegNo" value={formData.pr2RegNo} onChange={e => { handleInputChange(e); handleStudentSearch('pr2RegNo', e.target.value); }} className="w-full border p-2 rounded" /></div>
                <div>
                  <label>PR 2 Name</label>
                  <input readOnly value={formData.pr2Name} className="w-full border p-2 rounded bg-gray-50" />
                  {(formData.pr2Mobile || formData.pr2Email) && <div className="text-xs text-gray-500 mt-1">{formData.pr2Mobile} | {formData.pr2Email}</div>}
                </div>
              </div>
              
              <div className="col-span-2">
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Save</button>
                </div>
              </div>
            </form>
            <datalist id="facultylist">
              {faculty.filter(f => !formData.departmentCode || f.deptCode === formData.departmentCode).map(f => <option key={f.id} value={f.facName} />)}
            </datalist>
            <datalist id="counsellorlist">
              {faculty.filter(f => (f.roles || []).includes('studentcounsellor')).map(f => <option key={f.id} value={f.facName} />)}
            </datalist>
          </div>
        </div>
      )}

      {isViewModalOpen && viewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6">
            <h2 className="text-xl font-bold mb-4">{viewData.className} ({viewData.classCode})</h2>
            <div className="grid grid-cols-2 gap-y-4">
              <div><strong>Programme:</strong> {viewData.programme}</div>
              <div><strong>Semester:</strong> {viewData.semester}</div>
              <div><strong>Batch:</strong> {viewData.batch}</div>
              <div><strong>Status:</strong> {viewData.isActive}</div>
              <div><strong>Students Admitted:</strong> {viewData.studentsAdmitted}</div>
              <div><strong>Students On Roll:</strong> {viewData.studentsOnRoll}</div>
              <div><strong>Students Completed:</strong> {viewData.studentsCompleted}</div>
              <div className="col-span-2 border-t pt-2 mt-2">
                <strong>Class Teacher:</strong> {viewData.classTeacherName} {viewData.classTeacherName && `(${viewData.classTeacherMobile || '-'}, ${viewData.classTeacherEmail || '-'})`}
              </div>
              <div className="col-span-2 border-t pt-2 mt-2">
                <strong>Batch Counsellor:</strong> {viewData.batchCounsellorName} {viewData.batchCounsellorName && `(${viewData.batchCounsellorMobile || '-'}, ${viewData.batchCounsellorEmail || '-'})`}
              </div>
              
              <div className="col-span-2 border-t pt-2 mt-2">
                <strong>Class Representatives:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {viewData.cr1Name && <li>{viewData.cr1Name} ({viewData.cr1RegNo}) - {viewData.cr1Mobile || '-'} / {viewData.cr1Email || '-'}</li>}
                  {viewData.cr2Name && <li>{viewData.cr2Name} ({viewData.cr2RegNo}) - {viewData.cr2Mobile || '-'} / {viewData.cr2Email || '-'}</li>}
                  {!viewData.cr1Name && !viewData.cr2Name && <li className="text-gray-500">Not assigned</li>}
                </ul>
              </div>

              <div className="col-span-2 border-t pt-2 mt-2">
                <strong>Placement Representatives:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {viewData.pr1Name && <li>{viewData.pr1Name} ({viewData.pr1RegNo}) - {viewData.pr1Mobile || '-'} / {viewData.pr1Email || '-'}</li>}
                  {viewData.pr2Name && <li>{viewData.pr2Name} ({viewData.pr2RegNo}) - {viewData.pr2Mobile || '-'} / {viewData.pr2Email || '-'}</li>}
                  {!viewData.pr1Name && !viewData.pr2Name && <li className="text-gray-500">Not assigned</li>}
                </ul>
              </div>

              {viewData.remarks && (
                <div className="col-span-2 border-t pt-2 mt-2">
                  <strong>Remarks:</strong>
                  <p className="text-sm text-gray-600 mt-1">{viewData.remarks}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
