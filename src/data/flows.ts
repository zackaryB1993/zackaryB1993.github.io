/*
 * Architecture flows for the featured projects. Each flow drives the 3D scene, the
 * 2D fallback, the step legend, and the hover descriptions. Public-level detail only:
 * these describe what each system does and how the pieces connect, at the same level
 * as the resume and public documentation. No internal names, hosts, or limits.
 *
 * Positions are in scene units on a roughly 10 x 5 stage centred on the origin.
 */

export type NodeKind =
  /** Where a run starts (user, event, client). */
  | 'source'
  /** A service or component that does work. */
  | 'service'
  /** A check, signature, or approval the packet has to pass. */
  | 'gate'
  /** Something outside the system (customer service, third party). */
  | 'external'
  /** Persistent storage or a published artifact. */
  | 'store'
  /** Where the run ends. */
  | 'sink';

export type FlowNode = {
  id: string;
  label: string;
  /** Shown on hover and in the legend. */
  blurb: string;
  kind: NodeKind;
  pos: [number, number, number];
  /** Orbit nodes circle the node named here instead of sitting still. */
  orbits?: string;
};

export type FlowEdge = {
  from: string;
  to: string;
  /** Dashed edges are side effects (state writes, lookups), not the main path. */
  dashed?: boolean;
};

export type RouteStep = {
  id: string;
  /** Seconds the packet pauses here, with a short status shown while it waits. */
  wait?: number;
  waitLabel?: string;
};

export type Flow = {
  /** One sentence that sums up the whole flow; used as the figure's accessible label. */
  summary: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** Each route is followed by its own packet. The first route drives the step caption. */
  routes: RouteStep[][];
  /** Draws a faint lattice behind the scene (PQVault). */
  lattice?: boolean;
};

