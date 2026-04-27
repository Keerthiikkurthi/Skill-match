import { Router, Response } from "express";
import { z } from "zod";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// ── Helpers ───────────────────────────────────────────────────────────────────

const STOP = new Set(["the","a","an","and","or","but","of","to","in","on","at","for","with","by","from","as","is","are","was","were","be","been","have","has","had","do","does","did","will","would","should","could","may","might","must","can","this","that","these","those","i","you","he","she","it","we","they","my","your","our","their","me","him","us","them"]);

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
}

function topKeywords(text: string, n = 15): string[] {
  const freq = new Map<string,number>();
  for (const t of tokenize(text)) freq.set(t,(freq.get(t)||0)+1);
  return [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([w])=>w);
}

function detectRole(resumeText: string): string {
  const text = resumeText.toLowerCase();
  const roles: [string, string[]][] = [
    ["Software Engineer",["javascript","python","java","react","node","api","git","software","developer","code","programming","typescript","backend","frontend","spring","django","flask"]],
    ["Data Scientist",["machine learning","deep learning","tensorflow","pytorch","pandas","numpy","data science","model","dataset","neural","sklearn","jupyter","statistics","regression","classification"]],
    ["Data Analyst",["sql","tableau","power bi","excel","dashboard","reporting","visualization","analytics","insight","query","database","etl","looker","metabase"]],
    ["Product Manager",["product","roadmap","stakeholder","agile","scrum","sprint","backlog","user story","kpi","metrics","strategy","launch","prioritization","okr"]],
    ["DevOps Engineer",["docker","kubernetes","ci/cd","jenkins","terraform","ansible","aws","azure","gcp","pipeline","deployment","infrastructure","monitoring","helm","prometheus"]],
    ["Full Stack Developer",["full stack","react","node","express","mongodb","postgresql","rest","graphql","html","css","javascript","typescript","vue","angular"]],
    ["UX/UI Designer",["figma","sketch","wireframe","prototype","user research","usability","design system","ux","ui","accessibility","interaction","adobe xd"]],
    ["Cybersecurity Analyst",["security","penetration","vulnerability","firewall","siem","compliance","threat","incident","encryption","audit","iso 27001","soc","nist","owasp"]],
    ["Machine Learning Engineer",["mlops","model deployment","feature engineering","pipeline","training","inference","kubeflow","mlflow","sagemaker","vertex ai","model serving"]],
    ["Cloud Architect",["cloud","aws","azure","gcp","architecture","microservices","serverless","lambda","s3","vpc","iam","cost optimization","well-architected"]],
    ["Mobile Developer",["ios","android","swift","kotlin","react native","flutter","mobile","app store","xcode","android studio","firebase","push notifications"]],
    ["Backend Developer",["api","rest","graphql","microservices","database","postgresql","mysql","redis","kafka","rabbitmq","grpc","authentication","authorization"]],
    ["Frontend Developer",["html","css","javascript","typescript","react","vue","angular","webpack","vite","responsive","accessibility","performance","seo","tailwind"]],
    ["Project Manager",["project management","pmp","timeline","budget","risk","stakeholder","deliverable","milestone","resource","coordination","gantt","jira","confluence"]],
    ["Marketing Manager",["marketing","campaign","seo","sem","social media","content","brand","analytics","conversion","email","growth","digital","hubspot","salesforce"]],
  ];
  let best = "Software Engineer", bestScore = 0;
  for (const [role, keywords] of roles) {
    const score = keywords.filter(k => text.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = role; }
  }
  return best;
}

// ── QUESTION BANK ─────────────────────────────────────────────────────────────
// Completely different questions per role AND per difficulty level.

type Q = { question: string; category: string; hint: string };
type Bank = Record<string, Record<string, Q[]>>;

