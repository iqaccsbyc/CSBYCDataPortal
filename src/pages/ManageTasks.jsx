import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import TaskFormModal from '../components/TaskFormModal'
import TaskRespondModal from '../components/TaskRespondModal'
import TaskCompleteModal from '../components/TaskCompleteModal'

const CREATOR_ROLES = [
  'admin','director','assocdirector','campusadmin','dean','assocdean',
  'campusiqaccoordinator','campusiqaccoreteam','deansoffice',
  'hod','assochod','coordinator'
]

export default function ManageTasks() {
  const { user, userRoles } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Initiated') // 'Initiated', 'Received', 'Completed'
  const [searchTerm, setSearchTerm] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [respondTask, setRespondTask] = useState(null)
  const [completeTask, setCompleteTask] = useState(null)
  const [expandedTasks, setExpandedTasks] = useState(new Set())

  const toggleExpand = (id) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const canCreateTask = userRoles?.some(role => CREATOR_ROLES.includes(role))

  const tabCounts = {
    'Initiated': tasks.filter(t => t.initiatorEmail === user.email && t.status !== 'Completed').length,
    'Received': tasks.filter(t => t.assignedToEmail === user.email && t.status !== 'Completed').length,
    'Completed': tasks.filter(t => t.status === 'Completed').length
  }

  useEffect(() => {
    if (!user?.email) return

    const tasksRef = collection(db, 'tasks')
    
    // We fetch tasks where the user is either the initiator or the assignee
    const q1 = query(tasksRef, where('initiatorEmail', '==', user.email))
    const q2 = query(tasksRef, where('assignedToEmail', '==', user.email))

    let tasksMap = new Map()

    const updateTasks = () => {
      setTasks(Array.from(tasksMap.values()).sort((a, b) => {
        // Sort by dueDate primarily, or creation date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate)
        }
        return 0
      }))
    }

    const unsub1 = onSnapshot(q1, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'removed') {
          tasksMap.delete(change.doc.id)
        } else {
          tasksMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() })
        }
      })
      updateTasks()
      setLoading(false)
    })

    const unsub2 = onSnapshot(q2, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'removed') {
          tasksMap.delete(change.doc.id)
        } else {
          tasksMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() })
        }
      })
      updateTasks()
      setLoading(false) // just in case q1 is empty
    })

    return () => {
      unsub1()
      unsub2()
    }
  }, [user?.email])

  const handleCreateTask = async (formData) => {
    try {
      const { assignedToEmails, ...restData } = formData
      
      const promises = assignedToEmails.map(email => 
        addDoc(collection(db, 'tasks'), {
          ...restData,
          assignedToEmail: email,
          initiatorEmail: user.email,
          initiatorRole: userRoles?.[0] || 'Unknown',
          status: 'Pending',
          createdAt: new Date().toISOString()
        })
      )
      
      await Promise.all(promises)
      setIsFormOpen(false)
    } catch (err) {
      console.error('Error creating task:', err)
      alert('Failed to create task')
    }
  }

  const handleRespondTask = async (taskId, response) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        recipientResponse: response,
        status: 'Responded',
        respondedAt: new Date().toISOString()
      })
      setRespondTask(null)
    } catch (err) {
      console.error('Error responding to task:', err)
      alert('Failed to submit response')
    }
  }

  const handleCompleteTask = async (taskId, completionNote) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        completionNote,
        status: 'Completed',
        completedDate: new Date().toISOString()
      })
      setCompleteTask(null)
    } catch (err) {
      console.error('Error completing task:', err)
      alert('Failed to complete task')
    }
  }

  const handleExport = () => {
    if (filteredTasks.length === 0) return
    const headers = ['Title', 'Description', 'Assigned To', 'Due Date', 'Priority', 'Status', 'Response', 'Completion Note']
    const csvData = filteredTasks.map(t => [
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.assignedToEmail || '').replace(/"/g, '""')}"`,
      t.dueDate || '',
      t.priority || '',
      t.status || '',
      `"${(t.recipientResponse || '').replace(/"/g, '""')}"`,
      `"${(t.completionNote || '').replace(/"/g, '""')}"`
    ])
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', `tasks_${activeTab.toLowerCase()}.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const filteredTasks = tasks.filter(t => {
    // Tab filtering
    if (activeTab === 'Initiated') {
      if (t.initiatorEmail !== user.email || t.status === 'Completed') return false
    } else if (activeTab === 'Received') {
      if (t.assignedToEmail !== user.email || t.status === 'Completed') return false
    } else if (activeTab === 'Completed') {
      if (t.status !== 'Completed') return false
    }

    // Search filtering
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (!t.title?.toLowerCase().includes(term) && !t.description?.toLowerCase().includes(term)) {
        return false
      }
    }
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Export CSV
          </button>
          {canCreateTask && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Task
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex px-6">
            {['Initiated', 'Received', 'Completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab} ({tabCounts[tab]})
              </button>
            ))}
          </nav>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative rounded-md shadow-sm max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No tasks found.</div>
          ) : (
            <div className="grid gap-6">
              {filteredTasks.map(task => (
                <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {activeTab === 'Received' ? `From: ${task.initiatorEmail}` : `Assigned to: ${task.assignedToEmail}`}
                        {task.dueDate && <span className="ml-3">Due: <span className="font-medium">{task.dueDate}</span></span>}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.priority === 'High' ? 'bg-red-100 text-red-800' :
                        task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority} Priority
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                        task.status === 'Responded' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">
                    {expandedTasks.has(task.id) || !task.description || task.description.length <= 150
                      ? task.description
                      : `${task.description.substring(0, 150)}... `}
                    {task.description && task.description.length > 150 && (
                      <button 
                        onClick={() => toggleExpand(task.id)} 
                        className="text-indigo-600 hover:text-indigo-800 ml-1 font-medium"
                      >
                        {expandedTasks.has(task.id) ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                  
                  {task.recipientResponse && (
                    <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-blue-800">Response from Assignee:</p>
                        {task.respondedAt && (
                          <span className="text-xs text-blue-600">{new Date(task.respondedAt).toLocaleString()}</span>
                        )}
                      </div>
                      <p className="text-sm text-blue-700 mt-1">{task.recipientResponse}</p>
                    </div>
                  )}

                  {task.completionNote && (
                    <div className="mt-4 bg-gray-50 border-l-4 border-gray-400 p-4">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-800">Completion Note:</p>
                        {task.completedDate && (
                          <span className="text-xs text-gray-500">{new Date(task.completedDate).toLocaleString()}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{task.completionNote}</p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                    {/* If in Received tab, user can respond */}
                    {activeTab === 'Received' && task.status !== 'Completed' && (
                      <button
                        onClick={() => setRespondTask(task)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Respond
                      </button>
                    )}

                    {/* If in Initiated tab, user can complete */}
                    {activeTab === 'Initiated' && task.status !== 'Completed' && (
                      <button
                        onClick={() => setCompleteTask(task)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        Complete Task
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateTask}
        userEmail={user?.email}
        userRoles={userRoles}
      />

      <TaskRespondModal
        isOpen={!!respondTask}
        onClose={() => setRespondTask(null)}
        onSubmit={handleRespondTask}
        task={respondTask}
      />

      <TaskCompleteModal
        isOpen={!!completeTask}
        onClose={() => setCompleteTask(null)}
        onSubmit={handleCompleteTask}
        task={completeTask}
      />
    </div>
  )
}
