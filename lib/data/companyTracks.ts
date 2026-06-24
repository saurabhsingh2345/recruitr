export interface CompanyTrackRound {
  order: number
  format: string
  title: string
  focus: string
  durationMinutes: number
}

export interface CompanyTrack {
  id: string
  name: string
  logo: string
  stage: 'Series A' | 'Series B' | 'Series C' | 'Late Stage' | 'Public'
  interviewStyle: string
  rounds: CompanyTrackRound[]
  targetSkills: string[]
}

export const COMPANY_TRACKS: CompanyTrack[] = [
  {
    id: 'google',
    name: 'Google',
    logo: 'G',
    stage: 'Public',
    interviewStyle: 'Structured coding + system design + Googleyness. Expect LeetCode-medium/hard. Every round has a communication component. Calibrate answers to SWE L4–L6 scope.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round 1', focus: 'Arrays, strings, and hash maps — LeetCode medium difficulty', durationMinutes: 45 },
      { order: 2, format: 'coding', title: 'Coding Round 2', focus: 'Graphs, trees, and dynamic programming', durationMinutes: 45 },
      { order: 3, format: 'system_design', title: 'System Design', focus: 'Design a large-scale distributed system (e.g. web crawler, YouTube)', durationMinutes: 45 },
      { order: 4, format: 'behavioural', title: 'Googleyness & Leadership', focus: 'Ambiguity handling, cross-functional collaboration, and growth mindset', durationMinutes: 30 },
    ],
    targetSkills: ['Data Structures', 'System Design', 'Problem Solving', 'Communication'],
  },
  {
    id: 'meta',
    name: 'Meta',
    logo: 'M',
    stage: 'Public',
    interviewStyle: 'Product sense meets execution speed. Coding leans on graphs and DP. System design is product-scale (News Feed, Messenger). Behavioural anchors on impact and growth.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round 1', focus: 'Graph traversal and dynamic programming', durationMinutes: 45 },
      { order: 2, format: 'coding', title: 'Coding Round 2', focus: 'Arrays, sliding window, and binary search variants', durationMinutes: 45 },
      { order: 3, format: 'system_design', title: 'System Design', focus: 'Design a social product at 3-billion-user scale', durationMinutes: 45 },
      { order: 4, format: 'behavioural', title: 'Behavioural', focus: 'Impact, collaboration, and handling failure', durationMinutes: 30 },
    ],
    targetSkills: ['Algorithms', 'System Design', 'Product Thinking', 'Leadership'],
  },
  {
    id: 'amazon',
    name: 'Amazon',
    logo: 'A',
    stage: 'Public',
    interviewStyle: 'Leadership Principles dominate every round. Map every STAR story to an LP. Technical bar is solid but behavioural weight is unusually high — even in coding rounds.',
    rounds: [
      { order: 1, format: 'coding', title: 'Online Assessment', focus: 'Two algorithm problems — medium difficulty, 90-minute window', durationMinutes: 45 },
      { order: 2, format: 'behavioural', title: 'Leadership Principles 1', focus: 'Customer obsession, Ownership, Invent & Simplify', durationMinutes: 30 },
      { order: 3, format: 'system_design', title: 'System Design', focus: 'Design a marketplace or logistics platform', durationMinutes: 45 },
      { order: 4, format: 'behavioural', title: 'Leadership Principles 2 (Bar Raiser)', focus: 'Dive Deep, Are Right A Lot, Bias for Action', durationMinutes: 45 },
    ],
    targetSkills: ['Leadership Principles', 'System Design', 'Algorithms', 'Communication'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    logo: 'Ms',
    stage: 'Public',
    interviewStyle: 'Growth mindset culture. Coding focuses on correctness and communication. System design at senior level is detailed. Values collaboration and "how would you grow this team" thinking.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round 1', focus: 'Linked lists, trees, and recursion', durationMinutes: 45 },
      { order: 2, format: 'coding', title: 'Coding Round 2', focus: 'Dynamic programming and graph problems', durationMinutes: 45 },
      { order: 3, format: 'system_design', title: 'System Design', focus: 'Design an Azure or enterprise SaaS product component', durationMinutes: 45 },
      { order: 4, format: 'behavioural', title: 'As Appropriate Round', focus: 'Growth mindset, cross-team collaboration, and executive presence', durationMinutes: 30 },
    ],
    targetSkills: ['Algorithms', 'System Design', 'Growth Mindset', 'Communication'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    logo: 'S',
    stage: 'Late Stage',
    interviewStyle: 'Deep technical curiosity expected. Debugging and API design questions are common. System reliability, consistency, and trade-off communication are heavily weighted.',
    rounds: [
      { order: 1, format: 'coding', title: 'Take-home / Debugging', focus: 'Real-world bug fixing in a Stripe-like codebase', durationMinutes: 60 },
      { order: 2, format: 'system_design', title: 'API Design', focus: 'Design a payments API with webhooks, idempotency, and retries', durationMinutes: 45 },
      { order: 3, format: 'project_deepdive', title: 'Project Deep-dive', focus: 'Walk through your most complex technical project — ownership, trade-offs, outcomes', durationMinutes: 45 },
      { order: 4, format: 'behavioural', title: 'Values & Collaboration', focus: 'User empathy, intellectual rigour, and working across functions', durationMinutes: 30 },
    ],
    targetSkills: ['API Design', 'System Reliability', 'Problem Solving', 'Communication'],
  },
  {
    id: 'atlassian',
    name: 'Atlassian',
    logo: 'At',
    stage: 'Public',
    interviewStyle: 'Values-driven culture: Ship it, Team, Customers. Every answer should reflect at least one value. Technical bar is solid; product instinct is equally important.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Challenge', focus: 'Medium-difficulty DSA with emphasis on readable code', durationMinutes: 45 },
      { order: 2, format: 'system_design', title: 'System Design', focus: 'Design a collaboration tool (Jira-like or Confluence-like)', durationMinutes: 45 },
      { order: 3, format: 'behavioural', title: 'Values Interview', focus: 'Ship it, Be the change, Don\'t #@!% the customer', durationMinutes: 30 },
      { order: 4, format: 'project_deepdive', title: 'Technical Deep-dive', focus: 'Past project ownership, ambiguity, and architectural decisions', durationMinutes: 45 },
    ],
    targetSkills: ['System Design', 'Algorithms', 'Values Fit', 'Project Ownership'],
  },
  {
    id: 'uber',
    name: 'Uber',
    logo: 'U',
    stage: 'Public',
    interviewStyle: 'Real-time systems and geospatial challenges. Reliability and latency trade-offs. Strong on incident handling and on-call culture. Expect at least one "what happens when this fails?" question.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round', focus: 'Graph and geospatial algorithm problems', durationMinutes: 45 },
      { order: 2, format: 'system_design', title: 'System Design', focus: 'Design Uber Surge Pricing or the dispatch system', durationMinutes: 45 },
      { order: 3, format: 'behavioural', title: 'Leadership & Execution', focus: 'Delivery under pressure, cross-functional conflict, and metrics ownership', durationMinutes: 30 },
    ],
    targetSkills: ['Real-time Systems', 'Algorithms', 'Reliability Design', 'Leadership'],
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    logo: 'Ai',
    stage: 'Public',
    interviewStyle: 'Strong culture fit with "Belong Anywhere" ethos. Product thinking and user empathy are core. Coding bar is high. System design includes trust & safety and payments.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round 1', focus: 'String manipulation and data processing', durationMinutes: 45 },
      { order: 2, format: 'coding', title: 'Coding Round 2', focus: 'Graph traversal and scheduling problems', durationMinutes: 45 },
      { order: 3, format: 'system_design', title: 'System Design', focus: 'Design Airbnb Search or the Payments platform', durationMinutes: 45 },
      { order: 4, format: 'behavioural', title: 'Core Values', focus: 'Empathy, belonging, and handling ambiguity creatively', durationMinutes: 30 },
    ],
    targetSkills: ['Algorithms', 'System Design', 'User Empathy', 'Communication'],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    logo: 'N',
    stage: 'Public',
    interviewStyle: 'Freedom & Responsibility culture. No micromanagement — expects senior engineers to be self-directed. Heavy on system reliability, CDN, and streaming architecture.',
    rounds: [
      { order: 1, format: 'system_design', title: 'System Design 1', focus: 'Design the Netflix CDN or video encoding pipeline', durationMinutes: 60 },
      { order: 2, format: 'system_design', title: 'System Design 2', focus: 'Recommendation system or A/B testing infrastructure', durationMinutes: 60 },
      { order: 3, format: 'project_deepdive', title: 'Architecture Deep-dive', focus: 'Most complex distributed system you\'ve built — trade-offs and ownership', durationMinutes: 45 },
      { order: 4, format: 'behavioural', title: 'Culture Fit', focus: 'Freedom & Responsibility, radical candour, and high-performance culture', durationMinutes: 30 },
    ],
    targetSkills: ['Distributed Systems', 'System Design', 'Reliability', 'Leadership'],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    logo: 'Sf',
    stage: 'Public',
    interviewStyle: 'Trailblazer culture: trust, customer success, innovation, equality. CRM domain knowledge is a plus. Technical rounds are solid with emphasis on scalable multi-tenant architecture.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Assessment', focus: 'Object-oriented design and medium-difficulty DSA', durationMinutes: 45 },
      { order: 2, format: 'system_design', title: 'System Design', focus: 'Design a multi-tenant SaaS CRM platform feature', durationMinutes: 45 },
      { order: 3, format: 'behavioural', title: 'Ohana & Values', focus: 'Customer success, giving back, and collaborative delivery', durationMinutes: 30 },
    ],
    targetSkills: ['System Design', 'Algorithms', 'Multi-tenant Architecture', 'Values Fit'],
  },
  {
    id: 'zerodha',
    name: 'Zerodha',
    logo: 'Z',
    stage: 'Late Stage',
    interviewStyle: 'Lean and pragmatic. No fluff — expects deep knowledge of financial systems, low latency, and Go/Python expertise. Culture prizes engineering rigour over process.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round', focus: 'Low-level system programming — concurrency, channels, and performance', durationMinutes: 60 },
      { order: 2, format: 'system_design', title: 'System Design', focus: 'Design a real-time order matching engine or market data feed', durationMinutes: 60 },
      { order: 3, format: 'project_deepdive', title: 'Technical Deep-dive', focus: 'Past fintech project — latency, reliability, and production incidents', durationMinutes: 45 },
    ],
    targetSkills: ['Low Latency Systems', 'Go', 'System Design', 'Financial Engineering'],
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    logo: 'R',
    stage: 'Late Stage',
    interviewStyle: 'Payments domain context expected. Backend-heavy with reliability and fault-tolerance. Expect "how do you handle money at scale?" framing in almost every technical question.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round', focus: 'String parsing, state machines, and hash maps', durationMinutes: 45 },
      { order: 2, format: 'system_design', title: 'System Design', focus: 'Design idempotent payment APIs or a ledger reconciliation system', durationMinutes: 60 },
      { order: 3, format: 'behavioural', title: 'Culture Round', focus: 'Ownership, speed with quality, and cross-team collaboration', durationMinutes: 30 },
    ],
    targetSkills: ['Payments Systems', 'API Design', 'Backend Engineering', 'Reliability'],
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    logo: 'F',
    stage: 'Late Stage',
    interviewStyle: 'Strong DSA bar — LeetCode-hard is common. LLD-heavy in system design. Expects you to know e-commerce scaling challenges, inventory management, and search at scale.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round 1', focus: 'Dynamic programming and tree problems', durationMinutes: 45 },
      { order: 2, format: 'coding', title: 'Coding Round 2', focus: 'Graphs, backtracking, and segment trees', durationMinutes: 45 },
      { order: 3, format: 'system_design', title: 'LLD Round', focus: 'Low-level design: design a coupon system or cart service OOP', durationMinutes: 45 },
      { order: 4, format: 'system_design', title: 'HLD Round', focus: 'High-level design: product catalog, search, or order management', durationMinutes: 45 },
    ],
    targetSkills: ['Data Structures', 'Algorithms', 'Low-level Design', 'System Design'],
  },
  {
    id: 'swiggy',
    name: 'Swiggy',
    logo: 'Sw',
    stage: 'Late Stage',
    interviewStyle: 'Real-time systems focus. Delivery routing, surge pricing design, and last-mile logistics. Strong on HLD with operational trade-offs between cost, speed, and reliability.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round', focus: 'Graph algorithms and optimization problems', durationMinutes: 45 },
      { order: 2, format: 'system_design', title: 'System Design', focus: 'Design the Swiggy delivery dispatch or notification system', durationMinutes: 60 },
      { order: 3, format: 'behavioural', title: 'Culture Fit', focus: 'Speed, ownership, and customer-first decision making', durationMinutes: 30 },
    ],
    targetSkills: ['Graph Algorithms', 'Real-time Systems', 'Operations Design', 'Leadership'],
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    logo: 'Ph',
    stage: 'Late Stage',
    interviewStyle: 'Payments and distributed systems. High availability design, consistency vs. availability trade-offs, and UPI transaction flows expected. Speed and correctness are equally valued.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round', focus: 'Concurrency, queues, and state machine implementation', durationMinutes: 45 },
      { order: 2, format: 'system_design', title: 'System Design', focus: 'Design UPI transaction processing or a wallet system', durationMinutes: 60 },
      { order: 3, format: 'behavioural', title: 'Leadership Round', focus: 'Ownership at scale, cross-functional decisions, and speed', durationMinutes: 30 },
    ],
    targetSkills: ['Distributed Systems', 'Payments', 'System Design', 'Concurrency'],
  },
  {
    id: 'cred',
    name: 'CRED',
    logo: 'C',
    stage: 'Series C',
    interviewStyle: 'High bar on product craft and code quality. Expect design reviews and past project deep-dives into financial product engineering. Culture prizes taste and precision.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round', focus: 'Clean code, OOP patterns, and data structures', durationMinutes: 45 },
      { order: 2, format: 'project_deepdive', title: 'Deep Dive', focus: 'Your most impactful project — decisions, outcomes, what you\'d change', durationMinutes: 45 },
      { order: 3, format: 'system_design', title: 'System Design', focus: 'Design a credit scoring or rewards distribution system', durationMinutes: 45 },
    ],
    targetSkills: ['Clean Code', 'Project Ownership', 'System Design', 'Financial Products'],
  },
  {
    id: 'meesho',
    name: 'Meesho',
    logo: 'Me',
    stage: 'Late Stage',
    interviewStyle: 'Product thinking + backend scale. Growth metrics, recommendation systems, and tier-2 India use cases. Values social commerce domain knowledge.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round', focus: 'Arrays, hashing, and greedy algorithms', durationMinutes: 45 },
      { order: 2, format: 'system_design', title: 'System Design', focus: 'Design a social commerce feed or seller catalog', durationMinutes: 45 },
      { order: 3, format: 'behavioural', title: 'Values Round', focus: 'Customer empathy, growth mindset, and entrepreneurial thinking', durationMinutes: 30 },
    ],
    targetSkills: ['Algorithms', 'System Design', 'Product Thinking', 'Growth'],
  },
  {
    id: 'browserstack',
    name: 'BrowserStack',
    logo: 'Bs',
    stage: 'Series B',
    interviewStyle: 'Browser infrastructure and testing automation expertise. Expects deep knowledge of distributed testing, CI/CD, and cross-browser challenges. Values product clarity.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round', focus: 'Concurrency, networking, and system programming', durationMinutes: 45 },
      { order: 2, format: 'system_design', title: 'System Design', focus: 'Design a distributed browser testing grid', durationMinutes: 60 },
      { order: 3, format: 'behavioural', title: 'Culture & Values', focus: 'Customer obsession, technical curiosity, and team ownership', durationMinutes: 30 },
    ],
    targetSkills: ['System Design', 'Distributed Systems', 'Testing Infrastructure', 'Networking'],
  },
  {
    id: 'freshworks',
    name: 'Freshworks',
    logo: 'Fw',
    stage: 'Public',
    interviewStyle: 'SaaS product thinking with a customer success mindset. Technical rounds focus on scalable multi-product architecture. Behavioural anchors on "Freshers" culture — humble, curious, collaborative.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round', focus: 'Object-oriented design and medium-difficulty algorithms', durationMinutes: 45 },
      { order: 2, format: 'system_design', title: 'System Design', focus: 'Design a helpdesk ticketing or CRM feature at scale', durationMinutes: 45 },
      { order: 3, format: 'behavioural', title: 'Culture Round', focus: 'Curiosity, customer empathy, and cross-team collaboration', durationMinutes: 30 },
    ],
    targetSkills: ['Algorithms', 'SaaS Architecture', 'Customer Empathy', 'Leadership'],
  },
  {
    id: 'zoho',
    name: 'Zoho',
    logo: 'Zo',
    stage: 'Public',
    interviewStyle: 'Deep engineering culture with a product-first ethos. Coding bar is high. Values long-term ownership — expects you to care deeply about quality and not just shipping fast.',
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round 1', focus: 'Core DSA — arrays, strings, recursion', durationMinutes: 45 },
      { order: 2, format: 'coding', title: 'Coding Round 2', focus: 'Advanced DSA and algorithm optimisation', durationMinutes: 45 },
      { order: 3, format: 'system_design', title: 'System Design', focus: 'Design an enterprise SaaS product feature at scale', durationMinutes: 45 },
      { order: 4, format: 'behavioural', title: 'Culture Fit', focus: 'Long-term ownership, quality over speed, and product empathy', durationMinutes: 30 },
    ],
    targetSkills: ['Data Structures', 'Algorithms', 'System Design', 'Product Engineering'],
  },
]

export function getTrackById(id: string): CompanyTrack | undefined {
  return COMPANY_TRACKS.find(t => t.id === id)
}