const QUESTION_BANK: Bank = {
  "Software Engineer": {
    easy: [
      { question: "What programming languages are you most comfortable with and why?", category: "Technical", hint: "Mention 2-3 languages, explain your proficiency and what you've built with each." },
      { question: "Explain the difference between a stack and a queue with a real-world example.", category: "Technical", hint: "Stack=LIFO (browser back button), Queue=FIFO (print queue). Give concrete examples." },
      { question: "How do you approach debugging a bug you've never seen before?", category: "Technical", hint: "Describe your systematic process: reproduce, isolate, hypothesize, test, fix, verify." },
      { question: "What is version control and how have you used Git in your projects?", category: "Technical", hint: "Mention branching strategy, commit practices, pull requests, and merge conflict resolution." },
      { question: "Describe a project you built from scratch. What was your biggest challenge?", category: "Behavioral", hint: "Use STAR method. Focus on technical decisions and what you learned." },
      { question: "What is the difference between synchronous and asynchronous programming?", category: "Technical", hint: "Explain blocking vs non-blocking, give examples like file I/O or API calls." },
      { question: "How do you ensure your code is readable and maintainable?", category: "Technical", hint: "Mention naming conventions, comments, code reviews, documentation, and refactoring." },
    ],
    medium: [
      { question: "Explain RESTful API design principles. What makes an API truly RESTful?", category: "Technical", hint: "Cover statelessness, resource-based URLs, HTTP methods, status codes, and HATEOAS." },
      { question: "What design patterns have you used? Describe a specific situation where one solved a problem.", category: "Technical", hint: "Pick one pattern (Singleton, Observer, Factory) and explain the exact problem it solved." },
      { question: "How do you handle database performance issues in a production application?", category: "Technical", hint: "Mention query optimization, indexing, caching, connection pooling, and query analysis tools." },
      { question: "Describe a time you had to refactor legacy code. What was your approach?", category: "Behavioral", hint: "Explain how you understood the existing code, wrote tests first, then refactored incrementally." },
      { question: "How do you approach writing unit tests? What makes a good test?", category: "Technical", hint: "Cover test isolation, mocking, coverage, AAA pattern (Arrange-Act-Assert), and edge cases." },
      { question: "Explain microservices vs monolithic architecture. When would you choose each?", category: "Technical", hint: "Discuss trade-offs: scalability, complexity, deployment, team size, and data consistency." },
      { question: "How do you handle errors and exceptions in your applications?", category: "Technical", hint: "Mention error boundaries, logging, monitoring, graceful degradation, and user-friendly messages." },
    ],
    hard: [
      { question: "Design a URL shortening service like bit.ly. Walk through your complete architecture.", category: "System Design", hint: "Cover hash generation, collision handling, database schema, caching layer, analytics, and scaling to billions of URLs." },
      { question: "How would you design a distributed cache? What consistency guarantees would you provide?", category: "System Design", hint: "Discuss eviction policies, consistency models (eventual vs strong), partitioning, and replication." },
      { question: "Explain the CAP theorem and how it influenced a real architectural decision you made.", category: "Technical", hint: "Define Consistency, Availability, Partition tolerance. Give a concrete example of choosing CP vs AP." },
      { question: "How would you optimize a system experiencing 10x traffic growth overnight?", category: "System Design", hint: "Cover horizontal scaling, load balancing, CDN, database read replicas, caching, and async processing." },
      { question: "Describe the most complex technical problem you've solved. What made it hard?", category: "Behavioral", hint: "Focus on the problem complexity, your investigation process, trade-offs considered, and measurable outcome." },
      { question: "How would you implement real-time collaborative editing like Google Docs?", category: "System Design", hint: "Discuss operational transformation, CRDTs, WebSockets, conflict resolution, and offline support." },
      { question: "What are the trade-offs between SQL and NoSQL databases? When would you use each?", category: "Technical", hint: "Cover ACID vs BASE, schema flexibility, query patterns, consistency, and specific use cases for each." },
    ],
  },
  "Data Scientist": {
    easy: [
      { question: "What is the difference between supervised, unsupervised, and reinforcement learning?", category: "Technical", hint: "Give examples: supervised=classification, unsupervised=clustering, RL=game playing." },
      { question: "Explain overfitting. How do you detect and prevent it?", category: "Technical", hint: "Define overfitting, mention train/validation/test split, cross-validation, regularization (L1/L2), dropout." },
      { question: "What Python libraries do you use most for data analysis and why?", category: "Technical", hint: "Discuss pandas, numpy, matplotlib/seaborn, and when to use each." },
      { question: "How do you handle missing data in a dataset?", category: "Technical", hint: "Cover deletion, mean/median/mode imputation, forward fill, model-based imputation." },
      { question: "Describe a data analysis project you worked on. What insights did you find?", category: "Behavioral", hint: "Use STAR method. Quantify the impact of your findings on business decisions." },
      { question: "What is cross-validation and why is it important?", category: "Technical", hint: "Explain k-fold CV, stratified CV, leave-one-out. Discuss why it gives better generalization estimates." },
      { question: "How do you explain a complex model to a non-technical stakeholder?", category: "Behavioral", hint: "Focus on business impact, use analogies, avoid jargon, show visualizations." },
    ],
    medium: [
      { question: "Walk me through your end-to-end process for building a machine learning model.", category: "Technical", hint: "Cover: problem definition, data collection, EDA, feature engineering, model selection, training, evaluation, deployment." },
      { question: "Explain the bias-variance tradeoff with a concrete example.", category: "Technical", hint: "High bias=underfitting (simple model), high variance=overfitting (complex model). Use polynomial regression as example." },
      { question: "How do you evaluate a classification model beyond accuracy?", category: "Technical", hint: "Discuss precision, recall, F1, AUC-ROC, confusion matrix, and when each metric matters." },
      { question: "What feature engineering techniques have you used? Give a specific example.", category: "Technical", hint: "Mention encoding, scaling, polynomial features, interaction terms, binning, and domain-specific transformations." },
      { question: "Describe a time your model performed differently in production than in testing.", category: "Behavioral", hint: "Discuss data drift, distribution shift, feature leakage, or training-serving skew. What did you do to fix it?" },
      { question: "How do you handle class imbalance in a classification problem?", category: "Technical", hint: "Cover oversampling (SMOTE), undersampling, class weights, threshold tuning, and ensemble methods." },
      { question: "Explain the difference between bagging and boosting. When would you use each?", category: "Technical", hint: "Bagging=parallel (Random Forest), Boosting=sequential (XGBoost, AdaBoost). Discuss variance vs bias reduction." },
    ],
    hard: [
      { question: "Design a recommendation system for a streaming platform with 100M users.", category: "System Design", hint: "Cover collaborative filtering, content-based, hybrid approaches, cold start problem, real-time vs batch, A/B testing." },
      { question: "How would you detect and handle data drift in a production ML model?", category: "Technical", hint: "Discuss statistical tests (KS test, PSI), monitoring dashboards, retraining triggers, and shadow deployment." },
      { question: "Explain the mathematics behind gradient descent and its variants.", category: "Technical", hint: "Cover SGD, mini-batch, momentum, Adam optimizer. Discuss learning rate schedules and convergence guarantees." },
      { question: "How would you build a fraud detection system? What are the unique challenges?", category: "System Design", hint: "Discuss imbalanced data, real-time scoring, feature engineering, adversarial users, and model explainability." },
      { question: "Describe a situation where you had to make a model decision with ethical implications.", category: "Behavioral", hint: "Discuss fairness, bias in training data, disparate impact, model transparency, and how you balanced accuracy vs fairness." },
      { question: "How would you design an A/B testing framework for ML model evaluation?", category: "Technical", hint: "Cover experiment design, sample size calculation, statistical significance, novelty effects, and multi-armed bandits." },
      { question: "Explain how you would approach a time series forecasting problem with multiple seasonalities.", category: "Technical", hint: "Discuss decomposition, ARIMA, Prophet, LSTM, feature engineering for time series, and handling irregular patterns." },
    ],
  },
  "Product Manager": {
    easy: [
      { question: "How do you prioritize features when you have more requests than capacity?", category: "Role-Specific", hint: "Mention frameworks like RICE, MoSCoW, ICE. Discuss stakeholder alignment and data-driven decisions." },
      { question: "What metrics do you use to measure the success of a product feature?", category: "Role-Specific", hint: "Cover leading vs lagging indicators, DAU/MAU, retention, NPS, conversion rates, and business impact metrics." },
      { question: "How do you gather and validate user feedback?", category: "Role-Specific", hint: "Discuss user interviews, surveys, usability testing, analytics, support tickets, and how you synthesize insights." },
      { question: "Describe your experience working with engineering teams.", category: "Behavioral", hint: "Focus on how you communicate requirements, handle technical constraints, and build trust with engineers." },
      { question: "What is your approach to writing user stories and acceptance criteria?", category: "Role-Specific", hint: "Use the 'As a [user], I want [goal], so that [benefit]' format. Discuss INVEST criteria and definition of done." },
      { question: "How do you handle a situation where stakeholders have conflicting priorities?", category: "Behavioral", hint: "Describe your process for understanding each stakeholder's goals, finding common ground, and making data-driven decisions." },
      { question: "What tools do you use for product management and why?", category: "Technical", hint: "Mention Jira, Confluence, Figma, Mixpanel, Amplitude, or similar. Explain how each fits your workflow." },
    ],
    medium: [
      { question: "Tell me about a product you launched end-to-end. What was your process?", category: "Behavioral", hint: "Cover discovery, definition, design, development, launch, and post-launch measurement. Quantify the impact." },
      { question: "How do you balance user needs with business goals when they conflict?", category: "Role-Specific", hint: "Discuss how you quantify user value vs business value, use data to make the case, and find win-win solutions." },
      { question: "Describe a time you had to make a product decision with incomplete data.", category: "Behavioral", hint: "Explain how you identified what data you needed, what assumptions you made, and how you validated them post-launch." },
      { question: "How do you define and measure product-market fit?", category: "Role-Specific", hint: "Discuss Sean Ellis test, retention curves, NPS, organic growth, and qualitative signals from users." },
      { question: "Walk me through how you would run a discovery process for a new feature.", category: "Role-Specific", hint: "Cover problem definition, user research, competitive analysis, hypothesis formation, and validation methods." },
      { question: "How do you work with design teams to ensure great user experience?", category: "Behavioral", hint: "Discuss how you share user insights, give feedback on designs, balance UX with technical constraints, and iterate." },
      { question: "Describe a product failure you experienced. What did you learn?", category: "Behavioral", hint: "Be honest about what went wrong. Focus on what you learned and how you applied those lessons going forward." },
    ],
    hard: [
      { question: "How would you design a product strategy for entering a new market with existing competition?", category: "Role-Specific", hint: "Cover market analysis, differentiation, go-to-market strategy, pricing, and how you'd validate assumptions before investing." },
      { question: "How would you decide whether to build, buy, or partner for a new capability?", category: "Role-Specific", hint: "Discuss build vs buy framework: core competency, time-to-market, cost, risk, and strategic importance." },
      { question: "Design a growth strategy for a B2B SaaS product that has plateaued at 10k users.", category: "Role-Specific", hint: "Cover expansion revenue, new segments, product-led growth, partnerships, and international expansion." },
      { question: "How do you align a cross-functional team around a product vision when there's disagreement?", category: "Behavioral", hint: "Discuss how you build shared understanding, use data to resolve debates, and create alignment through transparency." },
      { question: "Describe a time you had to kill a feature or product. How did you handle it?", category: "Behavioral", hint: "Explain the data and reasoning behind the decision, how you communicated it, and how you managed the transition." },
      { question: "How would you approach pricing strategy for a new product?", category: "Role-Specific", hint: "Cover value-based pricing, competitive analysis, willingness to pay research, freemium vs paid, and pricing experiments." },
      { question: "How do you measure and improve developer experience as a PM for a platform product?", category: "Role-Specific", hint: "Discuss DORA metrics, developer surveys, time-to-first-success, documentation quality, and SDK adoption rates." },
    ],
  },
  "DevOps Engineer": {
    easy: [
      { question: "Explain the difference between CI, CD (delivery), and CD (deployment).", category: "Technical", hint: "CI=automated testing on every commit, CD delivery=automated release to staging, CD deployment=automated release to production." },
      { question: "What is Docker and how does it differ from a virtual machine?", category: "Technical", hint: "Containers share the OS kernel (lightweight, fast), VMs have their own OS (isolated, heavier). Discuss use cases." },
      { question: "How do you monitor a production application? What metrics do you track?", category: "Technical", hint: "Cover the four golden signals: latency, traffic, errors, saturation. Mention tools like Prometheus, Grafana, Datadog." },
      { question: "Describe your experience with cloud platforms (AWS/Azure/GCP).", category: "Technical", hint: "Mention specific services you've used, architectures you've built, and any certifications you hold." },
      { question: "What is infrastructure as code and why is it important?", category: "Technical", hint: "Explain reproducibility, version control, drift prevention. Mention Terraform, CloudFormation, Ansible, Pulumi." },
      { question: "How do you handle a production outage? Walk me through your process.", category: "Behavioral", hint: "Cover detection, communication, mitigation, root cause analysis, and post-mortem. Emphasize blameless culture." },
      { question: "What is the difference between horizontal and vertical scaling?", category: "Technical", hint: "Vertical=bigger machine, Horizontal=more machines. Discuss when each is appropriate and their limitations." },
    ],
    medium: [
      { question: "Design a CI/CD pipeline for a microservices application. What stages would you include?", category: "Technical", hint: "Cover: code commit, build, unit tests, integration tests, security scan, staging deploy, smoke tests, production deploy." },
      { question: "How do you manage secrets and sensitive configuration in a Kubernetes environment?", category: "Technical", hint: "Discuss Kubernetes Secrets, Vault, AWS Secrets Manager, sealed secrets, and RBAC for access control." },
      { question: "Explain Kubernetes networking. How do pods communicate with each other?", category: "Technical", hint: "Cover pod networking, services (ClusterIP, NodePort, LoadBalancer), ingress, DNS, and network policies." },
      { question: "How do you implement zero-downtime deployments?", category: "Technical", hint: "Discuss rolling updates, blue-green deployments, canary releases, feature flags, and database migration strategies." },
      { question: "Describe a time you significantly improved system reliability or reduced incidents.", category: "Behavioral", hint: "Quantify the improvement (e.g., reduced MTTR by 50%, improved uptime from 99.5% to 99.9%). Explain your approach." },
      { question: "How do you approach capacity planning for a growing application?", category: "Technical", hint: "Cover load testing, traffic forecasting, auto-scaling policies, cost optimization, and headroom planning." },
      { question: "What is your approach to logging and observability in distributed systems?", category: "Technical", hint: "Discuss structured logging, distributed tracing (Jaeger, Zipkin), correlation IDs, and the three pillars of observability." },
    ],
    hard: [
      { question: "Design a multi-region, highly available architecture for a critical financial application.", category: "System Design", hint: "Cover active-active vs active-passive, data replication, consistency trade-offs, failover automation, and RTO/RPO requirements." },
      { question: "How would you migrate a monolithic application to microservices with zero downtime?", category: "Technical", hint: "Discuss strangler fig pattern, feature flags, traffic splitting, data migration strategy, and rollback plan." },
      { question: "Explain how you would implement a GitOps workflow for a large organization.", category: "Technical", hint: "Cover ArgoCD/Flux, repository structure, environment promotion, drift detection, and access control." },
      { question: "How would you reduce cloud costs by 40% without impacting performance?", category: "Technical", hint: "Discuss right-sizing, reserved instances, spot instances, auto-scaling, storage tiering, and eliminating waste." },
      { question: "Describe the most complex infrastructure problem you've solved. What was your approach?", category: "Behavioral", hint: "Focus on the scale of the problem, your diagnostic process, the solution you implemented, and measurable results." },
      { question: "How would you design a disaster recovery strategy for a system with 99.99% uptime SLA?", category: "System Design", hint: "Cover RTO/RPO definitions, backup strategies, failover testing, runbooks, and chaos engineering." },
      { question: "How do you handle security in a DevOps pipeline (DevSecOps)?", category: "Technical", hint: "Discuss SAST/DAST, dependency scanning, container image scanning, secrets detection, and compliance as code." },
    ],
  },
  "Frontend Developer": {
    easy: [
      { question: "Explain the difference between CSS Flexbox and Grid. When would you use each?", category: "Technical", hint: "Flexbox=1D layout (row or column), Grid=2D layout. Give examples of when each is the right tool." },
      { question: "What is the virtual DOM and why does React use it?", category: "Technical", hint: "Explain how the virtual DOM reduces expensive real DOM operations through diffing and batching updates." },
      { question: "How do you optimize the performance of a web application?", category: "Technical", hint: "Cover lazy loading, code splitting, image optimization, caching, minification, and Core Web Vitals." },
      { question: "What is the difference between localStorage, sessionStorage, and cookies?", category: "Technical", hint: "Discuss persistence, size limits, accessibility (JS vs HTTP), and security considerations for each." },
      { question: "Describe a UI component you built that you're proud of. What made it challenging?", category: "Behavioral", hint: "Focus on the technical complexity, accessibility considerations, and reusability of the component." },
      { question: "How do you ensure your web applications are accessible (WCAG)?", category: "Technical", hint: "Mention semantic HTML, ARIA attributes, keyboard navigation, color contrast, and screen reader testing." },
      { question: "What is your approach to responsive design?", category: "Technical", hint: "Discuss mobile-first approach, breakpoints, fluid layouts, and testing across different devices." },
    ],
    medium: [
      { question: "Explain React's reconciliation algorithm and how it affects performance.", category: "Technical", hint: "Discuss the diffing algorithm, keys in lists, shouldComponentUpdate, React.memo, and useMemo/useCallback." },
      { question: "How do you manage state in a large React application?", category: "Technical", hint: "Compare local state, Context API, Redux, Zustand, Jotai. Discuss when to use each and their trade-offs." },
      { question: "What is your approach to testing frontend code?", category: "Technical", hint: "Cover unit tests (Jest), component tests (React Testing Library), E2E tests (Cypress/Playwright), and visual regression." },
      { question: "How do you handle API errors and loading states in a React application?", category: "Technical", hint: "Discuss error boundaries, loading skeletons, retry logic, optimistic updates, and user-friendly error messages." },
      { question: "Describe a time you significantly improved the performance of a web application.", category: "Behavioral", hint: "Quantify the improvement (e.g., reduced LCP by 2s, improved Lighthouse score from 60 to 95). Explain your approach." },
      { question: "How do you approach cross-browser compatibility issues?", category: "Technical", hint: "Discuss feature detection, polyfills, CSS prefixes, testing tools (BrowserStack), and progressive enhancement." },
      { question: "Explain the concept of code splitting and how you implement it.", category: "Technical", hint: "Cover dynamic imports, React.lazy, route-based splitting, and how it improves initial load time." },
    ],
    hard: [
      { question: "Design a component library from scratch for a large organization. What decisions would you make?", category: "System Design", hint: "Cover design tokens, component API design, documentation (Storybook), versioning, accessibility, and adoption strategy." },
      { question: "How would you architect a micro-frontend application?", category: "System Design", hint: "Discuss module federation, iframe approach, web components, shared state, routing, and deployment strategy." },
      { question: "How would you implement a real-time collaborative feature in a React application?", category: "Technical", hint: "Cover WebSockets, optimistic updates, conflict resolution, offline support, and state synchronization." },
      { question: "Describe the most complex frontend architecture challenge you've faced.", category: "Behavioral", hint: "Focus on the scale of the problem, architectural decisions made, trade-offs considered, and measurable outcomes." },
      { question: "How would you optimize a React application that renders 10,000 rows of data?", category: "Technical", hint: "Discuss virtualization (react-window), pagination, infinite scroll, memoization, and Web Workers." },
      { question: "How do you approach security in frontend applications?", category: "Technical", hint: "Cover XSS prevention, CSRF protection, Content Security Policy, secure cookie handling, and input sanitization." },
      { question: "How would you implement a design system that works across React, Vue, and Angular?", category: "System Design", hint: "Discuss web components, design tokens, CSS custom properties, and framework-specific wrappers." },
    ],
  },
  "Backend Developer": {
    easy: [
      { question: "What is the difference between REST and GraphQL? When would you choose each?", category: "Technical", hint: "REST=resource-based, multiple endpoints; GraphQL=single endpoint, client-specified queries. Discuss over/under-fetching." },
      { question: "How do you design a database schema for a new application?", category: "Technical", hint: "Cover normalization, relationships (1:1, 1:N, M:N), indexing strategy, and when to denormalize." },
      { question: "What is caching and how have you used it in your applications?", category: "Technical", hint: "Discuss Redis, Memcached, CDN caching, HTTP caching headers, cache invalidation strategies." },
      { question: "How do you handle authentication and authorization in your APIs?", category: "Technical", hint: "Cover JWT, OAuth 2.0, session-based auth, RBAC, and security best practices." },
      { question: "Describe a backend service you built. What were the key design decisions?", category: "Behavioral", hint: "Focus on the architecture choices, scalability considerations, and trade-offs you made." },
      { question: "What is the difference between SQL and NoSQL databases?", category: "Technical", hint: "Cover ACID vs BASE, schema flexibility, query patterns, consistency, and specific use cases for each." },
      { question: "How do you handle errors and logging in your backend services?", category: "Technical", hint: "Mention structured logging, error codes, monitoring (Datadog, New Relic), alerting, and debugging in production." },
    ],
    medium: [
      { question: "How do you design a scalable API that can handle millions of requests per day?", category: "Technical", hint: "Cover rate limiting, caching, database optimization, horizontal scaling, load balancing, and async processing." },
      { question: "Explain database transactions and ACID properties with a real example.", category: "Technical", hint: "Define Atomicity, Consistency, Isolation, Durability. Give a banking transaction as a concrete example." },
      { question: "How do you implement background job processing in your applications?", category: "Technical", hint: "Discuss message queues (RabbitMQ, Kafka, SQS), job schedulers, retry logic, dead letter queues, and idempotency." },
      { question: "Describe a time you had to optimize a slow database query. What was your approach?", category: "Behavioral", hint: "Explain how you identified the slow query, analyzed the execution plan, added indexes, and measured the improvement." },
      { question: "How do you approach API versioning?", category: "Technical", hint: "Discuss URL versioning, header versioning, backward compatibility, deprecation strategy, and client communication." },
      { question: "How do you ensure your APIs are secure against common attacks?", category: "Technical", hint: "Cover SQL injection, XSS, CSRF, rate limiting, input validation, and OWASP Top 10." },
      { question: "Explain the concept of eventual consistency and when you would accept it.", category: "Technical", hint: "Discuss CAP theorem, BASE properties, use cases (shopping cart, social feeds), and how to handle conflicts." },
    ],
    hard: [
      { question: "Design a payment processing system that handles 10,000 transactions per second.", category: "System Design", hint: "Cover idempotency, distributed transactions, saga pattern, event sourcing, and compliance requirements." },
      { question: "How would you design a notification system for 100 million users?", category: "System Design", hint: "Discuss fan-out strategies, push vs pull, message queues, delivery guarantees, and handling failures." },
      { question: "Explain how you would implement distributed transactions across multiple microservices.", category: "Technical", hint: "Cover 2PC, saga pattern (choreography vs orchestration), compensating transactions, and eventual consistency." },
      { question: "How would you design a rate limiting system that works across multiple servers?", category: "Technical", hint: "Discuss token bucket, sliding window, Redis-based distributed rate limiting, and handling edge cases." },
      { question: "Describe the most complex backend system you've built. What were the hardest problems?", category: "Behavioral", hint: "Focus on scale, complexity, architectural decisions, trade-offs, and measurable outcomes." },
      { question: "How would you implement a search feature that handles typos and synonyms?", category: "Technical", hint: "Discuss Elasticsearch, fuzzy matching, tokenization, stemming, synonyms, and relevance scoring." },
      { question: "How do you approach database migrations in a system with zero downtime requirements?", category: "Technical", hint: "Cover expand-contract pattern, backward-compatible migrations, feature flags, and rollback strategies." },
    ],
  },
};

