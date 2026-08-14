import React from 'react';

export default function ViewPhDModal({ isOpen, onClose, viewData }) {
  if (!isOpen || !viewData) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{viewData.scholarName}</h3>
                <p className="text-sm text-indigo-600 font-medium mt-1">
                  {viewData.registerNumber} &bull; Enrolled: {viewData.dateOfJoining || 'N/A'}
                </p>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                viewData.status === 'Completed' || viewData.status === 'Awarded' ? 'bg-green-100 text-green-800' :
                viewData.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                viewData.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {viewData.status || 'Ongoing'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 text-sm">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 border-b pb-1">Research Details</h4>
                <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Domain</span> <p className="font-medium text-gray-900">{viewData.domain || '-'}</p></div>
                <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Supervisor</span> <p className="font-medium text-gray-900">{viewData.supervisorName || '-'}</p></div>
                <div><span className="text-gray-500 block text-xs uppercase tracking-wider">Co-Supervisor</span> <p className="font-medium text-gray-900">{viewData.coSupervisor || '-'}</p></div>
                <div><span className="text-gray-500 block text-xs uppercase tracking-wider">RAC Members</span> <p className="font-medium text-gray-900">{viewData.racMembers || '-'}</p></div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 border-b pb-1">RAC Meetings Track Record</h4>
                {(!viewData.racMeetings || viewData.racMeetings.length === 0) ? (
                  <p className="text-gray-500 text-xs italic">No RAC meetings have been recorded yet.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {viewData.racMeetings.map((mtg, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="block text-xs font-bold text-indigo-700">{mtg.date}</span>
                          {mtg.nextMeetingDate && <span className="text-xs text-gray-500">Next: {mtg.nextMeetingDate}</span>}
                        </div>
                        <span className="block text-sm text-gray-800 font-medium">{mtg.presentationTitle || 'Untitled Presentation'}</span>
                        {mtg.remarks && <span className="block text-xs text-gray-600 mt-1 italic">"{mtg.remarks}"</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
