import { useMemo, useState } from 'react'
import type { AuthenticatedUser } from './auth/types'
import './App.css'

const departments = [
  { name: 'Executive Office', role: 'AI Personal Assistant to the Group CEO', icon: '♙', status: 'Planned' },
  { name: 'Human Resources', role: 'HR Director', icon: '♙', status: 'Planned' },
  { name: 'Finance & Accounting', role: 'Chief Financial Officer', icon: '₦', status: 'Planned' },
  { name: 'Marketing', role: 'Marketing Director', icon: '◈', status: 'Planned' },
  { name: 'Sales', role: 'Sales Director', icon: '↗', status: 'Planned' },
  { name: 'Operations', role: 'Operations Director', icon: '⚙', status: 'Planned' },
  { name: 'Technology & Digital Systems', role: 'Chief Technology Officer', icon: '⌘', status: 'Planned' },
  { name: 'Technological Advancement & Innovation', role: 'Chief Innovation Officer', icon: '⚡', status: 'Planned' },
  { name: 'Business Development', role: 'Chief Strategy Officer', icon: '◇', status: 'Planned' },
  { name: 'Customer Relations', role: 'Customer Experience Director', icon: '◎', status: 'Planned' },
  { name: 'Legal & Compliance', role: 'Chief Legal and Compliance Officer', icon: '⚖', status: 'Planned' },
]

const divisions = [
  { name: 'Dreypella Campus', description: 'Student commerce and campus delivery', icon: '🎓', state: 'Initial priority' },
  { name: 'Dreypella Ride', description: 'Passenger transportation services', icon: '🚘', state: 'Connected later' },
  { name: 'Dreypella Delivery', description: 'Local and interstate logistics', icon: '📦', state: 'Connected later' },
  { name: 'Dreypella Marketplace', description: 'Digital commerce and vendors', icon: '🛍️', state: 'Connected later' },
  { name: 'Dreypella AI', description: 'AI products and automation', icon: '🤖', state: 'Development' },
  { name: 'Dreypella Business', description: 'Enterprise solutions and partnerships', icon: '🏢', state: 'Planned' },
]

const initialTasks = [
  { id: 1, title: 'Establish the HQ technical foundation', department: 'Technology', priority: 'High', done: true },
  { id: 2, title: 'Design the executive dashboard', department: 'Technology', priority: 'High', done: false },
  { id: 3, title: 'Define AI executive responsibilities', department: 'Human Resources', priority: 'Medium', done: false },
  { id: 4, title: 'Prepare Campus integration strategy', department: 'Business Development', priority: 'High', done: false },
]

const navigation = [
  { group: 'HEADQUARTERS', items: [{ name: 'CEO Dashboard', icon: '▦' }, { name: 'Executive Office', icon: '♙' }, { name: 'AI Workforce', icon: '◉' }, { name: 'Departments', icon: '♧' }, { name: 'Business Divisions', icon: '▣' }] },
  { group: 'MANAGEMENT', items: [{ name: 'Tasks & Projects', icon: '☷' }, { name: 'Approvals', icon: '✓' }, { name: 'Finance', icon: '₦' }, { name: 'Sales & CRM', icon: '↗' }, { name: 'Marketing', icon: '◈' }] },
  { group: 'INTELLIGENCE', items: [{ name: 'CEO Command Centre', icon: '✳' }, { name: 'Research Centre', icon: '⌕' }, { name: 'Company Reports', icon: '▤' }, { name: 'Company Memory', icon: '◷' }, { name: 'Investment Intelligence', icon: '₦' }, { name: 'Legal & Compliance', icon: '⚖' }] },
]