// Default questions for roles not in the bank
const DEFAULT_BANK: Record<string, Q[]> = {
  easy: [
    { question: "Tell me about yourself and your professional background.", category: "Behavioral", hint: "Give a 2-minute summary: current role, key experience, and why you're interested in this position." },
    { question: "What are your greatest professional strengths?", category: "Behavioral", hint: "Pick 2-3 strengths relevant to the role. Back each with a specific example." },
    { question: "Why are you interested in this role?", category: "Behavioral", hint: "Connect your skills and goals to the specific role and company. Show you've done research." },
    { question: "Describe your typical work style and how you manage your time.", category: "Behavioral", hint: "Mention tools you use, how you prioritize, and how you handle competing deadlines." },
    { question: "What tools and technologies do you use daily in your current role?", category: "Technical", hint: "Be specific. Mention the tools, how you use them, and what problems they solve." },
  ],
  medium: [
    { question: "Describe a challenging project and how you overcame the obstacles.", category: "Behavioral", hint: "Use STAR method. Focus on the specific challenge, your actions, and the measurable result." },
    { question: "How do you handle tight deadlines and competing priorities?", category: "Behavioral", hint: "Describe your prioritization process, communication with stakeholders, and how you manage stress." },
    { question: "Tell me about a time you worked in a team with conflict. How did you resolve it?", category: "Behavioral", hint: "Focus on your role in the conflict, how you approached resolution, and what you learned." },
    { question: "How do you stay updated with industry trends and new technologies?", category: "Behavioral", hint: "Mention specific resources: blogs, conferences, courses, communities, and how you apply what you learn." },
    { question: "Describe a time you received critical feedback. How did you respond?", category: "Behavioral", hint: "Show self-awareness, openness to feedback, and how you used it to improve." },
  ],
  hard: [
    { question: "Where do you see yourself in 5 years and how does this role fit into that vision?", category: "Behavioral", hint: "Show ambition while being realistic. Connect your goals to what this role offers." },
    { question: "Describe a time you led a major initiative from start to finish.", category: "Behavioral", hint: "Cover how you defined the goal, built the team, managed obstacles, and measured success." },
    { question: "How would you handle a situation where you strongly disagreed with your manager's decision?", category: "Behavioral", hint: "Show you can voice concerns professionally, provide data/reasoning, and ultimately support the team decision." },
    { question: "Tell me about a significant failure in your career. What did you learn?", category: "Behavioral", hint: "Be honest and specific. Focus on what you learned and how you applied those lessons." },
    { question: "How do you approach making high-stakes decisions with incomplete information?", category: "Behavioral", hint: "Describe your framework: gather available data, identify assumptions, assess risks, decide, and monitor outcomes." },
  ],
};

