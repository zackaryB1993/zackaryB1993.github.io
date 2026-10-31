/*
 * All site content lives here. Source of truth is "The One Resume" (Google Doc);
 * update this file when the resume changes. Public-level detail only.
 */

export const person = {
  name: 'Zackary Blaylock',
  short: 'Zack',
  title: 'Senior Lead Software Engineer',
  location: 'Roswell, GA',
  email: 'zackoblaylock@gmail.com',
  availability: 'available for senior and lead roles',
  tagline:
    'I build secure, cloud-native systems on AWS: end-to-end encryption, OAuth 2.1, MCP, and serverless architecture.',
  summary:
    'Senior lead software engineer with 8+ years building secure, cloud-native systems on AWS. Designed and built four production systems at SendSafely: the Actions workflow engine, an MCP server that connects AI assistants such as Claude to encrypted files, a standalone OAuth 2.1 authorization server, and an AI-driven Custom Form Builder on Amazon Bedrock. Previously built payment and eCredit redemption services at Delta Air Lines. Full-stack across TypeScript, Java, Rust, React, and Angular, with a focus on security, end-to-end encryption, and serverless architecture.',
  links: {
    github: 'https://github.com/zackaryB1993',
    linkedin: 'https://www.linkedin.com/in/zackblaylock/',
    resume: '/Zackary_Blaylock_Resume.pdf',
  },
};

/** Numbers that are true and worth showing as counters. */
export const stats = [
  { value: 8, suffix: '+', label: 'years building production software' },
  { value: 4, suffix: '', label: 'production systems designed and built at SendSafely' },
  { value: 3, suffix: '', label: 'AWS regions in production (US, EU, AU)' },
  { value: 7, suffix: '', label: 'featured projects below' },
];

export type Project = {
  slug: string;
  name: string;
  org: string;
  status: string;
  headline: string;
  body: string;
  detail: string;
  tech: string[];
  link?: { label: string; href: string };
  /** Short description of the architecture diagram, used for the 2D fallback and a11y. */
  diagram: string;
  personal?: boolean;
};

