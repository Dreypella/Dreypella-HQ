import { useEffect, useMemo, useState } from 'react'
import type { AuthenticatedUser } from './auth/types'
import './App.css'

type Department = { id: string; code: string; name: string; description: string; departmentType: string; status: string; positionCount: number }
type WorkforcePosition = { id: string; name: string; title: string; departmentName: string; supervisorTitle: string; divisionScope: string; authority: string; responsibilities: string[]; capabilities: string[]; approvalBoundaries: string[]; status: string }
type TaskStatus = 'queued' | 'assigned' | 'running' | 'verifying' | 'completed' | 'awaiting_approval' | 'blocked_human_intervention' | 'failed' | 'cancelled'
type Task = { id: string; title: string; description: string; department: string; assigned_employee: string | null; created_by: string; priority: 'low' | 'normal' | 'high' | 'urgent'; status: TaskStatus; due_at: string | null; created_at: string; updated_at: string }
const taskTransitions: Record<TaskStatus, TaskStatus[]> = { queued: ['assigned', 'cancelled'], assigned: ['queued', 'running', 'awaiting_approval', 'blocked_human_intervention', 'cancelled'], running: ['verifying', 'awaiting_approval', 'blocked_human_intervention', 'failed', 'cancelled'], verifying: ['running', 'completed', 'awaiting_approval', 'blocked_human_intervention', 'failed'], completed: [], awaiting_approval: ['assigned', 'running', 'blocked_human_intervention', 'cancelled'], blocked_human_intervention: ['assigned', 'running', 'cancelled'], failed: ['queued', 'cancelled'], cancelled: [] }
const taskStatusLabel = (status: TaskStatus) => status.replaceAll('_', ' ')
const divisions = [
  { name: 'Dreypella Campus', description: 'Student commerce and campus delivery', icon: '🎓', state: 'Initial priority' },
  { name: 'Dreypella Ride', description: 'Passenger transportation services', icon: '🚘', state: 'Connected later' },
  { name: 'Dreypella Delivery', description: 'Local and interstate logistics', icon: '📦', state: 'Connected later' },
  { name: 'Dreypella Marketplace', description: 'Digital commerce and vendors', icon: '🛍️', state: 'Connected later' },
  { name: 'Dreypella AI', description: 'AI products and automation', icon: '🤖', state: 'Development' },
  { name: 'Dreypella Business', description: 'Enterprise solutions and partnerships', icon: '🏢', state: 'Planned' },
]

const navigation = [
  { group: 'HEADQUARTERS', items: [{ name: 'CEO Dashboard', icon: '▦' }, { name: 'Executive Office', icon: '♙' }, { name: 'AI Workforce', icon: '◉' }, { name: 'Departments', icon: '♧' }, { name: 'Business Divisions', icon: '▣' }] },
  { group: 'MANAGEMENT', items: [{ name: 'Tasks & Projects', icon: '☷' }, { name: 'Approvals', icon: '✓' }, { name: 'Finance', icon: '₦' }, { name: 'Sales & CRM', icon: '↗' }, { name: 'Marketing', icon: '◈' }] },
  { group: 'INTELLIGENCE', items: [{ name: 'CEO Command Centre', icon: '✳' }, { name: 'Research Centre', icon: '⌕' }, { name: 'Company Reports', icon: '▤' }, { name: 'Company Memory', icon: '◷' }, { name: 'Investment Intelligence', icon: '₦' }, { name: 'Legal & Compliance', icon: '⚖' }] },
]


