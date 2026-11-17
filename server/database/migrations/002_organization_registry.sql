CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  department_type TEXT NOT NULL DEFAULT 'operational'
    CHECK(department_type IN ('executive','operational','advisory','specialist')),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK(status IN ('planned','active','paused')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workforce_positions (
  id TEXT PRIMARY KEY,
  position_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  supervisor_title TEXT NOT NULL DEFAULT 'Group CEO',
  division_scope TEXT NOT NULL DEFAULT 'Group-wide',
  authority TEXT NOT NULL DEFAULT '',
  responsibilities_json TEXT NOT NULL DEFAULT '[]'
    CHECK(json_valid(responsibilities_json)),
  capabilities_json TEXT NOT NULL DEFAULT '[]'
    CHECK(json_valid(capabilities_json)),
  approval_boundaries_json TEXT NOT NULL DEFAULT '[]'
    CHECK(json_valid(approval_boundaries_json)),
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK(status IN ('proposed','approved','retired')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_departments_status
  ON departments(status);

CREATE INDEX IF NOT EXISTS idx_positions_department
  ON workforce_positions(department_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_positions_status
  ON workforce_positions(status);

INSERT OR IGNORE INTO permissions (id, description) VALUES
('departments.read', 'Read the company department registry.'),
('departments.manage', 'Create and manage company departments.'),
('workforce.read', 'Read proposed positions and AI workforce records.'),
('workforce.manage', 'Manage workforce positions and organizational assignments.');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, granted_at)
SELECT 'ceo', id, '2026-11-12T00:00:00.000Z'
FROM permissions
WHERE id IN (
  'departments.read',
  'departments.manage',
  'workforce.read',
  'workforce.manage'
);

INSERT OR IGNORE INTO departments
(id, code, name, description, department_type, created_at, updated_at)
VALUES
('executive-office','EXEC','Executive Office','CEO support, executive coordination and corporate learning.','executive','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('human-resources','HR','Human Resources','Recruitment, workforce administration and people operations.','operational','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('finance-accounting','FIN','Finance & Accounting','Financial planning, accounting, budgeting and financial controls.','operational','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('marketing','MKT','Marketing','Brand management, content, campaigns and audience development.','operational','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('sales','SALES','Sales','Sales strategy, customer acquisition and commercial opportunities.','operational','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('operations','OPS','Operations','Group-wide operating procedures and service delivery.','operational','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('technology','TECH','Technology & Digital Systems','Software, infrastructure, engineering and information systems.','operational','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('innovation','INNOV','Technological Advancement & Innovation','Research, invention, prototypes and emerging technologies.','specialist','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('business-development','BIZDEV','Business Development & Strategy','Group strategy, expansion and business opportunity research.','operational','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('customer-relations','CX','Customer Relations','Customer experience, support and service improvement.','operational','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('legal-compliance','LEGAL','Legal & Compliance','Independent legal research, compliance and risk advisory.','advisory','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('investment-intelligence','INVEST','Investment Intelligence','Investment research, opportunity discovery and risk advice.','advisory','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('financial-trading','TRADING','Financial Trading','Governed company-funded trading research, risk management and execution.','specialist','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('research-intelligence','RESEARCH','Research & Intelligence','Evidence-based research and company intelligence.','specialist','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('division-operations','DIVOPS','Division Operations','Operational coordination across Dreypella business divisions.','operational','2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z');

INSERT OR IGNORE INTO workforce_positions
(id, position_code, name, title, department_id, supervisor_title, division_scope, sort_order, created_at, updated_at)
VALUES
('coo','EXEC-COO','Chief Operating Officer','Group COO','executive-office','Group CEO','All Dreypella divisions',1,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('personal-assistant','EXEC-PA','AI Personal Assistant','Group CEO Executive Assistant','executive-office','Group CEO','Group Executive Office',2,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('ai-educator','EXEC-EDU','AI Educator','CEO Education & Corporate Learning Advisor','executive-office','Group CEO','Executive development and group learning',3,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('hr','HR-DIR','Human Resources','HR Director','human-resources','Group COO','All Dreypella divisions',4,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('cfo','FIN-CFO','Finance & Accounting','Chief Financial Officer','finance-accounting','Group CEO','All Dreypella divisions',5,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('marketing','MKT-DIR','Marketing','Marketing Director','marketing','Group COO','All Dreypella divisions',6,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('sales','SALES-DIR','Sales','Sales Director','sales','Group COO','All Dreypella divisions',7,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('operations','OPS-DIR','Operations','Operations Director','operations','Group COO','All Dreypella divisions',8,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('strategy','BIZDEV-CSO','Strategy & Research','Chief Strategy Officer','business-development','Group CEO','Group strategy and expansion',9,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('customer','CX-DIR','Customer Relations','Customer Experience Director','customer-relations','Group COO','All customer-facing divisions',10,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('legal','LEGAL-ADV','Legal Advisor','Legal Research & Compliance Advisor','legal-compliance','Group CEO','All Dreypella divisions',11,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('investment','INVEST-ADV','Investment Advisor','Investment Research & Risk Analyst','investment-intelligence','Group CEO','Group treasury and investment research',12,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('research','RESEARCH-ANL','Research Centre','Research Analyst','research-intelligence','Chief Strategy Officer','Group-wide research',13,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('campus','DIV-CAMPUS','Campus Division Coordinator','Division Operations Coordinator','division-operations','Group COO','Dreypella Campus',14,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('cto','TECH-CTO','Chief Technology Officer','Chief Technology Officer','technology','Group CEO','All Dreypella digital platforms',15,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('software-lead','TECH-SWE','Software Engineering Lead','Software Engineering Manager','technology','Chief Technology Officer','Group-wide software projects',16,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('web-developer','TECH-WEB','Web Developer','Web Development Engineer','technology','Software Engineering Lead','Websites and web applications',17,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('mobile-developer','TECH-MOB','Mobile App Developer','Mobile Application Engineer','technology','Software Engineering Lead','Android and iOS applications',18,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('backend-developer','TECH-BACK','Backend & API Developer','Backend Software Engineer','technology','Software Engineering Lead','Group platforms and APIs',19,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('uiux-designer','TECH-UX','UI/UX Designer','User Interface and Experience Designer','technology','Software Engineering Lead','All Dreypella digital products',20,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('qa-engineer','TECH-QA','QA & Testing Engineer','Quality Assurance Engineer','technology','Chief Technology Officer','All technology projects',21,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('devops-engineer','TECH-DEVOPS','DevOps & Infrastructure Engineer','DevOps and Cloud Infrastructure Engineer','technology','Chief Technology Officer','Group hosting and infrastructure',22,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('data-integration','TECH-DATA','Database & Integration Engineer','Data Systems and Integration Engineer','technology','Chief Technology Officer','Group databases and integrations',23,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('innovation-director','INNOV-CIO','Chief Innovation Officer','Chief Innovation Officer','innovation','Group CEO','Group research and technology development',24,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('rd-engineer','INNOV-RD','Research & Development Engineer','R&D Engineer','innovation','Chief Innovation Officer','Technology research and development',25,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('ai-research','INNOV-AI','AI Research Engineer','Artificial Intelligence Research Engineer','innovation','Chief Innovation Officer','Advanced AI research',26,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('robotics-engineer','INNOV-ROB','Robotics & Automation Engineer','Robotics and Automation Engineer','innovation','Chief Innovation Officer','Robotics and physical automation',27,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('hardware-engineer','INNOV-HW','Hardware & Electronics Engineer','Hardware and Electronics Development Engineer','innovation','Chief Innovation Officer','Electronic devices and hardware',28,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('emerging-tech','INNOV-EMERGE','Emerging Technology Researcher','Emerging Technology Research Specialist','innovation','Chief Innovation Officer','Future technology opportunities',29,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('prototype-engineer','INNOV-PROT','Prototype Development Engineer','Prototype and Product Development Engineer','innovation','Chief Innovation Officer','Experimental products and prototypes',30,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('trading-cto','TRADING-CTO','Chief Trading Officer','Chief Trading Officer','financial-trading','Group CEO','Company-approved financial trading',31,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('forex-trader','TRADING-FX','Forex Trader','Foreign Exchange Trader','financial-trading','Chief Trading Officer','CEO-approved currency pairs only',32,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('metals-trader','TRADING-METALS','Metals Trader','Precious Metals Trader','financial-trading','Chief Trading Officer','CEO-approved metals only',33,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('crypto-trader','TRADING-CRYPTO','Cryptocurrency Trader','Digital Asset Trader','financial-trading','Chief Trading Officer','CEO-approved cryptocurrencies only',34,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('stock-trader','TRADING-STOCK','Stock Trader','Equities Trader','financial-trading','Chief Trading Officer','CEO-approved stocks only',35,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('trading-research','TRADING-RESEARCH','Market Research Analyst','Financial Markets Research Analyst','financial-trading','Chief Trading Officer','Approved financial instruments and markets',36,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('trading-risk','TRADING-RISK','Risk Management Officer','Financial Trading Risk Officer','financial-trading','Chief Trading Officer','All trading accounts and strategies',37,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z'),
('trading-performance','TRADING-PERF','Trading Performance Analyst','Trading Performance Analyst','financial-trading','Chief Trading Officer','All trading activity and performance records',38,'2026-11-12T00:00:00.000Z','2026-11-12T00:00:00.000Z');

-- Preserve the existing workforce catalogue and enrich every position.
UPDATE workforce_positions SET
 name='Chief Operating Officer', title='Group COO',
 authority='Coordinate approved operations and assign work within delegated limits.',
 responsibilities_json=json_array('Coordinate group-wide operations','Monitor departmental performance','Coordinate executive meetings and reports','Track execution of CEO decisions'),
 capabilities_json=json_array('Operational planning','Department coordination','Performance reporting','Task coordination'),
 approval_boundaries_json=json_array('Company-wide strategy changes','Unbudgeted expenditure','Binding commitments')
WHERE id='coo';

UPDATE workforce_positions SET
 name='Chief Technology Officer', authority='Lead group technology. Production changes and sensitive data access require approval.',
 responsibilities_json=json_array('Lead Technology & Digital Systems','Oversee websites, web applications and mobile apps','Manage software architecture, APIs and databases','Coordinate engineering, testing and infrastructure','Lead technical security and incident response planning','Support approved technology projects'),
 capabilities_json=json_array('Software architecture','Engineering leadership','Cybersecurity planning','Technical project management'),
 approval_boundaries_json=json_array('Production deployment','External service expenditure','Sensitive production data access','Critical architecture changes')
WHERE id='cto';

UPDATE workforce_positions SET
 name='Chief Financial Officer', title='Chief Financial Officer',
 authority='Analyse financial information and prepare budgets; cannot independently move company funds.',
 responsibilities_json=json_array('Prepare financial reports','Monitor budgets and cash flow','Analyse costs and revenue','Support financial planning'),
 capabilities_json=json_array('Financial analysis','Budgeting','Accounting oversight','Cash-flow forecasting'),
 approval_boundaries_json=json_array('Payments and transfers','Loans and investments','Budget changes','Opening or closing financial accounts')
WHERE id='cfo';

UPDATE workforce_positions SET
 name='HR Director', title='HR Director',
 authority='Recommend workforce policies and staffing actions.',
 responsibilities_json=json_array('Prepare role descriptions','Coordinate recruitment workflows','Maintain workforce policies','Support performance reviews'),
 capabilities_json=json_array('Recruitment coordination','Workforce planning','Policy drafting','Performance reporting'),
 approval_boundaries_json=json_array('Hiring and termination','Compensation changes','Disciplinary decisions')
WHERE id='hr';

UPDATE workforce_positions SET
 name='Marketing Director', title='Marketing Director',
 authority='Prepare marketing campaigns within approved budgets and brand guidelines.',
 responsibilities_json=json_array('Develop marketing strategies','Prepare campaign content','Analyse campaign performance','Coordinate brand consistency'),
 capabilities_json=json_array('Content creation','Campaign planning','Social media management','Marketing analytics'),
 approval_boundaries_json=json_array('Paid advertising expenditure','Sensitive public statements','Brand identity changes')
WHERE id='marketing';

UPDATE workforce_positions SET
 name='Sales Director', title='Sales Director',
 authority='Support sales planning and customer acquisition.',
 responsibilities_json=json_array('Develop sales strategies','Track sales opportunities','Prepare proposals','Monitor sales performance'),
 capabilities_json=json_array('Lead generation','Sales reporting','Proposal drafting','Customer relationship management'),
 approval_boundaries_json=json_array('Contract acceptance','Non-standard discounts','Commercial commitments')
WHERE id='sales';

UPDATE workforce_positions SET
 name='Operations Director', title='Operations Director',
 authority='Coordinate approved operating procedures and service delivery.',
 responsibilities_json=json_array('Develop operating procedures','Monitor service delivery','Identify operational bottlenecks','Coordinate division workflows'),
 capabilities_json=json_array('Process design','Operations monitoring','Workflow coordination','Service quality analysis'),
 approval_boundaries_json=json_array('Customer or partner-impacting changes','New operating expenditure','Major service changes')
WHERE id='operations';

UPDATE workforce_positions SET
 name='Chief Strategy Officer', title='Chief Strategy Officer',
 authority='Research opportunities and recommend strategic decisions.',
 responsibilities_json=json_array('Research markets and competitors','Prepare expansion strategies','Evaluate business opportunities','Monitor strategic risks'),
 capabilities_json=json_array('Market research','Strategic planning','Business case development','Opportunity assessment'),
 approval_boundaries_json=json_array('Partnership agreements','Market entry commitments','Acquisitions and major investments')
WHERE id='strategy';

UPDATE workforce_positions SET
 name='Customer Experience Director', title='Customer Experience Director',
 authority='Support customer service and recommend resolutions.',
 responsibilities_json=json_array('Develop customer service standards','Analyse customer feedback','Prepare response templates','Identify recurring complaints'),
 capabilities_json=json_array('Customer support','Complaint analysis','Response drafting','Service improvement'),
 approval_boundaries_json=json_array('Refunds and compensation','Sensitive customer disputes','Customer policy changes')
WHERE id='customer';

UPDATE workforce_positions SET
 name='Investment Research & Risk Analyst', title='Investment Research & Risk Analyst',
 authority='Research and advise only; no authority to trade, invest or transfer funds.',
 responsibilities_json=json_array('Research investment opportunities','Compare risk and potential returns','Prepare evidence-based investment reports','Monitor approved watchlists'),
 capabilities_json=json_array('Investment research','Risk comparison','Market monitoring','Investment reporting'),
 approval_boundaries_json=json_array('Every investment decision','Trades and asset purchases','Movement of company funds')
WHERE id='investment';

UPDATE workforce_positions SET
 name='Legal Research & Compliance Advisor', title='Legal Research & Compliance Advisor',
 authority='Research and draft for review; cannot act as company lawyer or make legal commitments.',
 responsibilities_json=json_array('Research applicable laws','Review contracts and policies','Prepare compliance checklists','Identify legal risks and deadlines'),
 capabilities_json=json_array('Legal research','Document review','Compliance monitoring','Risk reporting'),
 approval_boundaries_json=json_array('Signing agreements','Legal filings and submissions','Settlements and legal commitments')
WHERE id='legal';

UPDATE workforce_positions SET
 name='Research Analyst', title='Research Analyst',
 authority='Gather evidence and prepare research reports.',
 responsibilities_json=json_array('Research industries and markets','Verify sources and dates','Prepare research summaries','Identify information gaps'),
 capabilities_json=json_array('Desk research','Source verification','Data analysis','Research writing'),
 approval_boundaries_json=json_array('Paid research subscriptions','External publication','Disclosure of confidential research')
WHERE id='research';

UPDATE workforce_positions SET
 name='Campus Division Coordinator', title='Division Operations Coordinator',
 authority='Coordinate Campus workflows after formal integration and delegation.',
 responsibilities_json=json_array('Monitor Campus operations','Coordinate approved campus projects','Report division performance','Identify student and vendor needs'),
 capabilities_json=json_array('Campus operations','Project coordination','Service monitoring','Stakeholder reporting'),
 approval_boundaries_json=json_array('Changes to live Campus services','Payments and refunds','Partner agreements')
WHERE id='campus';

UPDATE workforce_positions SET
 name='AI Personal Assistant', title='Group CEO Executive Assistant',
 authority='Coordinate the CEO office; cannot approve restricted decisions or make company commitments.',
 responsibilities_json=json_array('Manage CEO schedule and priorities','Prepare executive briefings','Organise CEO instructions','Route assignments to departments','Track authorised work','Prepare agendas and correspondence','Maintain executive action register'),
 capabilities_json=json_array('Executive assistance','Scheduling','Task coordination','Briefing preparation','Progress tracking'),
 approval_boundaries_json=json_array('Sensitive external communications','Expenditure and financial transactions','Agreements and company commitments','Employee permissions','Production deployments')
WHERE id='personal-assistant';

UPDATE workforce_positions SET
 name='Software Engineering Lead',
 responsibilities_json=json_array('Break projects into engineering tasks','Coordinate developers','Review code and standards','Maintain technical documentation','Report progress and engineering risks'),
 capabilities_json=json_array('Engineering leadership','Code review','Technical planning','Developer coordination'),
 approval_boundaries_json=json_array('Production releases','Critical architecture changes','External development expenditure')
WHERE id='software-lead';

UPDATE workforce_positions SET
 name='Web Development Engineer',
 responsibilities_json=json_array('Build and maintain websites and web applications','Develop HQ modules and features','Create responsive interfaces','Fix bugs and improve performance','Support SEO and accessibility','Document reusable components'),
 capabilities_json=json_array('Frontend development','Backend web development','Responsive design','Accessibility','Web performance'),
 approval_boundaries_json=json_array('Production deployment','Changes to live customer systems','Sensitive production data access')
WHERE id='web-developer';

UPDATE workforce_positions SET
 name='Mobile Application Engineer',
 responsibilities_json=json_array('Build Android and iOS applications','Develop mobile features and interfaces','Integrate approved APIs','Test performance and compatibility','Maintain mobile documentation'),
 capabilities_json=json_array('Android development','iOS development','Mobile testing','API integration'),
 approval_boundaries_json=json_array('Publishing app releases','Live payment or customer-data integrations','Paid developer services')
WHERE id='mobile-developer';

UPDATE workforce_positions SET
 name='Backend & API Developer',
 responsibilities_json=json_array('Build APIs and backend services','Implement approved business logic','Develop authentication and access controls','Design database interactions','Prepare secure integrations','Document backend systems'),
 capabilities_json=json_array('API engineering','Backend development','Database design','Authentication systems','Integration engineering'),
 approval_boundaries_json=json_array('Production database changes','Sensitive data access','Live payment and external integrations')
WHERE id='backend-developer';

UPDATE workforce_positions SET
 name='UI/UX Designer',
 responsibilities_json=json_array('Design product interfaces','Create user journeys and wireframes','Maintain design systems','Research usability problems','Collaborate with developers'),
 capabilities_json=json_array('Interface design','User research','Prototyping','Design systems','Accessibility'),
 approval_boundaries_json=json_array('Major brand identity changes','Public release of new product designs')
WHERE id='uiux-designer';

UPDATE workforce_positions SET
 name='QA & Testing Engineer',
 responsibilities_json=json_array('Prepare test plans and cases','Test features and bug fixes','Verify web and mobile compatibility','Record reproducible defects','Prepare release-readiness reports'),
 capabilities_json=json_array('Software testing','Quality assurance','Test automation','Defect reporting'),
 approval_boundaries_json=json_array('Final production release','Acceptance of unresolved critical defects')
WHERE id='qa-engineer';

UPDATE workforce_positions SET
 name='DevOps & Infrastructure Engineer',
 responsibilities_json=json_array('Plan hosting and infrastructure','Maintain development environments','Prepare deployment pipelines','Monitor reliability and backups','Document recovery procedures'),
 capabilities_json=json_array('Infrastructure planning','CI/CD','Monitoring','Backup and recovery','Deployment preparation'),
 approval_boundaries_json=json_array('Production deployment','Infrastructure expenditure','Changes affecting live services or data')
WHERE id='devops-engineer';

UPDATE workforce_positions SET
 name='Database & Integration Engineer',
 responsibilities_json=json_array('Design database structures','Plan secure data exchange','Develop approved integrations','Prepare backup and recovery plans','Document data architecture'),
 capabilities_json=json_array('Database engineering','Data modelling','System integration','Data quality'),
 approval_boundaries_json=json_array('Production database access','Changes to live records','External data-sharing arrangements')
WHERE id='data-integration';

UPDATE workforce_positions SET
 name='Chief Innovation Officer',
 responsibilities_json=json_array('Lead innovation department','Identify emerging technologies','Coordinate research and prototypes','Evaluate technical and commercial feasibility','Present innovation roadmaps'),
 capabilities_json=json_array('Innovation strategy','Research leadership','Technology evaluation','Prototype coordination'),
 approval_boundaries_json=json_array('Major research expenditure','Commercialisation and product launches','Intellectual property commitments')
WHERE id='innovation-director';

UPDATE workforce_positions SET
 name='R&D Engineer',
 responsibilities_json=json_array('Investigate technical problems','Develop engineering concepts','Evaluate feasibility','Prepare research documentation','Collaborate on prototypes'),
 capabilities_json=json_array('Engineering research','Technical design','Feasibility studies','Prototype support'),
 approval_boundaries_json=json_array('Paid laboratory resources','External research partnerships','High-cost prototype development')
WHERE id='rd-engineer';

UPDATE workforce_positions SET
 name='AI Research Engineer',
 responsibilities_json=json_array('Research AI methods','Develop experimental prototypes','Evaluate model performance','Research intelligent automation','Document safety and reliability risks'),
 capabilities_json=json_array('AI research','Model evaluation','Prototyping','AI safety assessment'),
 approval_boundaries_json=json_array('Paid model or compute services','Sensitive company data','Customer-facing AI product releases')
WHERE id='ai-research';

UPDATE workforce_positions SET
 name='Robotics & Automation Engineer',
 responsibilities_json=json_array('Research robotics and autonomous systems','Design automation concepts','Develop prototype controls','Evaluate safety and reliability','Explore logistics automation'),
 capabilities_json=json_array('Robotics research','Automation design','Simulation','Control systems'),
 approval_boundaries_json=json_array('Physical deployment','Expensive hardware purchases','Public or workplace safety experiments')
WHERE id='robotics-engineer';

UPDATE workforce_positions SET
 name='Hardware & Electronics Engineer',
 responsibilities_json=json_array('Design electronic systems and circuits','Research sensors and embedded devices','Develop hardware prototypes','Evaluate component reliability','Prepare specifications'),
 capabilities_json=json_array('Circuit design','Embedded systems','Electronics testing','Hardware prototyping'),
 approval_boundaries_json=json_array('Hardware purchases','High-voltage or hazardous testing','Commercial hardware production')
WHERE id='hardware-engineer';

UPDATE workforce_positions SET
 name='Emerging Technology Researcher',
 responsibilities_json=json_array('Track emerging technologies','Evaluate tools and scientific advances','Identify opportunities','Compare maturity and adoption risks','Prepare opportunity reports'),
 capabilities_json=json_array('Technology scanning','Trend analysis','Technical comparison','Opportunity research'),
 approval_boundaries_json=json_array('Paid research subscriptions','External technology partnerships','Investment in new technologies')
WHERE id='emerging-tech';

UPDATE workforce_positions SET
 name='Prototype Development Engineer',
 responsibilities_json=json_array('Convert concepts into prototypes','Coordinate prototype development','Record test results','Collaborate with hardware and software teams','Prepare demonstrations'),
 capabilities_json=json_array('Prototype design','Product development','Testing','Technical documentation'),
 approval_boundaries_json=json_array('Prototype expenditure','Public testing','Manufacturing or product release')
WHERE id='prototype-engineer';

UPDATE workforce_positions SET
 name='AI Educator', title='CEO Education & Corporate Learning Advisor',
 authority='Teach and assess; may recommend learning plans but cannot change employee permissions or governance rules.',
 responsibilities_json=json_array('Teach leadership, strategy, finance, technology, law and governance','Adapt lessons to learner goals','Prepare exercises and assessments','Identify organisational knowledge gaps','Coordinate role-specific learning','Track learning progress','Challenge weak assumptions'),
 capabilities_json=json_array('Instructional design','Research','Assessment','Corporate learning','Knowledge management'),
 approval_boundaries_json=json_array('Changes to employee instructions or permissions','Confidential information use','Paid courses or subscriptions','External publication')
WHERE id='ai-educator';

-- Trading positions: research and simulation first; no autonomous live execution
-- is enabled by this organizational catalogue.
UPDATE workforce_positions SET
 authority='Lead trading research and controls. Live trading remains disabled until CEO-approved simulation, controlled pilot, capital allocation and risk limits are in place.',
 responsibilities_json=json_array('Lead the Financial Trading Department','Coordinate specialist traders and analysts','Maintain trading governance','Report performance and risk to the CEO','Enforce approved account and instrument boundaries'),
 capabilities_json=json_array('Trading governance','Team coordination','Risk oversight','Performance reporting'),
 approval_boundaries_json=json_array('Broker and account selection','Capital allocation','Live execution activation','Risk-limit changes','Withdrawals and fund transfers')
WHERE id='trading-cto';

UPDATE workforce_positions SET
 authority='Research and simulate only until separately authorised for a controlled live pilot. Company funds only; no personal funds.',
 responsibilities_json=json_array('Research approved currency pairs','Develop and test trading strategies in simulation','Record trade hypotheses and results','Follow instrument and risk restrictions'),
 capabilities_json=json_array('Foreign exchange research','Technical analysis','Strategy backtesting','Trade journaling'),
 approval_boundaries_json=json_array('Live trade execution','Changes to risk limits','Capital allocation','Withdrawals and transfers')
WHERE id='forex-trader';

UPDATE workforce_positions SET
 authority='Research and simulate approved metals only. No live trading before separate CEO authorization.',
 responsibilities_json=json_array('Research approved precious metals','Analyse market structure and volatility','Test strategies in simulation','Document trade risk and performance'),
 capabilities_json=json_array('Metals market research','Technical analysis','Volatility analysis','Simulation'),
 approval_boundaries_json=json_array('Live trade execution','Instrument additions','Capital allocation','Risk-limit changes')
WHERE id='metals-trader';

UPDATE workforce_positions SET
 authority='Research and simulate approved cryptocurrencies only. No live trading before separate CEO authorization.',
 responsibilities_json=json_array('Research approved digital assets','Monitor volatility and market conditions','Test strategies in simulation','Document custody and market risks'),
 capabilities_json=json_array('Digital asset research','Market analysis','Volatility assessment','Simulation'),
 approval_boundaries_json=json_array('Live trade execution','Wallet or exchange transfers','Instrument additions','Capital allocation')
WHERE id='crypto-trader';

UPDATE workforce_positions SET
 authority='Research and simulate approved equities only. No live trading before separate CEO authorization.',
 responsibilities_json=json_array('Research approved equities','Analyse company and market information','Test strategies in simulation','Document portfolio and concentration risks'),
 capabilities_json=json_array('Equity research','Fundamental analysis','Market analysis','Simulation'),
 approval_boundaries_json=json_array('Live trade execution','Security additions','Capital allocation','Risk-limit changes')
WHERE id='stock-trader';

UPDATE workforce_positions SET
 authority='Provide evidence-based market research. Cannot place trades or move funds.',
 responsibilities_json=json_array('Research approved markets and instruments','Monitor economic and market events','Prepare market outlooks','Verify data sources','Identify material market risks'),
 capabilities_json=json_array('Macroeconomic research','Market analysis','Data verification','Research reporting'),
 approval_boundaries_json=json_array('Live trade execution','Paid data subscriptions','Capital allocation','Disclosure of confidential trading data')
WHERE id='trading-research';

UPDATE workforce_positions SET
 authority='Monitor limits and recommend protective action. Cannot increase limits or authorize trades.',
 responsibilities_json=json_array('Monitor approved risk limits','Assess exposure and drawdown','Review position sizing proposals','Identify limit breaches','Recommend pause or emergency stop'),
 capabilities_json=json_array('Risk measurement','Exposure analysis','Drawdown monitoring','Control testing'),
 approval_boundaries_json=json_array('Changing risk limits','Increasing capital','Approving live execution','Reactivating trading after emergency stop')
WHERE id='trading-risk';

UPDATE workforce_positions SET
 authority='Independently analyse trading results. Cannot place trades, change limits or alter immutable audit records.',
 responsibilities_json=json_array('Analyse simulated and authorized trading results','Track win rate, drawdown and risk-adjusted returns','Reconcile performance records','Identify strategy deterioration','Prepare reports for the CEO'),
 capabilities_json=json_array('Performance analytics','Statistical analysis','Trade reconciliation','Reporting'),
 approval_boundaries_json=json_array('Live trade execution','Risk-limit changes','Capital allocation','Editing or deleting audit records')
WHERE id='trading-performance';