export const projects: Project[] = [
  {
    slug: 'actions',
    name: 'SendSafely Actions',
    org: 'SendSafely',
    status: 'in production · US, EU, AU',
    headline: 'A serverless workflow engine that lets customers plug in their own scanning',
    body:
      'Designed and built as the sole engineer. Moves event processing off the core web application onto AWS Lambda and lets customers plug in their own processing, such as DLP and antivirus scanning, through HMAC-signed webhooks. Supports org-wide and personal workflows executed in priority order, with block, hold, release, delete, and deny actions and filter-based branching on earlier step results.',
    detail:
      'Multi-tenant workflow automation for an E2EE file-sharing platform. TypeScript Lambdas build an execution plan for each event (package finalized, workspace file uploaded, recipient added), run native actions through the platform REST API, and pause on HMAC-signed webhooks to customer services (antivirus, DLP, archiving) until they call back, with an EventBridge-scheduled cleanup for 15-minute timeouts, replay of failed runs, and rate-limited SES notifications. A synchronous pre-finalize hook lets a workflow deny an event outright. Configuration is stored in MySQL (Hibernate), and execution state in DynamoDB, streamed to DocumentDB for customer-facing logs. Deployed with AWS SAM and CodeBuild, with CloudWatch alarms to SNS. Also built the proof-of-concept OPSWAT antivirus webhook receiver.',
    tech: ['TypeScript', 'Java', 'AWS Lambda', 'DynamoDB Streams', 'DocumentDB', 'MySQL', 'HMAC webhooks', 'EventBridge', 'SES', 'AWS SAM'],
    diagram:
      'Platform event → workflow engine → native action or signed webhook → customer scanner → callback → result. The webhook step pauses the run until the callback arrives.',
  },
  {
    slug: 'mcp',
    name: 'SendSafely MCP Server',
    org: 'SendSafely',
    status: 'live for customers',
    headline: 'Lets AI assistants such as Claude manage encrypted files without ever seeing the keys',
    body:
      'Initiated and built the MCP integration. AI assistants can list, inspect, and manage encrypted packages and workspaces through a local server (36 tools) that handles encryption on the user’s machine and asks for approval before destructive actions, or a stateless remote connector (21 tools) on AWS Lambda that only sees metadata.',
    detail:
      'TypeScript MCP server (npm workspaces monorepo) shipped two ways: a published local stdio package with OS-keychain credentials, Trusted Device keys, client-side encryption, MCP elicitation for approvals, and sandboxed downloads; and a stateless Streamable HTTP connector on Lambda behind CloudFront, WAF, and API Gateway that serves RFC 9728 protected-resource metadata, rate-limits per token, and exchanges the user’s OAuth token for a tenant-scoped token on every call. Packages are published through GitHub Actions with OIDC to CodeArtifact, and the same tested tarball is promoted to production.',
    tech: ['TypeScript', 'MCP', 'Streamable HTTP', 'AWS Lambda', 'CloudFront', 'WAF', 'API Gateway', 'OAuth 2.1', 'Token Exchange', 'CodeArtifact', 'Vitest'],
    diagram:
      'AI assistant → local server (encryption on the user’s machine) or remote connector (metadata only) → platform API.',
  },
  {
    slug: 'oauth',
    name: 'SendSafely OAuth Authorization Server',
    org: 'SendSafely',
    status: 'in production',
    headline: 'A standalone OAuth 2.1 authorization server for the whole platform',
    body:
      'Architected and built as a standalone microservice with PKCE, resource indicators, token exchange, rotating refresh tokens with family-wide reuse detection, and RFC 9068 access tokens signed with KMS RSA keys. Integrated bearer-token validation, revocation, and per-endpoint scope enforcement into the platform REST API, plus an HMAC-authenticated service-to-service layer for deactivation and connection management.',
    detail:
      'OAuth 2.1 microservice (Koa on Lambda behind CloudFront, Aurora MySQL with Drizzle ORM, Angular sign-in and consent app) supporting PKCE, resource indicators, token exchange, introspection, and revocation. Users sign in through the main application via a KMS-signed, single-use handover; tokens and client secrets are hashed at rest; refresh tokens rotate with family revocation and alerts on reuse; and Java servlet filters validate bearer JWTs against JWKS, check revocation through a cached introspection client that fails closed, and enforce scopes on every API endpoint. Audit events flow back to the platform through a retried outbox. Blue/green Lambda alias deploys.',
    tech: ['OAuth 2.1', 'PKCE', 'Token Exchange', 'JWT (RFC 9068)', 'JWKS', 'KMS', 'Koa', 'Aurora MySQL', 'Drizzle ORM', 'Angular', 'Java'],
    diagram:
      'Sign-in and consent → authorization code with PKCE → access token → token exchange → scoped API call.',
  },
  {
    slug: 'form-builder',
    name: 'SendSafely Custom Form Builder',
    org: 'SendSafely',
    status: 'in production · AgentCore engine rolling out',
    headline: 'Describe a secure intake form in chat and get a hosted, working page',
    body:
      'Designed and deployed an AI assistant that turns a chat description into a hosted Dropzone intake form. Built on Amazon Bedrock Agents and now moving to Bedrock AgentCore with Claude Sonnet 4.5, a Bedrock Knowledge Base on S3 Vectors, and an MCP gateway.',
    detail:
      'A Java SSE streaming servlet drives a Bedrock agent (Bedrock Agents in production; a Bedrock AgentCore harness with Claude Sonnet 4.5, session Memory, and an MCP gateway to a Knowledge Base on S3 Vectors with Titan v2 embeddings) that writes a self-contained HTML form, publishes a preview to S3, and serves it with a nonce-based CSP and server-side placeholder substitution so generated pages never contain real IDs. Release-pinned agent endpoints let each app release ship its own prompt and knowledge base, deployed by a scripted CloudFormation pipeline with least-privilege IAM per resource.',
    tech: ['Amazon Bedrock', 'Bedrock AgentCore', 'Claude Sonnet 4.5', 'Knowledge Bases', 'S3 Vectors', 'MCP', 'Java', 'SSE', 'Angular', 'CloudFormation'],
    diagram:
      'Chat → streaming servlet → Bedrock agent (Knowledge Base lookup) → generated HTML → S3 preview → served form with CSP → saved form.',
  },
  {
    slug: 'delta-payments',
    name: 'Delta Payment Engine',
    org: 'Delta Air Lines',
    status: 'delta.com checkout',
    headline: 'Payment processing for delta.com across every major card network and wallet',
    body:
      'Developed and maintained a payment processing engine built on Spring Boot REST APIs and microservices, supporting all major card networks plus PayPal, PayPal Credit, Alipay, Apple Pay, Google Pay, and instant bank transfer, including CID/CVV verification and PSD2 compliance.',
    detail:
      'Backend payment services (Java, Spring Boot REST APIs and microservices) for delta.com checkout, supporting all major card networks plus PayPal, PayPal Credit, Alipay, Apple Pay, Google Pay, and instant bank transfer. Maintained and hardened the engine in production, including break-fix response for critical payment defects.',
    tech: ['Java', 'Spring Boot', 'Microservices', 'PSD2', 'PayPal', 'Apple Pay', 'Google Pay', 'Alipay', 'Jenkins'],
    diagram:
      'Card networks and wallets orbit one payment engine; PSD2 and CID/CVV checks sit as gates before authorization.',
  },
  {
    slug: 'delta-ecredits',
    name: 'Delta eCredits, Certificates & Gift Cards',
    org: 'Delta Air Lines',
    status: 'delta.com booking',
    headline: 'The backend that lets customers pay with eCredits, eCertificates, and Gift Cards',
    body:
      'Built the backend for redeeming eCredits, eCertificates, Gift Cards, and other e-documents as payment on delta.com, partnering closely with the frontend and eligibility-rules teams to deliver the feature quickly and reliably.',
    detail:
      'Backend services (Java, Spring Boot) that let customers apply eCredits, eCertificates, Gift Cards, and other e-documents as payment when booking on delta.com, built alongside the frontend and eligibility-rules teams.',
    tech: ['Java', 'Spring Boot', 'REST APIs', 'JUnit', 'Gradle'],
    link: {
      label: 'Delta: Certificates, eCredits & Gift Cards',
      href: 'https://www.delta.com/us/en/booking-information/ecredits-certificates-gift-cards',
    },
    diagram: 'Booking → payment engine → eCredit, eCertificate, or Gift Card redemption → fare, taxes, and fees.',
  },
  {
    slug: 'pqvault',
    name: 'PQVault',
    org: 'Personal side project',
    status: 'in development',
    headline: 'A post-quantum encrypted password manager across desktop, extension, web, and mobile',
    body:
      'Personal side project, in development. Desktop (Rust, Tauri), browser extension, web, and mobile (React Native, Expo) clients built on a shared React/TypeScript UI library, with a Rust (Axum) API on PostgreSQL and AWS infrastructure defined in CloudFormation.',
    detail:
      'Uses ML-KEM-768 for device keys and native biometric unlock (Touch ID, Windows Hello). The repository is private; the Z&K Tech marketing site has more context.',
    tech: ['Rust', 'Tauri', 'Axum', 'React', 'TypeScript', 'React Native', 'Expo', 'PostgreSQL', 'ML-KEM-768', 'CloudFormation'],
    link: { label: 'Z&K Tech', href: 'https://stage.zak-tech.us/' },
    diagram: 'Desktop, extension, web, and mobile clients → shared UI library → Rust API, with an ML-KEM key badge.',
    personal: true,
  },
];