const workforce = [
  { id: 'coo', name: 'Chief Operating Officer', title: 'Group COO', department: 'Executive Leadership', supervisor: 'Group CEO', division: 'All Dreypella divisions', authority: 'Coordinate approved operations and assign work within delegated limits.', status: 'Proposed', responsibilities: ['Coordinate group-wide operations', 'Monitor departmental performance', 'Coordinate executive meetings and reports', 'Track execution of CEO decisions'], permissions: ['Read approved company reports', 'Prepare operational plans', 'Recommend task assignments'], approvals: ['Changes to company-wide strategy', 'Unbudgeted expenditure', 'Binding commitments'] },
  { id: 'cto', name: 'Chief Technology Officer', title: 'Chief Technology Officer', department: 'Technology & Digital Systems', supervisor: 'Group CEO', division: 'All Dreypella digital platforms and technical projects', authority: 'Lead the group technology function. Production changes and sensitive data access require approval.', status: 'Proposed', responsibilities: ['Lead Technology & Digital Systems', 'Oversee websites, web applications and mobile apps', 'Manage software architecture, APIs and databases', 'Coordinate engineering, testing and infrastructure', 'Lead technical security, access-control design, threat monitoring and incident response planning', 'Support approved technology projects across all divisions'], permissions: ['Review authorised technical documentation', 'Prepare code and implementation plans', 'Coordinate approved development work', 'Review access-control designs, recommend security improvements and coordinate authorised security reviews'], approvals: ['Production deployment', 'External service expenditure', 'Access to sensitive production data', 'Changes to critical architecture'] },
  { id: 'cfo', name: 'Finance & Accounting', title: 'Chief Financial Officer', department: 'Finance', supervisor: 'Group CEO', division: 'All Dreypella divisions', authority: 'Analyse financial information and prepare budgets; cannot move company funds.', status: 'Proposed', responsibilities: ['Prepare financial reports', 'Monitor budgets and cash flow', 'Analyse costs and revenue', 'Support financial planning'], permissions: ['Read authorised financial records', 'Prepare budgets and forecasts', 'Recommend cost controls'], approvals: ['Payments and transfers', 'Loans and investments', 'Budget changes'] },
  { id: 'hr', name: 'Human Resources', title: 'HR Director', department: 'Human Resources', supervisor: 'Group COO', division: 'All Dreypella divisions', authority: 'Recommend workforce policies and staffing actions.', status: 'Proposed', responsibilities: ['Prepare role descriptions', 'Coordinate recruitment workflows', 'Maintain workforce policies', 'Support performance reviews'], permissions: ['Read authorised employee records', 'Prepare HR documents', 'Recommend staffing plans'], approvals: ['Hiring and termination', 'Compensation changes', 'Disciplinary decisions'] },
  { id: 'marketing', name: 'Marketing', title: 'Marketing Director', department: 'Marketing', supervisor: 'Group COO', division: 'All Dreypella divisions', authority: 'Prepare marketing campaigns within approved budgets and brand guidelines.', status: 'Proposed', responsibilities: ['Develop marketing strategies', 'Prepare campaign content', 'Analyse campaign performance', 'Coordinate brand consistency'], permissions: ['Prepare marketing materials', 'Analyse approved campaign data', 'Recommend campaigns'], approvals: ['Paid advertising expenditure', 'Public statements on behalf of the group', 'Brand identity changes'] },
  { id: 'sales', name: 'Sales', title: 'Sales Director', department: 'Sales', supervisor: 'Group COO', division: 'All Dreypella divisions', authority: 'Support sales planning and customer acquisition.', status: 'Proposed', responsibilities: ['Develop sales strategies', 'Track sales opportunities', 'Prepare proposals', 'Monitor sales performance'], permissions: ['Prepare sales reports', 'Draft customer proposals', 'Recommend pricing'], approvals: ['Contract acceptance', 'Non-standard discounts', 'Commercial commitments'] },
  { id: 'operations', name: 'Operations', title: 'Operations Director', department: 'Operations', supervisor: 'Group COO', division: 'All Dreypella divisions', authority: 'Coordinate approved operating procedures and service delivery.', status: 'Proposed', responsibilities: ['Develop operating procedures', 'Monitor service delivery', 'Identify operational bottlenecks', 'Coordinate division-level workflows'], permissions: ['Prepare operating procedures', 'Review authorised operational records', 'Recommend process changes'], approvals: ['Changes affecting customers or partners', 'New operating expenditure', 'Major service changes'] },
  { id: 'strategy', name: 'Strategy & Research', title: 'Chief Strategy Officer', department: 'Business Development', supervisor: 'Group CEO', division: 'Group strategy and expansion', authority: 'Research opportunities and recommend strategic decisions.', status: 'Proposed', responsibilities: ['Research markets and competitors', 'Prepare expansion strategies', 'Evaluate business opportunities', 'Monitor strategic risks'], permissions: ['Research public information', 'Prepare business cases', 'Recommend partnerships'], approvals: ['Partnership agreements', 'Market entry commitments', 'Acquisitions and major investments'] },
  { id: 'customer', name: 'Customer Relations', title: 'Customer Experience Director', department: 'Customer Relations', supervisor: 'Group COO', division: 'All customer-facing divisions', authority: 'Support customer service and recommend resolutions.', status: 'Proposed', responsibilities: ['Develop customer service standards', 'Analyse customer feedback', 'Prepare response templates', 'Identify recurring complaints'], permissions: ['Review authorised customer feedback', 'Draft customer responses', 'Recommend service improvements'], approvals: ['Refunds and compensation', 'Sensitive customer disputes', 'Changes to customer policies'] },
  { id: 'investment', name: 'Investment Advisor', title: 'Investment Research & Risk Analyst', department: 'Investment Intelligence', supervisor: 'Group CEO', division: 'Group treasury and investment research', authority: 'Research and advise only; no authority to trade or transfer funds.', status: 'Proposed', responsibilities: ['Research investment opportunities', 'Compare risk and potential returns', 'Prepare evidence-based investment reports', 'Monitor approved watchlists'], permissions: ['Research public market information', 'Prepare investment comparisons', 'Recommend opportunities'], approvals: ['Every investment decision', 'Trades and asset purchases', 'Movement of company funds'] },
  { id: 'legal', name: 'Legal Advisor', title: 'Legal Research & Compliance Advisor', department: 'Legal & Compliance', supervisor: 'Group CEO', division: 'All Dreypella divisions', authority: 'Research and draft for review; cannot act as company lawyer or make legal commitments.', status: 'Proposed', responsibilities: ['Research applicable laws', 'Review contracts and policies', 'Prepare compliance checklists', 'Identify legal risks and deadlines'], permissions: ['Research authoritative legal sources', 'Review authorised documents', 'Prepare draft documents'], approvals: ['Signing agreements', 'Legal filings and submissions', 'Settlements and legal commitments'] },
  { id: 'research', name: 'Research Centre', title: 'Research Analyst', department: 'Research & Intelligence', supervisor: 'Group Strategy Officer', division: 'Group-wide research', authority: 'Gather evidence and prepare research reports.', status: 'Proposed', responsibilities: ['Research industries and markets', 'Verify sources and dates', 'Prepare research summaries', 'Identify information gaps'], permissions: ['Research public sources', 'Prepare reports', 'Recommend further investigation'], approvals: ['Paid research subscriptions', 'External publication', 'Disclosure of confidential research'] },
  { id: 'campus', name: 'Campus Division Coordinator', title: 'Division Operations Coordinator', department: 'Division Operations', supervisor: 'Group COO', division: 'Dreypella Campus', authority: 'Coordinate Campus workflows after formal integration and delegation.', status: 'Proposed', responsibilities: ['Monitor Campus operations', 'Coordinate approved campus projects', 'Report division performance', 'Identify student and vendor needs'], permissions: ['Review authorised Campus reports', 'Prepare operational recommendations', 'Coordinate approved tasks'], approvals: ['Changes to live Campus services', 'Payments and refunds', 'Partner agreements'] },
  {"id":"personal-assistant","name":"AI Personal Assistant","title":"Group CEO Executive Assistant","department":"Executive Office","supervisor":"Group CEO","division":"Group Executive Office","authority":"Serve as the CEO’s primary coordination point. Organise information and route authorised instructions; cannot independently approve restricted decisions or make company commitments.","status":"Proposed","responsibilities":["Manage the CEO’s schedule, reminders and priorities","Prepare daily and weekly executive briefings","Receive and organise instructions from the CEO","Identify the appropriate department for each assignment","Coordinate authorised work and follow up on progress","Prepare meeting agendas, correspondence and decision briefs","Maintain an organised executive action and decision register"],"permissions":["Prepare schedules, reports and task drafts","Use information the CEO has authorised","Coordinate proposed assignments between departments","Request progress updates and compile responses"],"approvals":["Sending sensitive or external communications","Approving expenditure or financial transactions","Signing agreements or making company commitments","Changing employee permissions or reporting authority","Production deployments and live-service changes"]},
  {"id":"software-lead","name":"Software Engineering Lead","title":"Software Engineering Manager","department":"Technology & Digital Systems","supervisor":"Chief Technology Officer","division":"Group-wide software projects","authority":"Plan and coordinate approved software engineering work. Production releases require approval.","status":"Proposed","responsibilities":["Break technical projects into engineering tasks","Coordinate software developers","Review code structure and engineering standards","Maintain technical documentation","Report project progress and engineering risks"],"permissions":["Prepare code and technical plans","Review proposed code changes","Coordinate approved development tasks"],"approvals":["Production releases","Changes to critical architecture","External development expenditure"]},
  {"id":"web-developer","name":"Web Developer","title":"Web Development Engineer","department":"Technology & Digital Systems","supervisor":"Software Engineering Lead","division":"Company websites, portals and web applications","authority":"Develop and maintain approved web projects in controlled development environments.","status":"Proposed","responsibilities":["Build and maintain company websites and web applications","Develop new HQ pages, modules and features","Create responsive interfaces for mobile and desktop","Fix website bugs and improve performance","Support search engine optimisation and accessibility","Document reusable components and web projects"],"permissions":["Prepare frontend and backend code","Work on approved repositories and development environments","Submit changes for code review"],"approvals":["Production deployment","Changes to live customer systems","Access to sensitive production data"]},
  {"id":"mobile-developer","name":"Mobile App Developer","title":"Mobile Application Engineer","department":"Technology & Digital Systems","supervisor":"Software Engineering Lead","division":"Android and iOS applications","authority":"Develop and test approved mobile applications; store releases require approval.","status":"Proposed","responsibilities":["Build Android and iOS applications","Develop mobile app features and interfaces","Integrate approved APIs","Test app performance and compatibility","Maintain mobile technical documentation"],"permissions":["Prepare application code","Use approved development tools","Submit test builds for review"],"approvals":["Publishing app releases","Live payment or customer-data integrations","Paid developer services"]},
  {"id":"backend-developer","name":"Backend & API Developer","title":"Backend Software Engineer","department":"Technology & Digital Systems","supervisor":"Software Engineering Lead","division":"Group platforms, APIs and business systems","authority":"Develop approved backend services and integrations using authorised development data.","status":"Proposed","responsibilities":["Build APIs and backend services","Implement approved business logic","Develop authentication and access-control features","Design database interactions","Prepare secure integrations between Dreypella divisions","Document backend systems"],"permissions":["Prepare backend code","Test with approved sample data","Submit code for review"],"approvals":["Production database changes","Sensitive data access","Live payment and external service integrations"]},
  {"id":"uiux-designer","name":"UI/UX Designer","title":"User Interface and Experience Designer","department":"Technology & Digital Systems","supervisor":"Software Engineering Lead","division":"All Dreypella digital products","authority":"Design user experiences and interface systems within approved brand guidelines.","status":"Proposed","responsibilities":["Design website and application interfaces","Create user journeys and wireframes","Maintain reusable design systems","Research usability problems","Collaborate with developers and product teams"],"permissions":["Prepare design concepts and prototypes","Review usability and accessibility","Recommend interface improvements"],"approvals":["Major brand identity changes","Public release of new product designs"]},
  {"id":"qa-engineer","name":"QA & Testing Engineer","title":"Quality Assurance Engineer","department":"Technology & Digital Systems","supervisor":"Chief Technology Officer","division":"All technology projects","authority":"Test software and report defects independently. Cannot authorise production releases.","status":"Proposed","responsibilities":["Prepare test plans and test cases","Test new features and bug fixes","Verify mobile and web compatibility","Record defects and reproduction steps","Prepare release-readiness reports"],"permissions":["Test approved development builds","Record and report defects","Request corrections and retesting"],"approvals":["Final production release","Acceptance of unresolved critical defects"]},
  {"id":"devops-engineer","name":"DevOps & Infrastructure Engineer","title":"DevOps and Cloud Infrastructure Engineer","department":"Technology & Digital Systems","supervisor":"Chief Technology Officer","division":"Group hosting and infrastructure","authority":"Prepare and maintain approved development infrastructure. Live infrastructure changes require approval.","status":"Proposed","responsibilities":["Plan hosting and infrastructure","Maintain development and testing environments","Prepare deployment pipelines","Monitor reliability and backups","Document infrastructure and recovery procedures"],"permissions":["Prepare infrastructure configurations","Monitor authorised development environments","Recommend security and reliability improvements"],"approvals":["Production deployment","Infrastructure expenditure","Changes affecting live services or data"]},
  {"id":"data-integration","name":"Database & Integration Engineer","title":"Data Systems and Integration Engineer","department":"Technology & Digital Systems","supervisor":"Chief Technology Officer","division":"Group databases and system integrations","authority":"Design and test approved data systems. Access to confidential or production data requires approval.","status":"Proposed","responsibilities":["Design database structures","Plan secure data exchange between divisions","Develop approved system integrations","Prepare data backup and recovery plans","Document data architecture"],"permissions":["Prepare database designs","Test integrations with approved sample data","Recommend data-quality improvements"],"approvals":["Production database access","Changes to live records","External data-sharing arrangements"]},
  {"id":"innovation-director","name":"Chief Innovation Officer","title":"Chief Innovation Officer","department":"Technological Advancement & Innovation","supervisor":"Group CEO","division":"Group research, invention and technology development","authority":"Lead approved research and innovation projects. New products, major expenditure and commercial commitments require CEO approval.","status":"Proposed","responsibilities":["Lead the Technological Advancement & Innovation Department","Identify emerging technology opportunities","Coordinate research, invention and prototype projects","Evaluate technical feasibility and commercial potential","Collaborate with the CTO when research requires production software","Present innovation roadmaps and research reports"],"permissions":["Research emerging technologies","Prepare innovation proposals and project plans","Coordinate approved research assignments"],"approvals":["Major research expenditure","Commercialisation and product launches","Patents, licensing and intellectual property commitments"]},
  {"id":"rd-engineer","name":"Research & Development Engineer","title":"R&D Engineer","department":"Technological Advancement & Innovation","supervisor":"Chief Innovation Officer","division":"New technology research and development","authority":"Research and develop approved technology concepts and engineering solutions.","status":"Proposed","responsibilities":["Investigate technical problems and opportunities","Develop engineering concepts","Evaluate technical feasibility","Prepare research documentation","Collaborate on prototypes"],"permissions":["Conduct approved technical research","Prepare designs and engineering reports","Recommend experiments"],"approvals":["Paid laboratory resources","External research partnerships","High-cost prototype development"]},
  {"id":"ai-research","name":"AI Research Engineer","title":"Artificial Intelligence Research Engineer","department":"Technological Advancement & Innovation","supervisor":"Chief Innovation Officer","division":"Advanced AI research and new AI products","authority":"Research and prototype AI capabilities within approved data and computing boundaries.","status":"Proposed","responsibilities":["Research advanced AI methods","Develop experimental AI prototypes","Evaluate model performance and limitations","Research intelligent automation opportunities","Document safety and reliability risks"],"permissions":["Use approved research datasets","Prepare experimental code","Run authorised prototype evaluations"],"approvals":["Paid model or compute services","Use of sensitive company data","Release of AI products to customers"]},
  {"id":"robotics-engineer","name":"Robotics & Automation Engineer","title":"Robotics and Automation Engineer","department":"Technological Advancement & Innovation","supervisor":"Chief Innovation Officer","division":"Robotics and physical automation","authority":"Research and prototype robotics and automation systems under approved safety controls.","status":"Proposed","responsibilities":["Research robotics and autonomous systems","Design automation concepts","Develop prototype control systems","Evaluate safety and reliability","Explore logistics and delivery automation"],"permissions":["Prepare simulations and prototype designs","Conduct approved experiments","Recommend robotics solutions"],"approvals":["Physical deployment","Purchase of expensive hardware","Experiments involving public or workplace safety"]},
  {"id":"hardware-engineer","name":"Hardware & Electronics Engineer","title":"Hardware and Electronics Development Engineer","department":"Technological Advancement & Innovation","supervisor":"Chief Innovation Officer","division":"Electronic devices and hardware products","authority":"Design and test approved hardware concepts with appropriate electrical and physical safety controls.","status":"Proposed","responsibilities":["Design electronic systems and circuits","Research sensors and embedded devices","Develop hardware prototypes","Evaluate component reliability","Prepare hardware specifications"],"permissions":["Prepare circuit designs and simulations","Recommend components","Conduct approved low-risk tests"],"approvals":["Hardware purchases","High-voltage or hazardous testing","Commercial hardware production"]},
  {"id":"emerging-tech","name":"Emerging Technology Researcher","title":"Emerging Technology Research Specialist","department":"Technological Advancement & Innovation","supervisor":"Chief Innovation Officer","division":"Future technology opportunities","authority":"Monitor and evaluate emerging technologies and prepare evidence-based recommendations.","status":"Proposed","responsibilities":["Track emerging technology developments","Evaluate new tools and scientific advances","Identify opportunities for Dreypella","Compare technical maturity and adoption risks","Prepare opportunity reports"],"permissions":["Research public information","Prepare technology comparisons","Recommend areas for experimentation"],"approvals":["Paid research subscriptions","External technology partnerships","Investment in new technologies"]},
  {"id":"prototype-engineer","name":"Prototype Development Engineer","title":"Prototype and Product Development Engineer","department":"Technological Advancement & Innovation","supervisor":"Chief Innovation Officer","division":"Experimental products and prototypes","authority":"Turn approved concepts into testable prototypes; production and public testing require approval.","status":"Proposed","responsibilities":["Convert research concepts into prototypes","Coordinate prototype development","Record test results and improvements","Work with hardware and software teams","Prepare prototype demonstration reports"],"permissions":["Build approved low-risk prototypes","Prepare technical demonstrations","Recommend design improvements"],"approvals":["Prototype expenditure","Public testing","Manufacturing or product release"]},
  {"id":"ai-educator","name":"AI Educator","title":"CEO Education & Corporate Learning Advisor","department":"Executive Office","supervisor":"Group CEO","division":"CEO development and group-wide corporate learning","authority":"Teach, assess and improve organisational knowledge. May recommend learning plans and training updates, but cannot silently change employee permissions, core instructions or governance rules.","status":"Proposed","responsibilities":["Provide the CEO with structured education in leadership, strategy, finance, technology, law, governance and innovation","Adapt lessons to the learner's current knowledge and learning goals","Prepare practical lessons, case studies, exercises and assessments","Identify knowledge gaps across departments and recommend targeted training","Coordinate role-specific learning programmes for AI and human employees","Maintain learning progress, assessment results and improvement recommendations","Challenge weak assumptions and explain complex subjects clearly"],"permissions":["Use authorised company learning materials and approved public research","Prepare training materials and learning assessments","Recommend improvements to learning methods and procedures","Prepare learning progress reports for authorised reviewers"],"approvals":["Changes to employee core instructions or permissions","Use of confidential information outside authorised learning purposes","Paid courses, subscriptions or training expenditure","External publication of company learning materials"]},
]

