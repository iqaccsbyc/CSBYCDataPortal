import StatusBadge from './StatusBadge'

function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTs(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3 pb-1.5 border-b border-indigo-100">
        {title}
      </h4>
      <dl className="space-y-0">{children}</dl>
    </div>
  )
}

function Row({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="grid grid-cols-5 gap-2 py-2 border-b border-gray-50 last:border-0">
      <dt className="col-span-2 text-sm text-gray-500">{label}</dt>
      <dd className="col-span-3 text-sm text-gray-800 whitespace-pre-wrap break-words">{String(value)}</dd>
    </div>
  )
}

function RowTags({ label, items }) {
  if (!items?.length) return null
  return (
    <div className="grid grid-cols-5 gap-2 py-2 border-b border-gray-50 last:border-0">
      <dt className="col-span-2 text-sm text-gray-500">{label}</dt>
      <dd className="col-span-3 flex flex-wrap gap-1">
        {items.map(i => (
          <span key={i} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {i}
          </span>
        ))}
      </dd>
    </div>
  )
}

function RowLink({ label, url }) {
  if (!url) return null
  const urls = Array.isArray(url) ? url : [url]
  const validUrls = urls.filter(u => !!u)
  if (validUrls.length === 0) return null

  return (
    <div className="grid grid-cols-5 gap-2 py-2 border-b border-gray-50 last:border-0">
      <dt className="col-span-2 text-sm text-gray-500">{label}</dt>
      <dd className="col-span-3 flex flex-col gap-2">
        {validUrls.map((u, i) => (
          <a
            key={i}
            href={u}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 w-fit"
          >
            View File {validUrls.length > 1 ? i + 1 : ''}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </dd>
    </div>
  )
}

export default function ActivityDetailView({ activity, onClose }) {
  if (!activity) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{activity.eventName}</h2>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <StatusBadge status={activity.status} />
              {activity.month && (
                <span className="text-xs text-gray-500">{activity.month} · {activity.academicYear}</span>
              )}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 text-xl font-light transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[72vh]">
          <Section title="Stage 1 — Event Details">
            <Row label="Event Name"   value={activity.eventName} />
            <Row label="Start Date"   value={formatDate(activity.startDate)} />
            <Row label="End Date"     value={formatDate(activity.endDate)} />
            <Row label="No. of Days"  value={activity.noOfDays} />
            <Row label="Month"        value={activity.month} />
            <Row label="Academic Year" value={activity.academicYear} />
            <Row label="Event Type"   value={activity.eventType} />
            <Row label="Mode"         value={activity.physicalOnline} />
            <Row label="Venue"        value={activity.venue} />
          </Section>

          <Section title="People">
            <Row label="Organizers"          value={(activity.organizers || []).join(', ')} />
            <Row label="Data Entry By"       value={activity.dataEntryEmail} />
            <Row label="Resource Persons"    value={activity.resourcePersons} />
            <Row label="Resource Category"   value={activity.resourceCategory} />
          </Section>

          <Section title="Classification">
            <RowTags label="SDG Links"         items={activity.sdgLinks} />
            <Row     label="Focus Area"        value={activity.focusArea} />
            <Row     label="Priority Area"     value={activity.priorityArea} />
            <Row     label="NAAC Criteria"     value={activity.naacCriteria} />
            <Row     label="AQAR Criteria"     value={activity.aqarCriteria} />
          </Section>

          <Section title="Participants">
            <Row label="Total"            value={activity.totalParticipants} />
            <Row label="CHRIST Students"  value={activity.christStudents} />
            <Row label="CHRIST Faculty"   value={activity.christFaculty} />
            <Row label="Outside Students" value={activity.outsideStudents} />
            <Row label="Outside Faculty"  value={activity.outsideFaculty} />
          </Section>

          {activity.status === 'completed' && (
            <>
              <Section title="Stage 2 — Documentation">
                <Row     label="Event Brief"    value={activity.eventBrief} />
                <RowLink label="Photos"         url={activity.photosDriveLink} />
                <RowLink label="Event Report"   url={activity.reportDriveLink} />
                <RowLink label="NFA"            url={activity.nfaDriveLink || activity.nfaBillsDriveLink} />
                <RowLink label="Bills"          url={activity.billsDriveLink || activity.nfaBillsDriveLink} />
                <RowLink label="Event Poster"   url={activity.posterDriveLink} />
              </Section>

              <Section title="Financials">
                <Row label="Funding Source"      value={activity.funding} />
                <Row label="Approved Amount"     value={activity.approvedAmount != null ? `₹${activity.approvedAmount}` : undefined} />
                <Row label="Actual Spent"        value={activity.actualSpent    != null ? `₹${activity.actualSpent}`    : undefined} />
                <Row label="Bills Submitted"     value={formatDate(activity.billsSubmittedDate)} />
              </Section>
            </>
          )}

          <Section title="Audit Trail">
            <Row label="Created By"   value={activity.createdBy} />
            <Row label="Created At"   value={formatTs(activity.createdAt)} />
            <Row label="Completed By" value={activity.completedBy} />
            <Row label="Completed At" value={formatTs(activity.completedAt)} />
            
            {activity.revisionHistory?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <h5 className="text-xs font-semibold text-gray-500 mb-2">Revision History</h5>
                <div className="space-y-3 pl-3 border-l-2 border-amber-200">
                  {activity.revisionHistory.map((rev, i) => (
                    <div key={i} className="text-sm">
                      <p className="text-gray-800 bg-amber-50 p-2 rounded border border-amber-100 inline-block w-full">{rev.note}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Requested by {rev.by} on {new Date(rev.at).toLocaleString('en-GB')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