// ── Skill-specific question templates ────────────────────────────────────────
// These generate UNIQUE questions based on actual skills found in the resume.

const SKILL_QUESTIONS: Record<string, Record<string, Q>> = {
  react:      { easy: { question: "How does React's component lifecycle work? Explain the key hooks you use.", category: "Technical", hint: "Cover useState, useEffect, useCallback, useMemo, and when to use each." }, medium: { question: "Explain React's reconciliation and how you optimize re-renders in large applications.", category: "Technical", hint: "Discuss React.memo, useMemo, useCallback, key prop, and profiling tools." }, hard: { question: "How would you architect a large-scale React application for a team of 20 developers?", category: "System Design", hint: "Cover folder structure, state management, code splitting, testing strategy, and CI/CD." } },
  python:     { easy: { question: "What Python features do you use most and why?", category: "Technical", hint: "Mention list comprehensions, generators, decorators, context managers, and type hints." }, medium: { question: "How do you optimize Python code for performance? Give a specific example.", category: "Technical", hint: "Discuss profiling, vectorization with numpy, async/await, multiprocessing, and Cython." }, hard: { question: "Design a high-performance Python service that processes 1 million records per minute.", category: "System Design", hint: "Cover async processing, worker pools, batch processing, memory management, and profiling." } },
  docker:     { easy: { question: "Explain Docker containers and how you've used them in your projects.", category: "Technical", hint: "Cover images, containers, Dockerfile, docker-compose, and the benefits over traditional deployment." }, medium: { question: "How do you optimize Docker images for production? What best practices do you follow?", category: "Technical", hint: "Discuss multi-stage builds, layer caching, minimal base images, security scanning, and image size." }, hard: { question: "Design a container orchestration strategy for a 50-service microservices application.", category: "System Design", hint: "Cover Kubernetes architecture, service mesh, resource limits, auto-scaling, and deployment strategies." } },
  kubernetes: { easy: { question: "What is Kubernetes and what problems does it solve?", category: "Technical", hint: "Explain container orchestration, auto-scaling, self-healing, service discovery, and load balancing." }, medium: { question: "Explain Kubernetes resource management. How do you set requests and limits?", category: "Technical", hint: "Discuss CPU/memory requests vs limits, QoS classes, namespace quotas, and LimitRange." }, hard: { question: "How would you design a Kubernetes cluster for a multi-tenant SaaS application?", category: "System Design", hint: "Cover namespace isolation, RBAC, network policies, resource quotas, and tenant onboarding automation." } },
  aws:        { easy: { question: "What AWS services have you used most and what problems did they solve?", category: "Technical", hint: "Mention specific services (EC2, S3, RDS, Lambda, etc.) and the exact use case for each." }, medium: { question: "How do you design for high availability on AWS?", category: "Technical", hint: "Cover multi-AZ deployments, Auto Scaling Groups, load balancers, Route 53 failover, and RDS Multi-AZ." }, hard: { question: "Design a serverless architecture on AWS for a real-time data processing pipeline.", category: "System Design", hint: "Cover Lambda, Kinesis/SQS, DynamoDB, API Gateway, CloudWatch, and cost optimization." } },
  sql:        { easy: { question: "Explain the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN.", category: "Technical", hint: "INNER=matching rows only, LEFT=all left + matching right, FULL OUTER=all rows from both tables." }, medium: { question: "How do you optimize a slow SQL query? Walk me through your process.", category: "Technical", hint: "Cover EXPLAIN/EXPLAIN ANALYZE, index usage, query rewriting, avoiding N+1, and partitioning." }, hard: { question: "Design a database schema for a multi-tenant SaaS application with complex reporting needs.", category: "System Design", hint: "Cover tenant isolation strategies, indexing for reporting, partitioning, and OLTP vs OLAP separation." } },
  tensorflow: { easy: { question: "What is TensorFlow and how have you used it in your projects?", category: "Technical", hint: "Explain the computation graph, tensors, and describe a specific model you built." }, medium: { question: "How do you handle overfitting when training deep learning models in TensorFlow?", category: "Technical", hint: "Discuss dropout, batch normalization, data augmentation, early stopping, and regularization." }, hard: { question: "How would you deploy a TensorFlow model to serve 10,000 predictions per second?", category: "System Design", hint: "Cover TensorFlow Serving, model optimization (quantization, pruning), batching, and horizontal scaling." } },
  pytorch:    { easy: { question: "Explain the difference between PyTorch and TensorFlow. Why did you choose PyTorch?", category: "Technical", hint: "Discuss dynamic vs static graphs, debugging ease, research vs production use cases." }, medium: { question: "How do you implement custom training loops in PyTorch?", category: "Technical", hint: "Cover forward pass, loss computation, backward pass, optimizer step, and gradient accumulation." }, hard: { question: "How would you implement distributed training for a large language model in PyTorch?", category: "System Design", hint: "Discuss data parallelism, model parallelism, gradient checkpointing, and mixed precision training." } },
  node:       { easy: { question: "Explain the Node.js event loop and how it handles asynchronous operations.", category: "Technical", hint: "Cover the call stack, event queue, microtask queue, and how callbacks/promises/async-await work." }, medium: { question: "How do you handle memory leaks in a Node.js application?", category: "Technical", hint: "Discuss heap profiling, common leak patterns (closures, event listeners), and monitoring tools." }, hard: { question: "Design a Node.js service that handles 100,000 concurrent WebSocket connections.", category: "System Design", hint: "Cover clustering, worker threads, connection pooling, backpressure handling, and horizontal scaling." } },
  mongodb:    { easy: { question: "When would you choose MongoDB over a relational database?", category: "Technical", hint: "Discuss document model benefits, schema flexibility, horizontal scaling, and use cases like catalogs or user profiles." }, medium: { question: "How do you design MongoDB schemas for performance? What indexing strategies do you use?", category: "Technical", hint: "Cover embedding vs referencing, compound indexes, text indexes, TTL indexes, and the aggregation pipeline." }, hard: { question: "How would you migrate a 10TB MongoDB database with zero downtime?", category: "System Design", hint: "Discuss rolling migrations, backward-compatible schema changes, dual-write patterns, and validation." } },
  figma:      { easy: { question: "How do you use Figma in your design workflow?", category: "Technical", hint: "Describe your process from wireframes to high-fidelity designs, component libraries, and handoff to developers." }, medium: { question: "How do you create and maintain a design system in Figma?", category: "Technical", hint: "Cover component organization, variants, auto-layout, design tokens, and keeping it in sync with code." }, hard: { question: "How would you design a design system that scales across 10 product teams?", category: "System Design", hint: "Discuss governance, contribution model, versioning, documentation, and adoption strategy." } },
  agile:      { easy: { question: "Describe your experience with Agile/Scrum. What ceremonies do you participate in?", category: "Role-Specific", hint: "Cover sprint planning, daily standups, sprint review, retrospective, and your role in each." }, medium: { question: "How do you handle scope creep in an Agile project?", category: "Behavioral", hint: "Discuss backlog management, stakeholder communication, trade-off decisions, and protecting the team's capacity." }, hard: { question: "How would you transform a waterfall team to Agile? What challenges would you face?", category: "Role-Specific", hint: "Cover change management, training, tooling, metrics, and how to handle resistance from stakeholders." } },
};