export const flows: Record<string, Flow> = {
  actions: {
    summary:
      'A platform event starts a workflow run. The engine runs native actions directly, or signs a webhook to the customer’s own scanner and pauses until it calls back, then records the result.',
    nodes: [
      {
        id: 'event',
        label: 'Platform event',
        kind: 'source',
        pos: [-4.6, 0, 0],
        blurb:
          'A package is finalized, a file is uploaded to a Workspace, or a recipient is added. Each event starts a run. A synchronous pre-finalize hook can also deny an event before anything changes.',
      },
      {
        id: 'engine',
        label: 'Workflow engine',
        kind: 'service',
        pos: [-2.5, 0, 0],
        blurb:
          'TypeScript Lambdas load the org-wide and personal workflows that match the event, evaluate the event filters, write an execution plan, and run the steps in priority order. Filters on earlier step results give branching without a graph.',
      },
      {
        id: 'state',
        label: 'Run state & logs',
        kind: 'store',
        pos: [-2.5, -2.1, -0.4],
        blurb:
          'Every step writes its state to DynamoDB. A stream feeds a sync Lambda that keeps a DocumentDB execution log current for the customer-facing status page.',
      },
      {
        id: 'native',
        label: 'Native action',
        kind: 'service',
        pos: [-0.4, 1.4, 0],
        blurb:
          'Built-in steps (block, hold, release, or delete a file or package, or deny the event) run in-process against the platform REST API as the workflow’s identity user. The usual pattern is block, scan, then unblock if clean.',
      },
      {
        id: 'webhook',
        label: 'Signed webhook',
        kind: 'gate',
        pos: [-0.4, -1.2, 0],
        blurb:
          'For customer-owned steps a dedicated Lambda fetches the per-action secret, signs the payload with HMAC-SHA256 and a timestamp, posts it to the customer’s endpoint, registers a one-time callback token, and halts the run.',
      },
      {
        id: 'scanner',
        label: 'Customer scanner',
        kind: 'external',
        pos: [1.5, -1.2, 0],
        blurb:
          'The customer’s own receiver (antivirus, DLP, archiving, or a reference receiver deployed into their own AWS or GCP account) verifies the signature, decrypts the package on their side, and inspects it. Content never goes through a third party.',
      },
      {
        id: 'callback',
        label: 'Callback',
        kind: 'gate',
        pos: [3.2, -1.2, 0],
        blurb:
          'The receiver posts a TRUE, FALSE, or ERROR verdict with its callback token and the run resumes with freshly minted credentials. A cleanup Lambda runs every minute and times out tokens older than 15 minutes; failed or timed-out runs can be replayed.',
      },
      {
        id: 'result',
        label: 'Result',
        kind: 'sink',
        pos: [4.8, 0.2, 0],
        blurb:
          'Later steps release, delete, or keep holding the content based on the verdict, SES emails the workflow’s notification address, and CloudWatch alarms watch every Lambda. Live in US, EU, and AU regions.',
      },
    ],
    edges: [
      { from: 'event', to: 'engine' },
      { from: 'engine', to: 'state', dashed: true },
      { from: 'engine', to: 'native' },
      { from: 'native', to: 'result' },
      { from: 'engine', to: 'webhook' },
      { from: 'webhook', to: 'scanner' },
      { from: 'scanner', to: 'callback' },
      { from: 'callback', to: 'result' },
    ],
    routes: [
      [
        { id: 'event' },
        { id: 'engine' },
        { id: 'webhook', wait: 1.6, waitLabel: 'run paused, waiting for the customer' },
        { id: 'scanner' },
        { id: 'callback' },
        { id: 'result' },
      ],
      [{ id: 'event' }, { id: 'engine' }, { id: 'native' }, { id: 'result' }],
    ],
  },

  mcp: {
    summary:
      'An AI assistant reaches the platform API two ways: a local server that encrypts on the user’s machine and asks before destructive actions, or a remote connector that only sees metadata and exchanges tokens on every call.',
    nodes: [
      {
        id: 'assistant',
        label: 'AI assistant',
        kind: 'source',
        pos: [-4.6, 0, 0],
        blurb:
          'claude.ai, Claude Desktop, Claude Code, or another MCP client asks in plain language to list, inspect, or manage encrypted packages and workspaces.',
      },
      {
        id: 'local',
        label: 'Local server',
        kind: 'service',
        pos: [-1.9, 1.4, 0],
        blurb:
          'A published stdio package with 36 tools that runs on the user’s machine. API credentials live in the OS keychain, files are encrypted and decrypted locally by the official SDK, and downloads land in a sandboxed directory with size caps.',
      },
      {
        id: 'approval',
        label: 'Approval prompt',
        kind: 'gate',
        pos: [0.7, 1.4, 0],
        blurb:
          'Destructive or sensitive tools (deletes, decrypt-to-disk, uploads, Trusted Device keys) use MCP elicitation to show an approve or decline prompt in the client before anything happens.',
      },
      {
        id: 'remote',
        label: 'Remote connector',
        kind: 'service',
        pos: [-1.9, -1.4, 0],
        blurb:
          'A stateless Streamable HTTP server on AWS Lambda behind CloudFront, WAF, and API Gateway with 21 metadata and management tools. Every request is gated on origin, bearer format, and a per-token rate limit, and the connector never holds a keycode.',
      },
      {
        id: 'exchange',
        label: 'Token exchange',
        kind: 'gate',
        pos: [0.7, -1.4, 0],
        blurb:
          'On every call the connector exchanges the user’s OAuth token (RFC 8693) for one scoped to that tenant’s API, so the inbound token is never forwarded and each request carries exactly the access it needs.',
      },
      {
        id: 'api',
        label: 'Platform API',
        kind: 'sink',
        pos: [3.6, 0, 0],
        blurb:
          'The SendSafely REST API serves both paths. A bearer-token filter validates the JWT against JWKS, checks revocation, and enforces the scope each endpoint declares. File contents and keys never leave the client.',
      },
      {
        id: 'publish',
        label: 'Published packages',
        kind: 'store',
        pos: [-1.9, -3.2, -0.4],
        blurb:
          'Packages are published through GitHub Actions with OIDC to CodeArtifact: betas on every merge, releases by tag, and the same tested tarball promoted to production.',
      },
    ],
    edges: [
      { from: 'assistant', to: 'local' },
      { from: 'local', to: 'approval' },
      { from: 'approval', to: 'api' },
      { from: 'assistant', to: 'remote' },
      { from: 'remote', to: 'exchange' },
      { from: 'exchange', to: 'api' },
      { from: 'remote', to: 'publish', dashed: true },
    ],
    routes: [
      [
        { id: 'assistant' },
        { id: 'local' },
        { id: 'approval', wait: 1.2, waitLabel: 'waiting for the user to approve' },
        { id: 'api' },
      ],
      [{ id: 'assistant' }, { id: 'remote' }, { id: 'exchange' }, { id: 'api' }],
    ],
  },

  oauth: {
    summary:
      'A client sends the user to sign in and consent, receives a PKCE-bound authorization code, redeems it for a KMS-signed token, optionally exchanges it for a narrower one, and calls the API where every endpoint checks scopes.',
    nodes: [
      {
        id: 'client',
        label: 'Client app',
        kind: 'source',
        pos: [-5, 0, 0],
        blurb:
          'An MCP client or partner application that needs to call the SendSafely API on a user’s behalf. Clients are registered with exact redirect URIs, and public clients must use PKCE.',
      },
      {
        id: 'signin',
        label: 'Sign-in & consent',
        kind: 'gate',
        pos: [-3, 1, 0],
        blurb:
          'The authorization server never sees a password. The user picks their portal, signs in to the main application, and returns with a KMS-signed, single-use handover token bound to a nonce, then approves the requested scopes on an Angular consent screen.',
      },
      {
        id: 'code',
        label: 'Auth code + PKCE',
        kind: 'gate',
        pos: [-1, -1, 0],
        blurb:
          'The server issues a one-time authorization code bound to the client’s PKCE challenge (S256) and the requested resource, so an intercepted code is useless on its own.',
      },
      {
        id: 'token',
        label: 'Access token',
        kind: 'service',
        pos: [1, 1, 0],
        blurb:
          'The code is redeemed for a short-lived RFC 9068 JWT signed with KMS RSA keys, plus a rotating refresh token. Reusing a rotated refresh token revokes the whole family and raises an alert.',
      },
      {
        id: 'store',
        label: 'Aurora MySQL',
        kind: 'store',
        pos: [1, -1.6, -0.4],
        blurb:
          'Aurora MySQL through Drizzle ORM. Every token and code is stored as a SHA-256 hash and client secrets as scrypt hashes. Introspection and revocation read from here, and an outbox streams audit events back to the platform.',
      },
      {
        id: 'exchange',
        label: 'Token exchange',
        kind: 'gate',
        pos: [3, -1, 0],
        blurb:
          'Confidential services can swap a token for a narrower, tenant-scoped one (RFC 8693). The exchanged token lives in the same grant, so revoking the family kills it too.',
      },
      {
        id: 'api',
        label: 'Scoped API call',
        kind: 'sink',
        pos: [5, 0, 0],
        blurb:
          'Java servlet filters validate the bearer JWT against JWKS, check a revocation cache and fall back to introspection (failing closed if the server is unreachable), and enforce the scope every endpoint declares.',
      },
    ],
    edges: [
      { from: 'client', to: 'signin' },
      { from: 'signin', to: 'code' },
      { from: 'code', to: 'token' },
      { from: 'token', to: 'store', dashed: true },
      { from: 'token', to: 'exchange' },
      { from: 'exchange', to: 'api' },
    ],
    routes: [
      [
        { id: 'client' },
        { id: 'signin', wait: 1, waitLabel: 'user signs in and approves scopes' },
        { id: 'code' },
        { id: 'token' },
        { id: 'exchange' },
        { id: 'api' },
      ],
    ],
  },

  'form-builder': {
    summary:
      'A user describes an intake form in chat. A streaming servlet drives a Bedrock agent that consults a knowledge base, writes a self-contained HTML form, publishes a preview to S3, and serves it with a strict CSP until the user saves it.',
    nodes: [
      {
        id: 'chat',
        label: 'Chat request',
        kind: 'source',
        pos: [-5, 0, 0],
        blurb: 'A user describes the secure intake form they want, or starts from a Quick Start template, in the form assistant’s chat.',
      },
      {
        id: 'servlet',
        label: 'Streaming servlet',
        kind: 'service',
        pos: [-3, 1, 0],
        blurb:
          'A Java servlet checks the session, CSRF token, org features, and the user’s Dropzone key, then streams progress and results back over Server-Sent Events with heartbeats so proxies never time out.',
      },
      {
        id: 'agent',
        label: 'Bedrock agent',
        kind: 'service',
        pos: [-1, -0.9, 0],
        blurb:
          'Claude Sonnet 4.5 running as a Bedrock AgentCore harness (Bedrock Agents in production today) with short-term session memory. The system prompt carries the mandatory widget patterns and a QA checklist.',
      },
      {
        id: 'kb',
        label: 'Knowledge Base',
        kind: 'store',
        pos: [-1, -2.7, -0.4],
        blurb:
          'An MCP gateway exposes one retrieval tool, backed by a Lambda that queries a Bedrock Knowledge Base on S3 Vectors with Titan v2 embeddings, filtered to the documentation for this release.',
      },
      {
        id: 'html',
        label: 'Generated form',
        kind: 'gate',
        pos: [0.9, 1, 0],
        blurb:
          'The agent writes a single self-contained HTML page that embeds the Dropzone widget. Placeholders stand in for real IDs, so the generated page never contains them.',
      },
      {
        id: 'preview',
        label: 'S3 preview',
        kind: 'store',
        pos: [2.4, -1, 0],
        blurb:
          'The HTML is extracted from the reply and published to the forms bucket under a key built from the authenticated org and user, never from model output. The rest of the reply is rendered as sanitized Markdown.',
      },
      {
        id: 'serve',
        label: 'Served form',
        kind: 'service',
        pos: [3.9, 1, 0],
        blurb:
          'The preview opens in a new tab on the org’s portal host. Placeholders are filled in at serve time and a nonce-based Content Security Policy is injected, with drafts visible only to their owner.',
      },
      {
        id: 'save',
        label: 'Saved form',
        kind: 'sink',
        pos: [5.1, -0.3, 0],
        blurb:
          'Saving copies the preview to its permanent location and records the form. Each app release ships its own prompt and knowledge base behind a release-pinned agent endpoint, so a rollout never changes a running release.',
      },
    ],
    edges: [
      { from: 'chat', to: 'servlet' },
      { from: 'servlet', to: 'agent' },
      { from: 'agent', to: 'kb', dashed: true },
      { from: 'agent', to: 'html' },
      { from: 'html', to: 'preview' },
      { from: 'preview', to: 'serve' },
      { from: 'serve', to: 'save' },
    ],
    routes: [
      [
        { id: 'chat' },
        { id: 'servlet' },
        { id: 'agent', wait: 1.3, waitLabel: 'retrieving docs and generating the form' },
        { id: 'html' },
        { id: 'preview' },
        { id: 'serve' },
        { id: 'save' },
      ],
    ],
  },

  'delta-payments': {
    summary:
      'A delta.com checkout enters the payment engine, which routes it to the chosen card network or wallet, runs CID/CVV and PSD2 checks, and returns an authorization.',
    nodes: [
      {
        id: 'checkout',
        label: 'delta.com checkout',
        kind: 'source',
        pos: [-4.8, 0, 0],
        blurb: 'A customer pays for a booking on delta.com and picks a payment method.',
      },
      {
        id: 'engine',
        label: 'Payment engine',
        kind: 'service',
        pos: [-1.6, 0, 0],
        blurb:
          'Spring Boot REST APIs and microservices that take the checkout and route it to the right card network or wallet.',
      },
      { id: 'cards', label: 'Card networks', kind: 'external', pos: [0, 0, 0], orbits: 'engine', blurb: 'All major credit and debit card networks, processed through the engine’s card path.' },
      { id: 'paypal', label: 'PayPal & PayPal Credit', kind: 'external', pos: [0, 0, 0], orbits: 'engine', blurb: 'PayPal and PayPal Credit redirect flows, with the engine completing the order after approval.' },
      { id: 'applepay', label: 'Apple Pay', kind: 'external', pos: [0, 0, 0], orbits: 'engine', blurb: 'Apple Pay tokenized payments from Safari and iOS.' },
      { id: 'googlepay', label: 'Google Pay', kind: 'external', pos: [0, 0, 0], orbits: 'engine', blurb: 'Google Pay tokenized payments from Chrome and Android.' },
      { id: 'alipay', label: 'Alipay', kind: 'external', pos: [0, 0, 0], orbits: 'engine', blurb: 'Alipay wallet payments for customers in China.' },
      { id: 'bank', label: 'Instant bank transfer', kind: 'external', pos: [0, 0, 0], orbits: 'engine', blurb: 'Real-time bank transfer as an alternative to cards.' },
      {
        id: 'cvv',
        label: 'CID/CVV check',
        kind: 'gate',
        pos: [1.4, 1.1, 0],
        blurb: 'Card security codes are verified before a card payment goes any further.',
      },
      {
        id: 'psd2',
        label: 'PSD2 / SCA',
        kind: 'gate',
        pos: [3, -0.9, 0],
        blurb: 'European payments go through Strong Customer Authentication so the engine stays compliant with PSD2.',
      },
      {
        id: 'auth',
        label: 'Authorization',
        kind: 'sink',
        pos: [4.8, 0.3, 0],
        blurb:
          'The processor approves or declines and the result is returned to checkout. Production defects here were handled as break-fix.',
      },
    ],
    edges: [
      { from: 'checkout', to: 'engine' },
      { from: 'engine', to: 'cvv' },
      { from: 'cvv', to: 'psd2' },
      { from: 'psd2', to: 'auth' },
    ],
    routes: [
      [
        { id: 'checkout' },
        { id: 'engine', wait: 0.8, waitLabel: 'routing to the chosen payment method' },
        { id: 'cvv' },
        { id: 'psd2', wait: 0.8, waitLabel: 'strong customer authentication' },
        { id: 'auth' },
      ],
    ],
  },

  'delta-ecredits': {
    summary:
      'A booking on delta.com applies an eCredit, eCertificate, or Gift Card: the eligibility rules approve it, the backend looks the document up, applies its value to fare, taxes, and fees, and the booking completes.',
    nodes: [
      {
        id: 'booking',
        label: 'Booking',
        kind: 'source',
        pos: [-5, 0, 0],
        blurb: 'A customer books a flight on delta.com and chooses to pay with an eCredit, eCertificate, or Gift Card.',
      },
      {
        id: 'checkout',
        label: 'Checkout',
        kind: 'service',
        pos: [-3, 1, 0],
        blurb: 'The frontend team’s checkout hands the e-document to the redemption backend alongside any card payment.',
      },
      {
        id: 'rules',
        label: 'Eligibility rules',
        kind: 'gate',
        pos: [-1, -1, 0],
        blurb: 'A rules service owned by a partner team decides whether this document can be applied to this fare.',
      },
      {
        id: 'lookup',
        label: 'Document lookup',
        kind: 'service',
        pos: [1, 1, 0],
        blurb: 'Backend services (Java, Spring Boot) validate the document and read its remaining value.',
      },
      {
        id: 'apply',
        label: 'Apply value',
        kind: 'service',
        pos: [3, -1, 0],
        blurb: 'The document’s value is applied against fare, taxes, and fees.',
      },
      {
        id: 'confirm',
        label: 'Confirmation',
        kind: 'sink',
        pos: [5, 0, 0],
        blurb: 'The booking completes, with any remaining balance charged to the customer’s other payment method.',
      },
    ],
    edges: [
      { from: 'booking', to: 'checkout' },
      { from: 'checkout', to: 'rules' },
      { from: 'rules', to: 'lookup' },
      { from: 'lookup', to: 'apply' },
      { from: 'apply', to: 'confirm' },
    ],
    routes: [
      [
        { id: 'booking' },
        { id: 'checkout' },
        { id: 'rules', wait: 0.9, waitLabel: 'checking the document against the fare rules' },
        { id: 'lookup' },
        { id: 'apply' },
        { id: 'confirm' },
      ],
    ],
  },

  pqvault: {
    summary:
      'Desktop, extension, web, and mobile clients share one React UI library, protect device keys with ML-KEM-768 and biometric unlock, and talk to a Rust API on PostgreSQL.',
    lattice: true,
    nodes: [
      { id: 'desktop', label: 'Desktop (Rust, Tauri)', kind: 'source', pos: [-4.8, 1.9, 0], blurb: 'Native desktop app built with Tauri on a Rust core.' },
      { id: 'extension', label: 'Browser extension', kind: 'source', pos: [-4.8, 0.65, 0], blurb: 'Browser extension for filling logins on websites.' },
      { id: 'web', label: 'Web', kind: 'source', pos: [-4.8, -0.65, 0], blurb: 'Web client for the vault in any browser.' },
      { id: 'mobile', label: 'Mobile (React Native, Expo)', kind: 'source', pos: [-4.8, -1.9, 0], blurb: 'iOS and Android app built with React Native and Expo.' },
      {
        id: 'ui',
        label: 'Shared UI library',
        kind: 'service',
        pos: [-2, 0, 0],
        blurb: 'One React/TypeScript component library drives every client, so features ship once.',
      },
      {
        id: 'biometric',
        label: 'Biometric unlock',
        kind: 'gate',
        pos: [-2, -2.4, -0.4],
        blurb: 'Native biometric unlock (Touch ID, Windows Hello) protects the device key.',
      },
      {
        id: 'kem',
        label: 'ML-KEM-768 keys',
        kind: 'gate',
        pos: [0.4, 0, 0],
        blurb:
          'Device keys use ML-KEM-768, a post-quantum key encapsulation standard, so vault data stays protected against future quantum attacks.',
      },
      {
        id: 'api',
        label: 'Rust (Axum) API',
        kind: 'service',
        pos: [2.6, 0, 0],
        blurb: 'A Rust API built with Axum. It only ever stores encrypted vault data.',
      },
      {
        id: 'db',
        label: 'PostgreSQL on AWS',
        kind: 'store',
        pos: [4.8, 0, 0],
        blurb: 'PostgreSQL with the AWS infrastructure defined in CloudFormation.',
      },
    ],
    edges: [
      { from: 'desktop', to: 'ui' },
      { from: 'extension', to: 'ui' },
      { from: 'web', to: 'ui' },
      { from: 'mobile', to: 'ui' },
      { from: 'ui', to: 'biometric', dashed: true },
      { from: 'ui', to: 'kem' },
      { from: 'kem', to: 'api' },
      { from: 'api', to: 'db' },
    ],
    routes: [
      [{ id: 'desktop' }, { id: 'ui' }, { id: 'kem', wait: 0.8, waitLabel: 'encrypting with the device key' }, { id: 'api' }, { id: 'db' }],
      [{ id: 'mobile' }, { id: 'ui' }, { id: 'kem', wait: 0.8, waitLabel: 'encrypting with the device key' }, { id: 'api' }, { id: 'db' }],
    ],
  },
};

/** Nodes in the order the first route visits them, then any remaining routes, then the rest. */
export function orderedNodes(flow: Flow): FlowNode[] {
  const seen = new Set<string>();
  const out: FlowNode[] = [];
  for (const route of flow.routes) {
    for (const step of route) {
      if (!seen.has(step.id)) {
        seen.add(step.id);
        const n = flow.nodes.find((x) => x.id === step.id);
        if (n) out.push(n);
      }
    }
  }
  for (const n of flow.nodes) if (!seen.has(n.id)) out.push(n);
  return out;
}