function App({ user, onLogout }: { user: AuthenticatedUser; onLogout: () => void }) {
  const initials = user.displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || 'HQ'
  const firstName = user.displayName.trim().split(/\s+/)[0] || 'there'
  const [active, setActive] = useState('CEO Dashboard')
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState('')
  const [taskSaving, setTaskSaving] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDepartment, setNewTaskDepartment] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('normal')
  const [query, setQuery] = useState('')
  const [command, setCommand] = useState('')
  const [messages, setMessages] = useState([
    { from: 'Personal Assistant', text: 'Welcome to Dreypella HQ. I am your proposed AI Personal Assistant. I will serve as your primary executive coordination point. The AI engine is not connected yet, so I cannot currently route or execute instructions.' },
  ])
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [workforceSearch, setWorkforceSearch] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [workforce, setWorkforce] = useState<WorkforcePosition[]>([])
  const [registryLoading, setRegistryLoading] = useState(true)
  const [registryError, setRegistryError] = useState('')

  useEffect(() => {
    let activeRequest = true
    async function loadTasks() {
      try {
        const response = await fetch('/api/tasks', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        if (response.ok === false) throw new Error(response.status === 401 ? 'Your session has expired. Sign in again to view tasks.' : response.status === 403 ? 'Your account is not authorised to view tasks.' : 'Tasks could not be loaded. Please try again.')
        const data = await response.json() as { tasks: Task[] }
        if (activeRequest) { setTasks(data.tasks); setTasksError('') }
      } catch (error) { if (activeRequest) setTasksError(error instanceof Error ? error.message : 'Tasks could not be loaded.') }
      finally { if (activeRequest) setTasksLoading(false) }
    }
    void loadTasks()
    return () => { activeRequest = false }
  }, [])

  useEffect(() => {
    let activeRequest = true
    async function loadRegistry() {
      try {
        const [departmentResponse, workforceResponse] = await Promise.all([
          fetch('/api/departments', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
          fetch('/api/workforce/positions', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
        ])
        if (!departmentResponse.ok || !workforceResponse.ok) {
          const failed = !departmentResponse.ok ? departmentResponse : workforceResponse
          throw new Error(failed.status === 401 ? 'Your session has expired. Sign in again to view the organisation registry.' : failed.status === 403 ? 'Your account is not authorised to view the organisation registry.' : 'The organisation registry could not be loaded. Please try again.')
        }
        const departmentData = await departmentResponse.json() as { departments: Department[] }
        const workforceData = await workforceResponse.json() as { positions: WorkforcePosition[] }
        if (activeRequest) { setDepartments(departmentData.departments); setWorkforce(workforceData.positions); setRegistryError('') }
      } catch (error) {
        if (activeRequest) setRegistryError(error instanceof Error ? error.message : 'The organisation registry could not be loaded.')
      } finally { if (activeRequest) setRegistryLoading(false) }
    }
    void loadRegistry()
    return () => { activeRequest = false }
  }, [])

  const completed = tasks.filter(task => task.status === 'completed').length
  const taskProgress = tasks.length ? Math.round(completed / tasks.length * 100) : 0
  const filteredWorkforce = useMemo(() => workforce.filter(employee => `${employee.name} ${employee.title} ${employee.departmentName} ${employee.divisionScope}`.toLowerCase().includes(workforceSearch.toLowerCase())), [workforce, workforceSearch])
  const selectedEmployee = workforce.find(employee => employee.id === selectedEmployeeId)
  const filteredTasks = useMemo(
    () => tasks.filter(task => `${task.title} ${task.department}`.toLowerCase().includes(query.toLowerCase())),
    [tasks, query],
  )

  function sendCommand() {
    if (!command.trim()) return
    setMessages(previous => [
      ...previous,
      { from: user.displayName, text: command.trim() },
      { from: 'Personal Assistant', text: 'Your instruction has been recorded in this interface prototype. The AI coordination engine is not connected yet, so I have not routed this instruction to another employee or executed it.' },
    ])
    setCommand('')
  }

  async function createTask() {
    if (!newTaskTitle.trim() || !newTaskDepartment.trim() || taskSaving) return
    setTaskSaving(true); setTasksError('')
    try {
      const response = await fetch('/api/tasks', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTaskTitle.trim(), department: newTaskDepartment.trim(), description: newTaskDescription.trim(), priority: newTaskPriority }) })
      if (response.ok === false) throw new Error(response.status === 401 ? 'Your session has expired. Sign in again.' : response.status === 403 ? 'You are not authorised to create tasks.' : 'The task could not be created.')
      const data = await response.json() as { task: Task }; setTasks(previous => [data.task, ...previous]); setNewTaskTitle(''); setNewTaskDepartment(''); setNewTaskDescription(''); setNewTaskPriority('normal')
    } catch (error) { setTasksError(error instanceof Error ? error.message : 'The task could not be created.') }
    finally { setTaskSaving(false) }
  }

  async function updateTaskStatus(id: string, status: TaskStatus) {
    if (taskSaving) return
    setTaskSaving(true); setTasksError('')
    try {
      const response = await fetch("/api/tasks/" + encodeURIComponent(id) + "/status", { method: 'PATCH', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (response.ok === false) throw new Error(response.status === 401 ? 'Your session has expired. Sign in again.' : response.status === 403 ? 'You are not authorised to update this task.' : response.status === 409 ? 'That status change is not allowed.' : 'The task status could not be updated.')
      const data = await response.json() as { task: Task }; setTasks(previous => previous.map(task => task.id === id ? data.task : task))
    } catch (error) { setTasksError(error instanceof Error ? error.message : 'The task status could not be updated.') }
    finally { setTaskSaving(false) }
  }

  function pageTitle() {
    return active
  }

  return (
    <div className="hq-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-symbol">D</div>
          <div><strong>DREYPELLA</strong><span>GROUP HEADQUARTERS</span></div>
          <button className="close-menu" onClick={() => setMobileMenu(false)}>×</button>
        </div>

        <div className="profile">
          <div className="avatar">{initials}</div>
          <div className="profile-copy"><strong>{user.displayName}</strong><span>{user.roles.join(" · ")}</span></div>
          <span className="online-dot" />
        </div>

        <nav>
          {navigation.map(group => (
            <div className="nav-group" key={group.group}>
              <p>{group.group}</p>
              {group.items.map(item => (
                <button key={item.name} className={`nav-link ${active === item.name ? 'active' : ''}`}
                  onClick={() => { setActive(item.name); setMobileMenu(false) }}>
                  <span className="nav-icon">{item.icon}</span>{item.name}
                  {item.name === 'Approvals' && <span className="nav-count">0</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
      <button className="logout-button" onClick={onLogout}>Sign out</button>
          <div className="system-status"><span className="status-dot" /> HQ interface online <small>AI engine pending</small></div>
          <div className="version">DREYPELLA HQ · VERSION 1.0</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileMenu(true)}>☰</button>
          <div className="breadcrumb">Dreypella Group <span>/</span> <strong>{pageTitle()}</strong></div>
          <div className="top-actions">
            <span className="environment"><i /> DEVELOPMENT</span>
            <button className="notification" title="Notifications">♧</button>
            <div className="top-avatar">{initials}</div>
          </div>
        </header>

        <div className="workspace">
          {active === 'CEO Dashboard' && (
            <>
              <div className="welcome-row">
                <div><div className="eyebrow">EXECUTIVE OVERVIEW</div><h1>Good day, {firstName}.</h1>
                  <p>Welcome to the command centre of the Dreypella Group.</p></div>
                <div className="date-chip">✦ &nbsp; GROUP HEADQUARTERS</div>
              </div>

              <section className="hero-banner">
                <div className="hero-content">
                  <div className="hero-label"><span /> YOUR CORPORATE OPERATING SYSTEM</div>
                  <h2>One vision.<br /><em>One intelligent</em> workforce.</h2>
                  <p>Manage your businesses, coordinate your departments and build the future of Dreypella from one headquarters.</p>
                  <button className="hero-button" onClick={() => setActive('AI Workforce')}>Explore AI workforce <span>→</span></button>
                </div>
                <div className="hero-art">
                  <div className="orbit orbit-one" /><div className="orbit orbit-two" />
                  <div className="core">D<span>✦</span></div>
                  <div className="orbit-tag tag-one">STRATEGY</div>
                  <div className="orbit-tag tag-two">INTELLIGENCE</div>
                  <div className="orbit-tag tag-three">EXECUTION</div>
                </div>
                <div className="hero-watermark">D</div>
              </section>

              <div className="section-heading"><div><h3>Company overview</h3><p>Your group-wide management snapshot.</p></div><span className="demo-label">FOUNDATION STAGE</span></div>

              <div className="stats-grid">
                <div className="stat-card"><div className="stat-top"><span>Business divisions</span><b>▣</b></div><strong>06</strong><small>Defined divisions</small></div>
                <div className="stat-card"><div className="stat-top"><span>AI executive roles</span><b>✳</b></div><strong>{workforce.length.toString().padStart(2, '0')}</strong><small>Proposed positions</small></div>
                <div className="stat-card"><div className="stat-top"><span>Project tasks</span><b>☷</b></div><strong>{tasks.length.toString().padStart(2, '0')}</strong><small>{completed} completed in this prototype</small></div>
                <div className="stat-card"><div className="stat-top"><span>Pending approvals</span><b>✓</b></div><strong>00</strong><small>No live approvals connected</small></div>
              </div>

              <div className="dashboard-grid">
                <section className="panel tasks-panel">
                  <div className="panel-heading"><div><h3>Priority tasks</h3><p>Track your headquarters development.</p></div><button className="text-button" onClick={() => setActive('Tasks & Projects')}>View all →</button></div>
                  <div className="task-progress"><div><span>Project progress</span><strong>{taskProgress}%</strong></div><div className="progress-track"><div style={{ width: `${taskProgress}%` }} /></div></div>
                  {tasksLoading ? <p>Loading tasks...</p> : tasksError ? <p className="task-error">{tasksError}</p> : tasks.length === 0 ? <p>No tasks yet. Create a task to get started.</p> : tasks.slice(0, 4).map(task => (
                    <div className="task-row" key={task.id}>
                      <div className="task-info"><strong>{task.title}</strong><span>{task.department}</span></div>
                      <span className="task-status">{taskStatusLabel(task.status)}</span>
                    </div>
                  ))}
                </section>

                <section className="panel activity-panel">
                  <div className="panel-heading"><div><h3>Executive activity</h3><p>Headquarters activity monitor.</p></div><span className="live-indicator">● LOCAL</span></div>
                  <div className="activity-item"><div className="activity-icon blue">⌘</div><div><strong>Technology foundation</strong><p>React application initialized.</p><small>Just now · Development</small></div></div>
                  <div className="activity-item"><div className="activity-icon red">▣</div><div><strong>Group structure</strong><p>Six business divisions defined.</p><small>Project setup · Planning</small></div></div>
                  <div className="activity-item"><div className="activity-icon gold">♙</div><div><strong>Executive workforce</strong><p>AI workforce roles proposed across executive and specialist departments.</p><small>Project setup · Planning</small></div></div>
                  <div className="activity-note">This feed currently displays development activity, not live company transactions.</div>
                </section>
              </div>

              <div className="section-heading divisions-heading"><div><h3>Your business divisions</h3><p>One group. Multiple business opportunities.</p></div><button className="text-button" onClick={() => setActive('Business Divisions')}>Manage divisions →</button></div>
              <div className="division-grid">
                {divisions.map(division => <button className="division-card" key={division.name} onClick={() => setActive('Business Divisions')}>
                  <span className="division-icon">{division.icon}</span><strong>{division.name}</strong><p>{division.description}</p><span className="division-state">{division.state} <b>→</b></span>
                </button>)}
              </div>
            </>
          )}

          {active === 'CEO Command Centre' && (
            <div className="page-content">
              <div className="eyebrow">EXECUTIVE INTELLIGENCE</div><h1>CEO Command Centre</h1><p className="page-subtitle">Your communication interface with the Dreypella AI Personal Assistant.</p>
              <div className="command-layout">
                <div className="panel chat-panel">
                  <div className="chat-header"><div className="coo-avatar">✳</div><div><strong>AI Personal Assistant</strong><span>Executive coordination prototype · AI connection pending</span></div><span className="status-dot" /></div>
                  <div className="chat-messages">{messages.map((message, index) => <div className={`message ${message.from === 'CEO' ? 'ceo-message' : ''}`} key={index}><small>{message.from}</small><p>{message.text}</p></div>)}</div>
                  <div className="chat-input"><textarea value={command} onChange={e => setCommand(e.target.value)} placeholder="Give your executive team an instruction..." onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCommand() } }} /><button onClick={sendCommand}>Send ↑</button></div>
                  <small className="chat-disclaimer">Prototype only. Messages are stored in temporary browser state and are not sent to an AI model.</small>
                </div>
                <div className="panel command-side"><h3>CEO command examples</h3>{['Prepare a growth strategy for Dreypella Campus.','Identify new revenue opportunities.','Review our marketing priorities.','Prepare a weekly executive report.'].map(example => <button key={example} onClick={() => setCommand(example)}>{example} <span>↗</span></button>)}</div>
              </div>
            </div>
          )}


          {active === 'Executive Office' && (
            <div className="page-content">
              <div className="eyebrow">GROUP CEO SUPPORT</div>
              <h1>Executive Office</h1>
              <p className="page-subtitle">Your central coordination office for executive priorities, instructions and departmental follow-ups.</p>

              <div className="workforce-notice">
                <strong>AI Personal Assistant · Proposed / Not Connected</strong>
                <span>The assistant is designed to be your primary point of contact with the Dreypella workforce. Actual AI communication, task routing, reminders and integrations have not yet been connected.</span>
              </div>

              <section className="panel employee-detail">
                <div className="employee-detail-top">
                  <div>
                    <div className="eyebrow">DIRECT REPORT TO GROUP CEO</div>
                    <h2>AI Personal Assistant</h2>
                    <p>Group CEO Executive Assistant · Executive Office</p>
                  </div>
                  <span className="planned-badge">PROPOSED / NOT CONNECTED</span>
                </div>

                <div className="employee-detail-columns">
                  <div>
                    <h3>Executive support</h3>
                    <ul>
                      <li>Schedule and priority management</li>
                      <li>Daily and weekly briefings</li>
                      <li>Meeting agendas and decision briefs</li>
                      <li>Organised executive records</li>
                    </ul>
                  </div>
                  <div>
                    <h3>Workforce coordination</h3>
                    <ul>
                      <li>Receive CEO instructions</li>
                      <li>Identify the responsible department</li>
                      <li>Coordinate authorised assignments</li>
                      <li>Track progress and request updates</li>
                      <li>Compile departmental responses</li>
                    </ul>
                  </div>
                  <div>
                    <h3>Authority boundaries</h3>
                    <p>Cannot approve spending, sign agreements, change permissions, send sensitive external communications or deploy live systems without the required human approval.</p>
                  </div>
                </div>
              </section>

              <div className="panel advisor-note">
                <h3>How coordination will work</h3>
                <p>You give the Personal Assistant an instruction. It identifies the responsible department, prepares or routes the assignment, monitors progress and returns the result to you. Department heads remain accountable for their teams, and you retain final decision authority.</p>
                <span className="planned-badge">AI COORDINATION ENGINE PENDING</span>
              </div>
            </div>
          )}

          {active === 'AI Workforce' && (
            <div className="page-content">
              <div className="eyebrow">GROUP HUMAN & AI CAPITAL</div>
              <h1>AI Workforce Management</h1>
              <p className="page-subtitle">Define your AI employees, reporting relationships, responsibilities and authority across the Dreypella Group.</p>

              {registryLoading && <div className="panel workforce-empty">Loading workforce registry...</div>}{registryError && <div className="workforce-notice"><strong>Registry unavailable</strong><span>{registryError}</span></div>}<div className="workforce-notice"><strong>Management prototype</strong><span>These are proposed AI positions. No employee is currently connected to an AI model, company database or execution system.</span></div>

              <div className="workforce-stats">
                <div className="panel workforce-stat"><span>Proposed positions</span><strong>{workforce.length.toString().padStart(2, '0')}</strong></div>
                <div className="panel workforce-stat"><span>Connected AI employees</span><strong>00</strong></div>
                <div className="panel workforce-stat"><span>Reporting to CEO</span><strong>{workforce.filter(employee => employee.supervisorTitle === 'Group CEO').length.toString().padStart(2, '0')}</strong></div>
                <div className="panel workforce-stat"><span>Execution authority</span><strong>Restricted</strong></div>
              </div>

              <section className="panel hierarchy-panel">
                <div className="panel-heading"><div><h3>Reporting hierarchy</h3><p>Proposed group reporting structure.</p></div><span className="planned-badge">PROPOSED</span></div>
                <div className="hierarchy-ceo"><span>CEO</span><strong>Group Chief Executive Officer</strong><small>You · Final decision authority</small></div>
<div className="hierarchy-branches">
                  <div className="hierarchy-branch"><strong>AI Personal Assistant</strong><small>Executive coordination</small><span>CEO priorities · Briefings · Instructions · Departmental follow-ups</span></div>
                  <div className="hierarchy-branch"><strong>AI Educator</strong><small>CEO education & corporate learning</small><span>Executive development · Employee training · Knowledge assessments</span></div>
                  <div className="hierarchy-branch"><strong>Chief Operating Officer</strong><small>Operations coordination</small><span>HR · Marketing · Sales · Operations · Customer Relations · Campus Coordinator</span></div>
                  <div className="hierarchy-branch"><strong>Chief Technology Officer</strong><small>Technology & Digital Systems</small><span>Software · Web · Mobile · Backend · QA · DevOps · Databases</span></div>
                  <div className="hierarchy-branch"><strong>Chief Innovation Officer</strong><small>Technological Advancement & Innovation</small><span>R&D · AI Research · Robotics · Hardware · Prototypes · Emerging Technology</span></div>
                  <div className="hierarchy-branch"><strong>Chief Strategy Officer</strong><small>Strategy & Research</small><span>Market research and expansion planning</span></div>
                  <div className="hierarchy-branch"><strong>Direct CEO advisory offices</strong><small>Independent specialist advice</small><span>Finance · Investment · Legal & Compliance</span></div>
                </div>
                <p className="hierarchy-footnote">This is an initial governance proposal. Reporting lines can be revised before agents are activated.</p>
              </section>

              <div className="advisor-grid">
                <section className="panel advisor-card">
                  <div className="employee-icon">✦</div><h3>AI Excellence Standard</h3>
                  <p>Every AI employee must be designed and evaluated against measurable standards.</p>
                  <ul>
                    <li>Deep, structured reasoning and comparison of alternatives</li>
                    <li>Evidence-based research and verification of important claims</li>
                    <li>Critical thinking, assumption testing and clear uncertainty</li>
                    <li>Cross-department awareness and long-term strategic thinking</li>
                    <li>Efficient, accurate communication and measurable outcomes</li>
                    <li>Continuous learning from verified feedback and results</li>
                    <li>Clear explanations of evidence, limitations and recommendations</li>
                  </ul>
                </section>
                <section className="panel advisor-card">
                  <div className="employee-icon">⌑</div><h3>Security-First Governance</h3>
                  <p>Security is mandatory throughout the design, testing and operation of every AI system.</p>
                  <ul>
                    <li>Least-privilege access and permission checks on every protected action</li>
                    <li>Protection of credentials, confidential records and personal data</li>
                    <li>Defence against prompt injection and unauthorised instructions</li>
                    <li>Auditable activity, secure backups and incident response procedures</li>
                    <li>No self-approval, permission escalation or silent audit deletion</li>
                    <li>Human approval for spending, contracts, sensitive disclosures and production changes</li>
                    <li>CTO technical leadership, Legal & Compliance review and CEO escalation</li>
                  </ul>
                </section>
              </div>
              <div className="panel advisor-note">
                <h3>Capability and safety commitment</h3>
                <p>Dreypella's goal is exceptionally capable AI assistance with strong reasoning, research and problem-solving. No AI system is assumed to be infallible or superior in every situation. Important outputs must be verified, uncertainty disclosed and high-impact decisions kept under authorised human control. These standards are proposed until implemented and tested in the secure backend.</p>
              </div>

              <div className="workforce-directory-heading"><div><h3>AI workforce position directory</h3><p>Select a position to inspect its responsibilities and authority.</p></div><span className="planned-badge">REGISTRY RECORDS</span></div>
              <input className="search-input workforce-search" value={workforceSearch} onChange={e => setWorkforceSearch(e.target.value)} placeholder="Search by employee, role, department or division..." />

              <div className="employee-grid workforce-grid">
                {filteredWorkforce.map(employee => (
                  <button className={selectedEmployeeId === employee.id ? 'employee-card workforce-card workforce-selected' : 'employee-card workforce-card'} key={employee.id} onClick={() => setSelectedEmployeeId(selectedEmployeeId === employee.id ? null : employee.id)}>
                    <div className="employee-icon">✳</div>
                    <span className="planned-badge">{employee.status.toUpperCase()}</span>
                    <h3>{employee.name}</h3>
                    <p>{employee.title}</p>
                    <small>{employee.departmentName} · Reports to {employee.supervisorTitle}</small>
                    <span className="workforce-view">View employee profile →</span>
                  </button>
                ))}
              </div>
              {filteredWorkforce.length === 0 && <div className="panel workforce-empty">No workforce position matches that search.</div>}

              {selectedEmployee && (
                <section className="panel employee-detail">
                  <div className="employee-detail-top">
                    <div><div className="eyebrow">EMPLOYEE PROFILE</div><h2>{selectedEmployee.name}</h2><p>{selectedEmployee.title}</p></div>
                    <button className="detail-close" onClick={() => setSelectedEmployeeId(null)}>Close ×</button>
                  </div>
                  <div className="employee-meta-grid">
                    <div><small>Department</small><strong>{selectedEmployee.departmentName}</strong></div>
                    <div><small>Reports to</small><strong>{selectedEmployee.supervisorTitle}</strong></div>
                    <div><small>Assigned division</small><strong>{selectedEmployee.divisionScope}</strong></div>
                    <div><small>Connection status</small><strong>Not connected · {selectedEmployee.status}</strong></div>
                  </div>
                  <div className="employee-detail-columns">
                    <div><h3>Responsibilities</h3><ul>{selectedEmployee.responsibilities.map(item => <li key={item}>{item}</li>)}</ul></div>
                    <div><h3>Authority boundary</h3><p>{selectedEmployee.authority}</p><h3>Capabilities</h3><ul>{selectedEmployee.capabilities.map(item => <li key={item}>{item}</li>)}</ul></div>
                    <div><h3>Human approval boundaries</h3><ul>{selectedEmployee.approvalBoundaries.map(item => <li key={item}>{item}</li>)}</ul></div>
                  </div>
                  <div className="employee-detail-warning">AI employee execution permissions, tool access and delegation controls are not connected yet. Human task permissions are enforced by the backend; AI employee activation remains pending implementation and testing of its separate controls.</div>
                </section>
              )}
            </div>
          )}

          {active === 'Departments' && (
            <div className="page-content"><div className="eyebrow">ORGANISATIONAL STRUCTURE</div><h1>Departments</h1><p className="page-subtitle">The functional teams responsible for running the group.</p>{registryLoading && <div className="panel workforce-empty">Loading department registry...</div>}{registryError && <div className="workforce-notice"><strong>Registry unavailable</strong><span>{registryError}</span></div>}<div className="employee-grid">{departments.map(d => <div className="employee-card" key={d.id}><div className="employee-icon">♧</div><span className="planned-badge">{d.status.toUpperCase()}</span><h3>{d.name}</h3><p>{d.description}</p><small>{d.positionCount} workforce positions · {d.departmentType}</small></div>)}</div></div>
          )}

          {active === 'Business Divisions' && (
            <div className="page-content"><div className="eyebrow">GROUP PORTFOLIO</div><h1>Business Divisions</h1><p className="page-subtitle">Manage all present and future Dreypella ventures from one place.</p><div className="division-grid large">{divisions.map(d => <div className="division-card" key={d.name}><span className="division-icon">{d.icon}</span><strong>{d.name}</strong><p>{d.description}</p><span className="division-state">{d.state}</span></div>)}</div></div>
          )}

          {active === "Tasks & Projects" && (
            <div className="page-content">
              <div className="eyebrow">WORK MANAGEMENT</div>
              <h1>Tasks & Projects</h1>
              <p className="page-subtitle">Create, monitor and update headquarters tasks.</p>
              <div className="panel full-panel">
                <div className="panel-heading"><div><h3>HQ development tasks</h3><p>{completed} of {tasks.length} completed</p></div></div>
                {user.permissions.some(permission => permission === "tasks.create" || permission === "tasks.create_all") && (
                  <form className="task-create-form" onSubmit={event => { event.preventDefault(); void createTask() }}>
                    <input value={newTaskTitle} onChange={event => setNewTaskTitle(event.target.value)} placeholder="Task title" required />
                    <select value={newTaskDepartment} onChange={event => setNewTaskDepartment(event.target.value)} required aria-label="Department" disabled={registryLoading || departments.length === 0}><option value="">Select department</option>{departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
                    <textarea value={newTaskDescription} onChange={event => setNewTaskDescription(event.target.value)} placeholder="Description (optional)" />
                    <div className="task-create-actions">
                      <select value={newTaskPriority} onChange={event => setNewTaskPriority(event.target.value as Task["priority"])}>
                        <option value="low">Low priority</option><option value="normal">Normal priority</option><option value="high">High priority</option><option value="urgent">Urgent priority</option>
                      </select>
                      <button type="submit" disabled={taskSaving}>{taskSaving ? "Saving..." : "Create task"}</button>
                    </div>
                  </form>
                )}
                <input className="search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tasks or departments..." />
                {tasksError && <p className="task-error">{tasksError}</p>}
                {tasksLoading ? <p>Loading tasks...</p> : filteredTasks.length === 0 ? <p>No matching tasks.</p> : filteredTasks.map(task => (
                  <div className="task-row" key={task.id}>
                    <div className="task-info"><strong>{task.title}</strong><span>{task.department} · {task.priority} · {taskStatusLabel(task.status)}</span></div>
                    {user.permissions.some(permission => ["tasks.update_assigned", "tasks.update_department", "tasks.update_all"].includes(permission)) && taskTransitions[task.status].length > 0 && (
                      <select className="task-status-select" value={task.status} disabled={taskSaving} onChange={event => void updateTaskStatus(task.id, event.target.value as TaskStatus)}>
                        <option value={task.status}>{taskStatusLabel(task.status)}</option>
                        {taskTransitions[task.status].map(status => <option key={status} value={status}>{taskStatusLabel(status)}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}{active === 'Investment Intelligence' && (
            <div className="page-content">
              <div className="eyebrow">FINANCIAL RESEARCH & INTELLIGENCE</div>
              <h1>AI Investment Finder & Advisor</h1>
              <p className="page-subtitle">Research investment opportunities, compare risks and prepare evidence-based reports for the CEO.</p>
              <div className="advisor-status"><span className="status-dot" /> PLANNED OFFICE · LIVE MARKET DATA NOT CONNECTED</div>
              <div className="advisor-grid">
                <section className="panel advisor-card"><div className="employee-icon">⌕</div><h3>Opportunity Finder</h3><p>Research Nigerian and international investment opportunities across different asset classes.</p><ul><li>Stocks and ETFs</li><li>Government and corporate bonds</li><li>Treasury bills and fixed income</li><li>Mutual funds and real estate</li><li>Legitimate business opportunities</li></ul></section>
                <section className="panel advisor-card"><div className="employee-icon">◈</div><h3>Investment Analysis</h3><p>Prepare structured comparisons using verified and dated information.</p><ul><li>Current prices and entry costs</li><li>Historical performance</li><li>Fees, taxes and liquidity</li><li>Risk and time horizon</li><li>Optimistic, base and pessimistic scenarios</li></ul></section>
                <section className="panel advisor-card"><div className="employee-icon">▤</div><h3>Investment Reports</h3><p>Every report should explain the evidence behind its conclusions.</p><ul><li>Source links and publication dates</li><li>Potential returns and assumptions</li><li>Risk comparisons and alternatives</li><li>Regulatory and fraud checks</li><li>Clear recommendations and limitations</li></ul></section>
                <section className="panel advisor-card"><div className="employee-icon">◷</div><h3>Portfolio Monitoring</h3><p>Planned monitoring of CEO-approved watchlists and investments.</p><ul><li>Price and market developments</li><li>Material company announcements</li><li>Risk alerts and review reminders</li><li>Performance summaries</li><li>Human approval before transactions</li></ul></section>
              </div>
              <div className="panel advisor-note"><h3>Accuracy and investment safety</h3><p>No investment return is guaranteed. The advisor must distinguish verified facts from estimates, show the date of every time-sensitive figure, cite credible sources, disclose uncertainty and never invent market data. No trades or movement of company funds without your explicit approval.</p><span className="planned-badge">AI AND MARKET DATA INTEGRATION PENDING</span></div>
            </div>
          )}

          {active === 'Legal & Compliance' && (
            <div className="page-content">
              <div className="eyebrow">CORPORATE LEGAL INTELLIGENCE</div>
              <h1>AI Legal Advisor</h1>
              <p className="page-subtitle">Support Dreypella with legal research, contract review, governance and regulatory compliance.</p>
              <div className="advisor-status"><span className="status-dot" /> PLANNED OFFICE · LEGAL RESEARCH CONNECTION PENDING</div>
              <div className="advisor-grid">
                <section className="panel advisor-card"><div className="employee-icon">⚖</div><h3>Legal Research</h3><p>Research applicable laws and regulations, starting with Nigeria.</p><ul><li>Business and company law</li><li>Employment and labour matters</li><li>Consumer and data protection</li><li>Commercial and contract law</li><li>Relevant international jurisdictions</li></ul></section>
                <section className="panel advisor-card"><div className="employee-icon">▤</div><h3>Contract & Document Review</h3><p>Review documents and identify clauses that may require professional attention.</p><ul><li>Partnership agreements</li><li>Vendor and service contracts</li><li>Employment agreements</li><li>Terms of service and policies</li><li>Drafting support for lawyer review</li></ul></section>
                <section className="panel advisor-card"><div className="employee-icon">✓</div><h3>Compliance Management</h3><p>Organise regulatory obligations and help the company track compliance work.</p><ul><li>Registration and licensing checks</li><li>Regulatory obligation checklists</li><li>Filing and renewal deadlines</li><li>Corporate governance records</li><li>Compliance risk reports</li></ul></section>
                <section className="panel advisor-card"><div className="employee-icon">◈</div><h3>Legal Risk & Disputes</h3><p>Identify potential legal exposure and prepare organised summaries for counsel.</p><ul><li>Contractual risk assessments</li><li>Dispute and evidence summaries</li><li>Potential liability identification</li><li>Legal deadline alerts</li><li>Escalation to qualified lawyers</li></ul></section>
              </div>
              <div className="panel advisor-note"><h3>Legal accuracy and human oversight</h3><p>Every legal report must identify its jurisdiction, cite authoritative legislation or court decisions, show source dates and flag uncertainty. The AI is a research assistant, not a substitute for a qualified lawyer. It cannot sign agreements, file legal documents or make legal commitments on behalf of Dreypella.</p><span className="planned-badge">LEGAL DATABASE AND LAWYER WORKFLOW PENDING</span></div>
            </div>
          )}

          {active !== 'CEO Dashboard' && !['CEO Command Centre', 'Executive Office', 'AI Workforce', 'Departments', 'Business Divisions', 'Tasks & Projects', 'Investment Intelligence', 'Legal & Compliance'].includes(active) && (
            <div className="page-content"><div className="eyebrow">HEADQUARTERS MODULE</div><h1>{active}</h1><p className="page-subtitle">This module is part of the Dreypella HQ development roadmap.</p><div className="panel coming-soon"><div className="coming-icon">✳</div><h2>Module under development</h2><p>We are establishing the secure data layer and business integrations required to make this module operational.</p><span className="planned-badge">NOT YET CONNECTED</span></div></div>
          )}

          <footer className="footer"><span>© 2026 DREYPELLA GROUP</span><span>MOVE. DELIVER. SHOP. EARN. BUILD.</span><span>HQ DEVELOPMENT EDITION</span></footer>
        </div>
      </main>
      {mobileMenu && <button className="mobile-overlay" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}
    </div>
  )
}

export default App