// ── Interview Question Generator ─────────────────────────────────────────────

const interviewSchema = z.object({
  resumeText: z.string().min(50).max(20000),
  jobDescription: z.string().max(5000).optional(),
  difficulty: z.enum(["easy","medium","hard"]).default("medium"),
});

router.post("/interview-questions", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = interviewSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const { resumeText, jobDescription, difficulty } = parsed.data;
  const role = detectRole(resumeText);
  const resumeTokens = new Set(tokenize(resumeText));
  const resumeKeywords = topKeywords(resumeText, 20);

  // 1. Get role-specific questions for this difficulty
  const roleBank = QUESTION_BANK[role];
  const roleQuestions: Q[] = roleBank
    ? [...(roleBank[difficulty] || [])]
    : [...(DEFAULT_BANK[difficulty] || [])];

  // 2. Get skill-specific questions based on actual resume keywords
  const skillQuestions: Q[] = [];
  for (const skill of Object.keys(SKILL_QUESTIONS)) {
    if (resumeTokens.has(skill) || resumeText.toLowerCase().includes(skill)) {
      const skillQ = SKILL_QUESTIONS[skill][difficulty];
      if (skillQ) skillQuestions.push(skillQ);
    }
  }

  // 3. Generate JD-specific questions if job description provided
  const jdQuestions: Q[] = [];
  if (jobDescription && jobDescription.trim().length > 20) {
    const jdKeywords = topKeywords(jobDescription, 8);
    const missingFromResume = jdKeywords.filter(k => !resumeTokens.has(k));
    const presentInResume = jdKeywords.filter(k => resumeTokens.has(k));

    // Questions about skills they have that the JD requires
    presentInResume.slice(0, 2).forEach(kw => {
      jdQuestions.push({
        question: `The job description emphasizes ${kw}. Can you describe your most impactful work involving ${kw}?`,
        category: "Role-Specific",
        hint: `Be specific about the project, your contribution, and the measurable outcome. Quantify your impact.`,
      });
    });

    // Questions about gaps between JD and resume
    if (missingFromResume.length > 0 && difficulty !== "easy") {
      jdQuestions.push({
        question: `This role requires experience with ${missingFromResume[0]}. How would you approach learning it quickly?`,
        category: "Situational",
        hint: `Show your learning ability. Describe your approach to picking up new technologies and give an example of doing so before.`,
      });
    }
  }

  // 4. Add behavioral questions based on resume content
  const behavioralQuestions: Q[] = [];
  if (/led|managed|team|leadership/i.test(resumeText)) {
    behavioralQuestions.push({ question: "Tell me about a time you led a team through a difficult challenge. What was your leadership approach?", category: "Behavioral", hint: "Use STAR method. Focus on how you motivated the team, resolved conflicts, and achieved the goal." });
  }
  if (/improved|optimized|increased|reduced|decreased/i.test(resumeText)) {
    behavioralQuestions.push({ question: "Walk me through a specific improvement you made that had measurable business impact. What was your process?", category: "Behavioral", hint: "Quantify the impact (%, $, time saved). Explain how you identified the opportunity and implemented the solution." });
  }
  if (/startup|founded|built|launched/i.test(resumeText)) {
    behavioralQuestions.push({ question: "You've worked in a startup/built something from scratch. How do you balance speed with quality?", category: "Behavioral", hint: "Discuss your decision framework for when to move fast vs when to invest in quality. Give a specific example." });
  }

  // 5. Assemble final question list — ensure variety
  const allQuestions: Q[] = [
    ...roleQuestions.slice(0, 5),           // 5 role+difficulty specific
    ...skillQuestions.slice(0, 3),          // 3 skill-specific from resume
    ...jdQuestions.slice(0, 2),             // 2 JD-specific
    ...behavioralQuestions.slice(0, 2),     // 2 resume-content behavioral
  ];

  // Deduplicate by question text
  const seen = new Set<string>();
  const unique = allQuestions.filter(q => {
    const key = q.question.slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Ensure minimum 8 questions
  if (unique.length < 8) {
    const fallback = DEFAULT_BANK[difficulty] || [];
    for (const q of fallback) {
      if (unique.length >= 10) break;
      const key = q.question.slice(0, 50);
      if (!seen.has(key)) { seen.add(key); unique.push(q); }
    }
  }

  const tips: Record<string, string[]> = {
    easy: [
      "Use the STAR method (Situation, Task, Action, Result) for behavioral questions.",
      "Prepare 2-3 specific examples from your experience for each question.",
      "Research the company, their products, and recent news before the interview.",
      "Prepare 3-5 thoughtful questions to ask the interviewer.",
    ],
    medium: [
      "For technical questions, think out loud — interviewers want to see your reasoning process.",
      "Use the STAR method and quantify your impact with numbers wherever possible.",
      "It's okay to ask clarifying questions before answering — it shows good communication.",
      "Prepare examples that demonstrate both technical skills and soft skills.",
    ],
    hard: [
      "For system design questions, start with requirements clarification before jumping to solutions.",
      "Discuss trade-offs explicitly — there's rarely one right answer, show you understand the nuances.",
      "Quantify everything: scale, latency requirements, cost constraints, team size.",
      "Prepare to go deep on any technology you mention — interviewers will probe your expertise.",
    ],
  };

  res.json({
    role,
    difficulty,
    questions: unique,
    tips: tips[difficulty] || tips.medium,
  });
});

// ── Role-Based Resume Suggestions ────────────────────────────────────────────

const suggestionsSchema = z.object({
  resumeText: z.string().min(50).max(20000),
  targetRole: z.string().max(100).optional(),
});

const ROLE_SUGGESTIONS: Record<string, { mustHave: string[]; niceToHave: string[]; actionVerbs: string[]; sections: string[] }> = {
  "Software Engineer": { mustHave: ["GitHub profile link","Quantified project impact (e.g., reduced load time by 40%)","Tech stack clearly listed","Education with relevant coursework"], niceToHave: ["Open source contributions","Personal projects with live demos","Certifications (AWS, GCP, Azure)","Competitive programming achievements"], actionVerbs: ["Architected","Engineered","Optimized","Deployed","Refactored","Implemented","Automated","Integrated"], sections: ["Summary","Skills","Experience","Projects","Education","Certifications"] },
  "Data Scientist": { mustHave: ["List of ML frameworks (TensorFlow, PyTorch, scikit-learn)","Kaggle profile or competition results","Published models or notebooks","Quantified model performance metrics"], niceToHave: ["Research papers or publications","Graduate degree in relevant field","Industry certifications","Blog posts or technical writing"], actionVerbs: ["Modeled","Predicted","Analyzed","Trained","Evaluated","Visualized","Extracted","Clustered"], sections: ["Summary","Technical Skills","Experience","Projects","Education","Publications"] },
  "Product Manager": { mustHave: ["Metrics-driven achievements (e.g., increased DAU by 25%)","Cross-functional team experience","Product launches mentioned","User research experience"], niceToHave: ["MBA or relevant certification","Experience with A/B testing","Familiarity with SQL or analytics tools","Industry-specific domain knowledge"], actionVerbs: ["Launched","Drove","Prioritized","Aligned","Defined","Shipped","Grew","Collaborated"], sections: ["Summary","Experience","Key Achievements","Skills","Education"] },
  "DevOps Engineer": { mustHave: ["Cloud platform certifications","CI/CD pipeline experience","Infrastructure-as-code tools","Monitoring and alerting experience"], niceToHave: ["Kubernetes certification (CKA/CKAD)","Security certifications","Cost optimization achievements","On-call experience"], actionVerbs: ["Automated","Deployed","Monitored","Scaled","Secured","Migrated","Optimized","Containerized"], sections: ["Summary","Technical Skills","Experience","Certifications","Projects","Education"] },
};

const DEFAULT_SUGGESTIONS = { mustHave: ["Clear contact information (email, LinkedIn, phone)","Quantified achievements with numbers and percentages","Relevant keywords from the job description","Clean, ATS-friendly formatting"], niceToHave: ["Professional summary tailored to the role","Portfolio or GitHub link","Relevant certifications","Volunteer work or side projects"], actionVerbs: ["Led","Built","Improved","Managed","Delivered","Achieved","Developed","Coordinated"], sections: ["Summary","Experience","Skills","Education","Projects"] };

router.post("/role-suggestions", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = suggestionsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { resumeText, targetRole } = parsed.data;
  const detectedRole = targetRole || detectRole(resumeText);
  const suggestions = ROLE_SUGGESTIONS[detectedRole] || DEFAULT_SUGGESTIONS;
  const resumeKeywords = new Set(tokenize(resumeText));
  const usedVerbs = suggestions.actionVerbs.filter(v => resumeKeywords.has(v.toLowerCase()));
  const missingVerbs = suggestions.actionVerbs.filter(v => !resumeKeywords.has(v.toLowerCase()));
  const sectionChecks = suggestions.sections.map(section => ({ section, present: new RegExp(`\\b${section}\\b`, "i").test(resumeText), quality: new RegExp(`\\b${section}\\b`, "i").test(resumeText) ? "moderate" : "missing", suggestion: `Ensure your ${section} section is comprehensive and tailored to ${detectedRole} roles.` }));
  const hasNumbers = /\d+%|\d+x|\$\d+|\d+ (users|customers|projects|teams|people)/i.test(resumeText);
  const hasLinks = /linkedin\.com|github\.com|portfolio/i.test(resumeText);
  res.json({ detectedRole, overallAssessment: `This resume targets a ${detectedRole} position. Review the suggestions below to improve your chances.`, mustHave: suggestions.mustHave, niceToHave: suggestions.niceToHave, missingKeywords: [], actionVerbs: { used: usedVerbs, missing: missingVerbs }, sections: sectionChecks, quickWins: [!hasNumbers && "Add quantified achievements (e.g., 'Increased performance by 30%')", !hasLinks && "Add your LinkedIn or GitHub profile link", missingVerbs.length > 3 && `Replace weak verbs with: ${missingVerbs.slice(0,3).join(", ")}`, sectionChecks.filter(s => !s.present).length > 0 && `Add missing sections: ${sectionChecks.filter(s=>!s.present).map(s=>s.section).join(", ")}`].filter(Boolean) as string[] });
});