function App({ user, onLogout }: { user: AuthenticatedUser; onLogout: () => void }) {
  const initials = user.displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || 'HQ'
  const firstName = user.displayName.trim().split(/\s+/)[0] || 'there'
  const [active, setActive] = useState('CEO Dashboard')
  const [tasks, setTasks] = useState(initialTasks)
  const [query, setQuery] = useState('')
  const [command, setCommand] = useState('')
  const [messages, setMessages] = useState([
    { from: 'Personal Assistant', text: 'Welcome to Dreypella HQ. I am your proposed AI Personal Assistant. I will serve as your primary executive coordination point. The AI engine is not connected yet, so I cannot currently route or execute instructions.' },
  ])
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [workforceSearch, setWorkforceSearch] = useState('')

  const completed = tasks.filter(task => task.done).length
  const filteredWorkforce = useMemo(() => workforce.filter(employee => `${employee.name} ${employee.title} ${employee.department} ${employee.division}`.toLowerCase().includes(workforceSearch.toLowerCase())), [workforceSearch])
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

  function toggleTask(id: number) {
    setTasks(previous => previous.map(task => task.id === id ? { ...task, done: !task.done } : task))
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
                  <div className="task-progress"><div><span>Project progress</span><strong>{Math.round(completed / tasks.length * 100)}%</strong></div><div className="progress-track"><div style={{ width: `${completed / tasks.length * 100}%` }} /></div></div>
                  {tasks.slice(0, 4).map(task => (
                    <div className="task-row" key={task.id}>
                      <button className={`task-check ${task.done ? 'checked' : ''}`} onClick={() => toggleTask(task.id)}>{task.done ? '✓' : ''}</button>
                      <div className="task-info"><strong className={task.done ? 'task-done' : ''}>{task.title}</strong><span>{task.department}</span></div>
                      <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
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
                  <span className="planned-badge">NOT CONNECTED</span>
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

              <div className="workforce-notice"><strong>Management prototype</strong><span>These are proposed AI positions. No employee is currently connected to an AI model, company database or execution system.</span></div>

              <div className="workforce-stats">
                <div className="panel workforce-stat"><span>Proposed positions</span><strong>{workforce.length.toString().padStart(2, '0')}</strong></div>
                <div className="panel workforce-stat"><span>Connected AI employees</span><strong>00</strong></div>
                <div className="panel workforce-stat"><span>Reporting to CEO</span><strong>{workforce.filter(employee => employee.supervisor === 'Group CEO').length.toString().padStart(2, '0')}</strong></div>
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

              <div className="workforce-directory-heading"><div><h3>AI employee directory</h3><p>Select an employee to inspect their role and authority.</p></div><span className="planned-badge">ALL PROPOSED</span></div>
              <input className="search-input workforce-search" value={workforceSearch} onChange={e => setWorkforceSearch(e.target.value)} placeholder="Search by employee, role, department or division..." />

              <div className="employee-grid workforce-grid">
                {filteredWorkforce.map(employee => (
                  <button className={selectedEmployeeId === employee.id ? 'employee-card workforce-card workforce-selected' : 'employee-card workforce-card'} key={employee.id} onClick={() => setSelectedEmployeeId(selectedEmployeeId === employee.id ? null : employee.id)}>
                    <div className="employee-icon">✳</div>
                    <span className="planned-badge">NOT CONNECTED</span>
                    <h3>{employee.name}</h3>
                    <p>{employee.title}</p>
                    <small>{employee.department} · Reports to {employee.supervisor}</small>
                    <span className="workforce-view">View employee profile →</span>
                  </button>
                ))}
              </div>
              {filteredWorkforce.length === 0 && <div className="panel workforce-empty">No proposed employee matches that search.</div>}

              {selectedEmployee && (
                <section className="panel employee-detail">
                  <div className="employee-detail-top">
                    <div><div className="eyebrow">EMPLOYEE PROFILE</div><h2>{selectedEmployee.name}</h2><p>{selectedEmployee.title}</p></div>
                    <button className="detail-close" onClick={() => setSelectedEmployeeId(null)}>Close ×</button>
                  </div>
                  <div className="employee-meta-grid">
                    <div><small>Department</small><strong>{selectedEmployee.department}</strong></div>
                    <div><small>Reports to</small><strong>{selectedEmployee.supervisor}</strong></div>
                    <div><small>Assigned division</small><strong>{selectedEmployee.division}</strong></div>
                    <div><small>Connection status</small><strong>Not connected · Proposed</strong></div>
                  </div>
                  <div className="employee-detail-columns">
                    <div><h3>Responsibilities</h3><ul>{selectedEmployee.responsibilities.map(item => <li key={item}>{item}</li>)}</ul></div>
                    <div><h3>Authority boundary</h3><p>{selectedEmployee.authority}</p><h3>Permitted activities (proposed)</h3><ul>{selectedEmployee.permissions.map(item => <li key={item}>{item}</li>)}</ul></div>
                    <div><h3>Human approval required</h3><ul>{selectedEmployee.approvals.map(item => <li key={item}>{item}</li>)}</ul></div>
                  </div>
                  <div className="employee-detail-warning">No permissions are technically enforced yet. These are proposed governance rules that must be implemented in the secure backend before any AI employee is activated.</div>
                </section>
              )}
            </div>
          )}

          {active === 'Departments' && (
            <div className="page-content"><div className="eyebrow">ORGANISATIONAL STRUCTURE</div><h1>Departments</h1><p className="page-subtitle">The functional teams responsible for running the group.</p><div className="employee-grid">{departments.map(d => <div className="employee-card" key={d.name}><div className="employee-icon">{d.icon}</div><span className="planned-badge">PLANNED</span><h3>{d.name}</h3><p>{d.role}</p><small>Department leadership to be configured</small></div>)}</div></div>
          )}

          {active === 'Business Divisions' && (
            <div className="page-content"><div className="eyebrow">GROUP PORTFOLIO</div><h1>Business Divisions</h1><p className="page-subtitle">Manage all present and future Dreypella ventures from one place.</p><div className="division-grid large">{divisions.map(d => <div className="division-card" key={d.name}><span className="division-icon">{d.icon}</span><strong>{d.name}</strong><p>{d.description}</p><span className="division-state">{d.state}</span></div>)}</div></div>
          )}

          {active === 'Tasks & Projects' && (
            <div className="page-content"><div className="eyebrow">WORK MANAGEMENT</div><h1>Tasks & Projects</h1><p className="page-subtitle">Monitor and update the initial headquarters task list.</p><div className="panel full-panel"><div className="panel-heading"><div><h3>HQ development tasks</h3><p>{completed} of {tasks.length} completed</p></div></div><input className="search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks or departments..." />{filteredTasks.map(task => <div className="task-row" key={task.id}><button className={`task-check ${task.done ? 'checked' : ''}`} onClick={() => toggleTask(task.id)}>{task.done ? '✓' : ''}</button><div className="task-info"><strong className={task.done ? 'task-done' : ''}>{task.title}</strong><span>{task.department}</span></div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span></div>)}</div></div>
          )}


          {active === 'Investment Intelligence' && (
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