export const moreWork = [
  {
    title: 'Webhook receivers',
    body: 'Built the proof-of-concept OPSWAT antivirus webhook receiver that customers deploy into their own cloud account as an Actions step.',
    tech: 'Lambda · HMAC · OPSWAT',
  },
  {
    title: 'Platform integrations',
    body: 'Built and shipped integrations for Freshdesk, Zendesk, Salesforce, Outlook, Slack, Chrome, and a serverless email gateway.',
    tech: 'Node.js · Java · OAuth',
  },
  {
    title: 'Client SDKs',
    body: 'Maintain the client API SDKs in Java, Node.js, Python, and .NET.',
    tech: 'Java · Node.js · Python · .NET',
  },
  {
    title: 'Claude agent skills',
    body: 'Created Claude agent skills, adopted across the engineering team, that standardize development workflows.',
    tech: 'Claude Code · MCP',
  },
  {
    title: 'AWS infrastructure',
    body: 'Provision and maintain infrastructure with CloudFormation across ECS, Lambda, EC2, RDS, DynamoDB, S3, and CloudFront, secured with IAM, WAF, and Secrets Manager.',
    tech: 'CloudFormation · IAM · WAF · CloudWatch',
  },
  {
    title: 'CI/CD pipelines',
    body: 'Enhanced CI/CD with GitHub Actions, CodeArtifact, and AWS deployment strategies, improving release consistency and reducing manual steps.',
    tech: 'GitHub Actions · CodeArtifact',
  },
];