// ── Recruiter Feedback Simulation ────────────────────────────────────────────

const recruiterSchema = z.object({ resumeText: z.string().min(50).max(20000), jobDescription: z.string().max(5000).optional() });

router.post("/recruiter-feedback", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = recruiterSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { resumeText, jobDescription } = parsed.data;
  const wordCount = resumeText.trim().split(/\s+/).length;
  const role = detectRole(resumeText);
  const positives: string[] = []; const concerns: string[] = []; const suggestions: string[] = [];
  if (wordCount >= 300 && wordCount <= 700) positives.push("Resume length is ideal — concise and comprehensive.");
  else if (wordCount < 300) concerns.push(`Resume is too short (${wordCount} words). Recruiters expect at least 300 words.`);
  else concerns.push(`Resume is too long (${wordCount} words). Keep it under 700 words for most roles.`);
  if (/[\w.\-]+@[\w.\-]+\.\w+/.test(resumeText)) positives.push("Contact email is present — good.");
  else concerns.push("No email address found. This is the first thing recruiters look for.");
  if (/linkedin\.com/i.test(resumeText)) positives.push("LinkedIn profile included — recruiters will check this.");
  else suggestions.push("Add your LinkedIn profile URL to make it easy for recruiters to verify your background.");
  const quantCount = (resumeText.match(/\d+%|\d+x|\$[\d,]+|\d+ (users|customers|projects|teams|people|employees)/gi) || []).length;
  if (quantCount >= 3) positives.push(`Strong use of metrics (${quantCount} quantified achievements found).`);
  else if (quantCount > 0) suggestions.push(`You have ${quantCount} quantified achievement(s). Aim for at least 3–5 to stand out.`);
  else concerns.push("No quantified achievements found. Numbers make your impact concrete and memorable.");
  const actionVerbs = ["led","built","designed","developed","launched","increased","improved","reduced","managed","created","delivered","implemented","optimized","achieved","drove","scaled","automated","architected"];
  const verbCount = actionVerbs.filter(v => new RegExp(`\\b${v}\\b`,"i").test(resumeText)).length;
  if (verbCount >= 5) positives.push("Good use of strong action verbs throughout.");
  else suggestions.push(`Use more action verbs. Found only ${verbCount}. Try: led, built, optimized, delivered.`);
  const sections = ["experience","education","skills","summary","projects"];
  const foundSections = sections.filter(s => new RegExp(`\\b${s}\\b`,"i").test(resumeText));
  if (foundSections.length >= 4) positives.push("Well-structured with clear section headers.");
  else concerns.push(`Missing key sections: ${sections.filter(s=>!foundSections.includes(s)).join(", ")}.`);
  if (jobDescription) { const jdKeywords = topKeywords(jobDescription, 10); const resumeTokens = new Set(tokenize(resumeText)); const matchRate = jdKeywords.filter(k => resumeTokens.has(k)).length / jdKeywords.length; if (matchRate >= 0.6) positives.push("Good keyword alignment with the job description."); else if (matchRate >= 0.3) suggestions.push(`Moderate keyword match (${Math.round(matchRate*100)}%). Add more JD-specific terms.`); else concerns.push(`Low keyword match with the job description (${Math.round(matchRate*100)}%). Tailor your resume more.`); }
  const likelihood = Math.min(95, Math.max(10, 40 + positives.length * 12 - concerns.length * 10));
  const verdict = likelihood >= 60 ? "Strong candidate — would likely advance to phone screen." : likelihood >= 40 ? "Potential candidate — needs some improvements before advancing." : "Needs significant work before this resume would pass initial screening.";
  res.json({ role, verdict, callbackLikelihood: likelihood, positives, concerns, suggestions, firstImpression: wordCount < 100 ? "This resume is too sparse to make a strong impression." : `As a recruiter reviewing this ${role} resume, I'd spend about 6 seconds scanning it. ${positives.length > concerns.length ? "The structure looks promising." : "I'd have some immediate concerns."}`, standoutFactor: "Add quantified achievements and tailor keywords to the specific job description." });
});

