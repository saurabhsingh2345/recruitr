export interface InterviewQuestion {
  id: string
  question: string
  difficulty: 'easy' | 'medium' | 'hard'
  format: string
}

export interface QuestionTopic {
  slug: string
  title: string
  description: string
  relatedSkills: string[]
  questions: InterviewQuestion[]
}

export const QUESTION_TOPICS: QuestionTopic[] = [
  {
    slug: 'react',
    title: 'React Interview Questions',
    description: 'Hooks, rendering, state management, and component design — the questions senior frontend interviews actually ask.',
    relatedSkills: ['React', 'JavaScript', 'TypeScript'],
    questions: [
      { id: 'r1', question: 'Explain the React reconciliation algorithm and when it matters for performance.', difficulty: 'hard', format: 'system_design' },
      { id: 'r2', question: 'When would you choose useReducer over useState? Walk through a concrete example.', difficulty: 'medium', format: 'coding' },
      { id: 'r3', question: 'How do you prevent unnecessary re-renders in a large component tree?', difficulty: 'medium', format: 'project_deepdive' },
      { id: 'r4', question: 'Describe how you would structure a design system consumed by 10+ product teams.', difficulty: 'hard', format: 'system_design' },
      { id: 'r5', question: 'What happens when you call setState inside useEffect without a dependency array?', difficulty: 'easy', format: 'gap' },
    ],
  },
  {
    slug: 'system-design',
    title: 'System Design Interview Questions',
    description: 'Scalability, trade-offs, and real-world architecture — practice with AI that pushes back like a staff engineer.',
    relatedSkills: ['System Design', 'Distributed Systems', 'AWS'],
    questions: [
      { id: 's1', question: 'Design a URL shortener that handles 10K writes/sec globally.', difficulty: 'medium', format: 'system_design' },
      { id: 's2', question: 'Design a notification system for a mobile app with 50M DAU.', difficulty: 'hard', format: 'system_design' },
      { id: 's3', question: 'How would you design a rate limiter for a public API?', difficulty: 'medium', format: 'system_design' },
      { id: 's4', question: 'Walk through designing a real-time collaborative document editor.', difficulty: 'hard', format: 'system_design' },
      { id: 's5', question: 'Explain CAP theorem with a production incident you handled or would handle.', difficulty: 'medium', format: 'behavioural' },
    ],
  },
  {
    slug: 'nodejs',
    title: 'Node.js & Backend Interview Questions',
    description: 'Event loop, APIs, databases, and production backend patterns for Indian product companies and startups.',
    relatedSkills: ['Node.js', 'PostgreSQL', 'Redis'],
    questions: [
      { id: 'n1', question: 'Explain the Node.js event loop — what runs before setImmediate vs process.nextTick?', difficulty: 'medium', format: 'gap' },
      { id: 'n2', question: 'Design a REST API for an e-commerce order system with idempotency guarantees.', difficulty: 'hard', format: 'system_design' },
      { id: 'n3', question: 'How would you debug a memory leak in a long-running Node process?', difficulty: 'hard', format: 'project_deepdive' },
      { id: 'n4', question: 'Implement a debounced search endpoint that handles 500 concurrent users.', difficulty: 'medium', format: 'coding' },
    ],
  },
  {
    slug: 'python',
    title: 'Python Interview Questions',
    description: 'From data structures to production Python — questions for backend, ML, and platform roles.',
    relatedSkills: ['Python', 'Django', 'FastAPI'],
    questions: [
      { id: 'p1', question: 'Explain GIL implications when building a CPU-bound web service.', difficulty: 'medium', format: 'gap' },
      { id: 'p2', question: 'Implement an LRU cache with O(1) get and put.', difficulty: 'medium', format: 'coding' },
      { id: 'p3', question: 'Design a batch job system that retries failed tasks with exponential backoff.', difficulty: 'hard', format: 'system_design' },
      { id: 'p4', question: 'Tell me about a time you optimized a slow Python data pipeline.', difficulty: 'medium', format: 'behavioural' },
    ],
  },
  {
    slug: 'product-manager',
    title: 'PM Case Study Questions',
    description: 'Product sense, prioritization, and metrics — the cases asked at Razorpay, Flipkart, and global tech.',
    relatedSkills: ['Product Strategy', 'Analytics', 'User Research'],
    questions: [
      { id: 'pm1', question: 'DAU for your maps product dropped 15% last month. How do you diagnose and fix it?', difficulty: 'hard', format: 'pm_case' },
      { id: 'pm2', question: 'Prioritize three features for a fintech app launching in Tier-2 cities.', difficulty: 'medium', format: 'pm_case' },
      { id: 'pm3', question: 'How would you measure success for a new referral program?', difficulty: 'medium', format: 'pm_case' },
      { id: 'pm4', question: 'Describe a product decision you reversed — what did you learn?', difficulty: 'medium', format: 'behavioural' },
    ],
  },
  {
    slug: 'go',
    title: 'Go Interview Questions',
    description: 'Concurrency, interfaces, and production Go — for backend roles at high-growth startups.',
    relatedSkills: ['Go', 'Microservices', 'Kubernetes'],
    questions: [
      { id: 'g1', question: 'Explain goroutine scheduling and when you would use a worker pool.', difficulty: 'medium', format: 'gap' },
      { id: 'g2', question: 'Implement a concurrent safe cache with TTL eviction.', difficulty: 'hard', format: 'coding' },
      { id: 'g3', question: 'Design a distributed job queue in Go with at-least-once delivery.', difficulty: 'hard', format: 'system_design' },
    ],
  },
]

export function getTopicBySlug(slug: string): QuestionTopic | undefined {
  return QUESTION_TOPICS.find((t) => t.slug === slug)
}

export function getAllTopicSlugs(): string[] {
  return QUESTION_TOPICS.map((t) => t.slug)
}