export const experience = [
  {
    company: 'SendSafely',
    role: 'Senior Lead Software Engineer',
    when: 'Dec 2020 – present',
    where: 'Remote',
    blurb: 'End-to-end encrypted secure file transfer platform.',
    highlights: [
      'Lead full-stack development across web applications, client SDKs, and third-party integrations built on E2EE principles.',
      'Designed and built SendSafely Actions, the MCP server, the OAuth 2.1 authorization server, and the Custom Form Builder on Amazon Bedrock.',
      'Partner with Product Management on technical planning and roadmap execution, and lead triage of customer-reported defects through fix and release.',
    ],
    current: true,
  },
  {
    company: 'Delta Air Lines',
    role: 'Full Stack Software Engineer',
    when: 'Mar 2019 – Dec 2020',
    where: 'Atlanta, GA',
    blurb: 'Payments and e-document redemption for delta.com.',
    highlights: [
      'Developed and maintained the payment processing engine and the eCredit, eCertificate, and Gift Card redemption backend.',
      'Led development of an Angular payment portal UI with WCAG accessibility compliance.',
      'Maintained Jenkins and Gradle CI/CD pipelines with JUnit and Jest coverage, and provided production break-fix support.',
    ],
  },
  {
    company: 'Cox Automotive',
    role: 'Frontend Software Developer',
    when: 'Jan 2019 – Mar 2019',
    where: 'Remote',
    highlights: ['Built reusable React components and maintained CSS/SASS styling for a production web application.'],
  },
  {
    company: 'Hiliteu',
    role: 'Software Developer',
    when: 'Jan 2018 – Jan 2019',
    where: 'Remote',
    highlights: [
      'Developed features for a React/Redux web application and automated subscriber onboarding, social posting, and email campaigns.',
    ],
  },
];

export const skills: { group: string; items: string[] }[] = [
  { group: 'Languages', items: ['TypeScript', 'JavaScript', 'Java', 'Python', 'Rust', 'SQL', 'Bash'] },
  { group: 'Frontend', items: ['React', 'Next.js', 'Angular', 'Vue', 'Redux', 'Tailwind CSS', 'SASS', 'Astro', 'WCAG accessibility'] },
  { group: 'Mobile & Desktop', items: ['React Native (Expo)', 'Tauri'] },
  { group: 'Backend', items: ['Node.js', 'Spring Boot', 'Spring Security', 'Spring Data JPA', 'Hibernate', 'Koa', 'Axum (Rust)', 'Prisma'] },
  { group: 'Databases', items: ['PostgreSQL', 'MySQL', 'Aurora MySQL', 'MongoDB', 'DynamoDB', 'DocumentDB', 'Drizzle ORM', 'Flyway'] },
  {
    group: 'AWS',
    items: ['ECS', 'App Runner', 'Lambda', 'EC2', 'VPC', 'ALB', 'RDS', 'S3', 'S3 Vectors', 'CloudFront', 'Route 53', 'Bedrock', 'IAM', 'WAF', 'Secrets Manager', 'KMS', 'API Gateway', 'SSM', 'SES', 'SNS', 'EventBridge', 'DynamoDB Streams', 'CloudWatch', 'ECR', 'SAM', 'CodeBuild', 'Amplify'],
  },
  { group: 'Other Cloud', items: ['Google Cloud (GCP)', 'Firebase', 'Heroku'] },
  { group: 'DevOps & CI/CD', items: ['Docker', 'Docker Compose', 'CloudFormation', 'GitHub Actions', 'Jenkins', 'CodeArtifact'] },
  { group: 'Auth & Security', items: ['OAuth 2.1', 'PKCE', 'Token Exchange (RFC 8693)', 'JWT (RFC 9068)', 'JWKS', 'Auth0', 'Auth.js', 'HMAC request signing', 'E2EE'] },
  { group: 'Payments & Messaging', items: ['Stripe', 'PayPal', 'Alipay', 'Apple Pay', 'Google Pay', 'PSD2', 'Twilio'] },
  { group: 'Testing', items: ['Jest', 'Vitest', 'JUnit', 'Jasmine', 'Karma'] },
  { group: 'AI', items: ['Amazon Bedrock Agents', 'Bedrock AgentCore', 'Bedrock Knowledge Bases', 'Anthropic API', 'OpenAI API', 'OpenRouter', 'Claude Code', 'Cursor', 'MCP'] },
  { group: 'Architecture', items: ['REST APIs', 'OpenAPI', 'Server-Sent Events', 'Microservices', 'Multi-tenancy'] },
  { group: 'Tools', items: ['Git', 'GitHub', 'GitLab', 'npm', 'Yarn', 'Maven', 'Gradle', 'Cargo', 'Vite', 'Webpack'] },
];

export const education = [
  { school: 'University of Kentucky', detail: 'Bachelor of Business Administration, Management', where: 'Lexington, KY', when: 'May 2016' },
  { school: 'Kennesaw State University', detail: 'Certificate in Computer Science Foundation', where: 'Kennesaw, GA', when: 'May 2017' },
  { school: 'Thinkful', detail: 'Full Stack Web Development Immersion (Bootcamp)', where: 'Remote', when: 'Mar 2018' },
];

export const nav = [
  { label: 'Work', href: '#work' },
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Contact', href: '#contact' },
];
