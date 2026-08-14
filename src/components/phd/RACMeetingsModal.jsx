import DateInput from '../../components/DateInput'
import React, { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { updateDocEncrypted as updateDoc } from '../../firebase/encryptedStore';
import { db } from '../../firebase/config';

export default function RACMeetingsModal({ isOpen, onClose, scholar, onSaveSuccess }) {
  const [meetings, setMeetings] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ date: '', presentationTitle: '', remarks: '', nextMeetingDate: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && scholar) {
      setMeetings(scholar.racMeetings || []);
      setIsAdding(false);
      setNewMeeting({ date: '', presentationTitle: '', remarks: '', nextMeetingDate: '' });
    }
  }, [isOpen, scholar]);

  if (!isOpen || !scholar) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMeeting(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveMeeting = async () => {
    if (!newMeeting.date) {
      alert("Meeting date is required.");
      return;
    }
    setIsSaving(true);
    try {
      const updatedMeetings = [...meetings, newMeeting];
      const docRef = doc(db, 'phdscholars', scholar.id);
      await updateDoc(docRef, { racMeetings: updatedMeetings });
      setMeetings(updatedMeetings);
      setIsAdding(false);
      setNewMeeting({ date: '', presentationTitle: '', remarks: '', nextMeetingDate: '' });
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error("Error saving RAC meeting: ", error);
      alert("Failed to save RAC meeting.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg leading-6 font-bold text-gray-900">
                RAC Meetings - {scholar.scholarName} ({scholar.registerNumber})
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-gray-700">Past Meetings</h4>
                {!isAdding && (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-100 font-medium"
                  >
                    + Record New Meeting
                  </button>
                )}
              </div>

              {meetings.length === 0 && !isAdding ? (
                <p className="text-sm text-gray-500 italic py-4 text-center bg-gray-50 rounded border border-gray-100">No RAC meetings recorded yet.</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {meetings.map((meeting, idx) => (
                    <div key={idx} className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex justify-between mb-2">
                        <span className="font-bold text-indigo-700">Meeting Date: {meeting.date}</span>
                        {meeting.nextMeetingDate && (
                          <span className="text-sm text-gray-500">Next Due: {meeting.nextMeetingDate}</span>
                        )}
                      </div>
                      <div className="mb-2">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block">Presentation Title</span>
                        <p className="text-sm text-gray-800">{meeting.presentationTitle || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block">Remarks / Status</span>
                        <p className="text-sm text-gray-800">{meeting.remarks || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAdding && (
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mt-4">
                <h4 className="font-bold text-indigo-900 mb-3 text-sm">New RAC Meeting Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Meeting Date *</label>
                    <DateInput  name="date" value={newMeeting.date} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Next Meeting Date (Tentative)</label>
                    <DateInput  name="nextMeetingDate" value={newMeeting.nextMeetingDate} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700">Presentation Title</label>
                    <input type="text" name="presentationTitle" value={newMeeting.presentationTitle} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700">Remarks</label>
                    <textarea rows="2" name="remarks" value={newMeeting.remarks} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"></textarea>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveMeeting}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Meeting'}
                  </button>
                </div>
              </div>
            )}

          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            <button type="button" onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:ml-3 sm:w-auto sm:text-sm">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