// ── Resume Heatmap ────────────────────────────────────────────────────────────

const heatmapSchema = z.object({ resumeText: z.string().min(50).max(20000) });

function scoreSection(text: string, sectionName: string): { score: number; feedback: string; present: boolean } {
  const present = new RegExp(`\\b${sectionName}\\b`, "i").test(text);
  if (!present) return { score: 0, feedback: `${sectionName} section not found. Add it to improve your score.`, present: false };
  let score = 50; const feedback: string[] = [];
  switch (sectionName.toLowerCase()) {
    case "summary": { const m = text.match(/summary[\s\S]{0,500}/i); const w = m ? m[0].split(/\s+/).length : 0; if (w >= 30 && w <= 80) { score += 30; feedback.push("Good length."); } else if (w < 30) { score += 10; feedback.push("Too brief — expand to 3–4 sentences."); } else { score += 15; feedback.push("Too long — keep to 3–4 sentences."); } if (/years? of experience/i.test(text)) { score += 10; feedback.push("Years of experience mentioned."); } if (/passionate|motivated|results-driven/i.test(text)) { score -= 5; feedback.push("Avoid clichés like 'passionate'."); } break; }
    case "experience": { const bullets = (text.match(/^[\s]*[-•*]/gm) || []).length; score += bullets >= 6 ? 30 : 10; if (bullets < 6) feedback.push("Add more bullet points."); const quant = (text.match(/\d+%|\d+x|\$[\d,]+/g) || []).length; score += quant >= 3 ? 20 : 5; if (quant < 3) feedback.push("Add more numbers and metrics."); break; }
    case "skills": { const words = tokenize(text.match(/skills[\s\S]{0,300}/i)?.[0] || ""); score += words.length >= 10 ? 40 : words.length >= 5 ? 20 : 5; if (words.length < 10) feedback.push("Add more relevant skills."); break; }
    case "education": { if (/bachelor|master|phd|b\.s\.|m\.s\.|b\.e\.|m\.e\.|degree/i.test(text)) { score += 30; feedback.push("Degree mentioned."); } if (/university|college|institute/i.test(text)) { score += 10; feedback.push("Institution named."); } if (/gpa|cgpa/i.test(text)) { score += 10; feedback.push("GPA included."); } break; }
    case "projects": { if (/github\.com/i.test(text)) { score += 30; feedback.push("GitHub links are great."); } else { score += 10; feedback.push("Add GitHub links or project descriptions."); } if (/built|developed|created|designed/i.test(text)) { score += 20; feedback.push("Good action verbs in projects."); } break; }
    case "certifications": { score += 40; feedback.push("Certifications add credibility."); if (/aws|azure|gcp|google|microsoft|cisco|pmp|scrum/i.test(text)) { score += 10; feedback.push("Industry-recognized certifications found."); } break; }
  }
  return { score: Math.min(100, score), feedback: feedback.join(" ") || "Section present.", present: true };
}

router.post("/heatmap", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = heatmapSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { resumeText } = parsed.data;
  const role = detectRole(resumeText);
  const sectionNames = ["Summary","Experience","Skills","Education","Projects","Certifications"];
  const sections = sectionNames.map(name => ({ name, ...scoreSection(resumeText, name) }));
  const overallScore = Math.round(sections.reduce((sum, s) => sum + s.score, 0) / sections.length);
  const sorted = [...sections].sort((a,b) => b.score - a.score);
  res.json({ role, overallScore, sections, strongest: sorted[0].name, weakest: sorted[sorted.length-1].name, summary: `Your ${sorted[0].name} section is your strongest. Focus on improving your ${sorted[sorted.length-1].name} section for maximum impact.` });
});

export default router;
