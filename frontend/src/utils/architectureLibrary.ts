import type {
  ArchitectureCardConfig,
  ArchitectureIconName,
  DiagramConnectorAnimationPresetId,
  DiagramConnectorConfig,
  DiagramArrowStyle,
  DiagramConnectorRouting,
  DiagramConnectorStyle,
} from './architectureDiagramTypes';
import { AI_ARCHITECTURE_PALETTE } from './architectureDiagramTypes';

export type ArchitectureSymbolDefinition = {
  id: string;
  name: string;
  category: string;
  icon: ArchitectureIconName;
  keywords: string[];
  color: string;
};

export type ArchitectureBoxPreset = {
  id: string;
  name: string;
  keywords: string[];
  config: ArchitectureCardConfig;
};

export type ArchitectureArrowPreset = {
  id: string;
  name: string;
  keywords: string[];
  routing: DiagramConnectorRouting;
  style: DiagramConnectorStyle;
  startArrow: DiagramArrowStyle;
  endArrow: DiagramArrowStyle;
  width?: number;
  angle?: number;
  label?: string;
};

export type ArchitectureAnimatedFlowPreset = {
  id: string;
  name: string;
  keywords: string[];
  config: Partial<DiagramConnectorConfig> & { name?: string; angle?: number };
  presetId?: DiagramConnectorAnimationPresetId;
};

const symbol = (
  id: string,
  name: string,
  category: string,
  icon: ArchitectureIconName,
  keywords: string[],
  color: string,
): ArchitectureSymbolDefinition => ({ id, name, category, icon, keywords, color });

export const ARCHITECTURE_SYMBOLS: ArchitectureSymbolDefinition[] = [
  symbol('symbol-member', 'Member / User', 'Users', 'member', ['user', 'member', 'person', 'client'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-workers', 'Workers / Team', 'Workers', 'workers', ['workers', 'team', 'async', 'users'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-globe', 'Internet / Globe', 'Network', 'globe', ['internet', 'network', 'edge', 'cdn', 'web'], AI_ARCHITECTURE_PALETTE.blue),
  symbol('symbol-edge', 'Edge Network', 'Network', 'globe', ['edge', 'cdn', 'waf', 'network'], AI_ARCHITECTURE_PALETTE.blue),
  symbol('symbol-api', 'API Gateway', 'API', 'gateway', ['api', 'gateway', 'endpoint', 'rest'], AI_ARCHITECTURE_PALETTE.purple),
  symbol('symbol-rate-limit', 'Rate Limiting', 'API', 'gateway', ['rate', 'limit', 'throttle', 'api'], AI_ARCHITECTURE_PALETTE.orange),
  symbol('symbol-auth', 'Authentication', 'Security', 'auth', ['auth', 'authentication', 'security', 'shield'], AI_ARCHITECTURE_PALETTE.purple),
  symbol('symbol-database', 'Database', 'Database', 'database', ['database', 'db', 'sql', 'storage'], AI_ARCHITECTURE_PALETTE.yellow),
  symbol('symbol-storage', 'Storage', 'Storage', 'database', ['storage', 'disk', 'data', 'database'], AI_ARCHITECTURE_PALETTE.yellow),
  symbol('symbol-cache', 'Cache', 'Cache', 'database', ['cache', 'redis', 'memory', 'session'], AI_ARCHITECTURE_PALETTE.yellow),
  symbol('symbol-chat', 'Chat / Message', 'Messaging', 'chat', ['chat', 'message', 'conversation', 'orchestrator'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-stream', 'Streaming', 'Streaming', 'stream', ['stream', 'streaming', 'realtime', 'tokens'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-router', 'Model Router', 'AI and Models', 'router', ['ai', 'model', 'router', 'inference'], AI_ARCHITECTURE_PALETTE.orange),
  symbol('symbol-model', 'AI Model', 'AI and Models', 'router', ['ai', 'model', 'llm', 'neural'], AI_ARCHITECTURE_PALETTE.orange),
  symbol('symbol-gpu', 'GPU / Processor', 'GPU and Hardware', 'chip', ['gpu', 'processor', 'chip', 'hardware', 'inference'], AI_ARCHITECTURE_PALETTE.blue),
  symbol('symbol-server', 'Server', 'Servers', 'server', ['server', 'compute', 'host', 'backend'], AI_ARCHITECTURE_PALETTE.blue),
  symbol('symbol-cloud', 'Cloud', 'Cloud', 'cloud', ['cloud', 'hosting', 'infrastructure'], AI_ARCHITECTURE_PALETTE.blue),
  symbol('symbol-event', 'Event Bus', 'Messaging', 'event', ['event', 'bus', 'pubsub', 'message'], AI_ARCHITECTURE_PALETTE.orange),
  symbol('symbol-queue', 'Queue', 'Queues', 'queue', ['queue', 'jobs', 'events', 'worker'], AI_ARCHITECTURE_PALETTE.orange),
  symbol('symbol-tools', 'Tools', 'System Architecture', 'server', ['tools', 'functions', 'plugins'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-session', 'Session', 'System Architecture', 'auth', ['session', 'state', 'context'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-retry', 'Retry', 'System Architecture', 'router', ['retry', 'fallback', 'repeat'], AI_ARCHITECTURE_PALETTE.orange),
  symbol('symbol-logs', 'Logs', 'Monitoring', 'event', ['logs', 'logging', 'events'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-metrics', 'Metrics', 'Monitoring', 'analytics', ['metrics', 'monitoring', 'chart'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-billing', 'Billing', 'Monitoring', 'database', ['billing', 'payment', 'usage'], AI_ARCHITECTURE_PALETTE.yellow),
  symbol('symbol-analytics', 'Analytics', 'Monitoring', 'analytics', ['analytics', 'chart', 'insights'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-browser', 'Browser', 'Clients', 'browser', ['browser', 'web', 'client', 'frontend'], AI_ARCHITECTURE_PALETTE.blue),
  symbol('symbol-mobile', 'Mobile App', 'Clients', 'mobile', ['mobile', 'app', 'ios', 'android', 'client'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-desktop', 'Desktop Client', 'Clients', 'desktop', ['desktop', 'client', 'application'], AI_ARCHITECTURE_PALETTE.blue),
  symbol('symbol-load-balancer', 'Load Balancer', 'Network', 'loadBalancer', ['load', 'balancer', 'traffic', 'routing'], AI_ARCHITECTURE_PALETTE.purple),
  symbol('symbol-cdn', 'CDN', 'Network', 'globe', ['cdn', 'edge', 'cache', 'network'], AI_ARCHITECTURE_PALETTE.blue),
  symbol('symbol-reverse-proxy', 'Reverse Proxy', 'Network', 'reverseProxy', ['reverse', 'proxy', 'nginx', 'edge'], AI_ARCHITECTURE_PALETTE.purple),
  symbol('symbol-microservice', 'Microservice', 'Services', 'server', ['microservice', 'service', 'container', 'backend'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-cache-redis', 'Redis / Cache', 'Cache', 'cache', ['redis', 'distributed cache', 'memory', 'hot cache'], AI_ARCHITECTURE_PALETTE.yellow),
  symbol('symbol-kafka', 'Kafka / Event Bus', 'Messaging', 'event', ['kafka', 'rabbitmq', 'event bus', 'pubsub'], AI_ARCHITECTURE_PALETTE.orange),
  symbol('symbol-sql', 'SQL Database', 'Database', 'database', ['sql', 'postgres', 'mysql', 'relational'], AI_ARCHITECTURE_PALETTE.yellow),
  symbol('symbol-nosql', 'NoSQL Database', 'Database', 'database', ['nosql', 'mongodb', 'dynamodb', 'document'], AI_ARCHITECTURE_PALETTE.yellow),
  symbol('symbol-primary-db', 'Primary Database', 'Database', 'database', ['primary', 'leader', 'master', 'write database'], AI_ARCHITECTURE_PALETTE.yellow),
  symbol('symbol-replica-db', 'Replica Database', 'Database', 'database', ['replica', 'read replica', 'follower', 'standby'], AI_ARCHITECTURE_PALETTE.yellow),
  symbol('symbol-object-storage', 'Object Storage', 'Storage', 'storage', ['s3', 'blob', 'object storage', 'file storage'], AI_ARCHITECTURE_PALETTE.blue),
  symbol('symbol-external-api', 'External API', 'External Services', 'gateway', ['external api', 'third party', 'integration'], AI_ARCHITECTURE_PALETTE.purple),
  symbol('symbol-payment', 'Payment Provider', 'External Services', 'payment', ['payment', 'stripe', 'billing', 'checkout'], AI_ARCHITECTURE_PALETTE.yellow),
  symbol('symbol-email', 'Email Provider', 'External Services', 'email', ['email', 'smtp', 'notification', 'sendgrid'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-monitoring', 'Monitoring', 'Observability', 'monitoring', ['monitoring', 'alerts', 'health'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-logging', 'Logging', 'Observability', 'logging', ['logging', 'logs', 'events'], AI_ARCHITECTURE_PALETTE.green),
  symbol('symbol-service-registry', 'Service Registry', 'Services', 'registry', ['registry', 'discovery', 'service discovery'], AI_ARCHITECTURE_PALETTE.blue),
  symbol('symbol-identity-provider', 'Identity Provider', 'Security', 'identity', ['identity', 'oauth', 'sso', 'auth provider'], AI_ARCHITECTURE_PALETTE.purple),
];

export const ARCHITECTURE_BOX_PRESETS: ArchitectureBoxPreset[] = [
  {
    id: 'box-basic',
    name: 'Basic Architecture Card',
    keywords: ['architecture', 'box', 'node', 'service'],
    config: { title: 'SYSTEM NODE', subtitle: 'service / responsibility', icon: 'server' },
  },
  {
    id: 'box-database',
    name: 'Database Card',
    keywords: ['database', 'storage', 'db'],
    config: { title: 'DATABASE', subtitle: 'records / metadata', icon: 'database', accentColor: AI_ARCHITECTURE_PALETTE.yellow },
  },
  {
    id: 'box-service',
    name: 'Service Card',
    keywords: ['service', 'microservice', 'backend'],
    config: { title: 'SERVICE', subtitle: 'business capability', icon: 'server', accentColor: AI_ARCHITECTURE_PALETTE.blue },
  },
  {
    id: 'box-worker',
    name: 'Worker Card',
    keywords: ['worker', 'async', 'jobs'],
    config: { title: 'ASYNC WORKERS', subtitle: 'jobs / logs / metrics', icon: 'workers', accentColor: AI_ARCHITECTURE_PALETTE.green },
  },
  {
    id: 'box-api',
    name: 'API Card',
    keywords: ['api', 'gateway', 'auth', 'rate limit'],
    config: { title: 'API GATEWAY', subtitle: 'auth / rate limits', icon: 'gateway', accentColor: AI_ARCHITECTURE_PALETTE.purple },
  },
  {
    id: 'box-gpu',
    name: 'GPU Card',
    keywords: ['gpu', 'processor', 'inference'],
    config: { title: 'GPU INFERENCE', subtitle: 'token generation', icon: 'chip', accentColor: AI_ARCHITECTURE_PALETTE.blue },
  },
  {
    id: 'box-cache',
    name: 'Cache Card',
    keywords: ['cache', 'session', 'prompt', 'redis'],
    config: { title: 'HOT CACHE', subtitle: 'session / prompt', icon: 'cache', accentColor: AI_ARCHITECTURE_PALETTE.yellow },
  },
  {
    id: 'box-client',
    name: 'Client / User Node',
    keywords: ['client', 'user', 'browser', 'mobile', 'frontend'],
    config: { title: 'CLIENT', subtitle: 'web / mobile / desktop', icon: 'browser', accentColor: AI_ARCHITECTURE_PALETTE.blue },
  },
  {
    id: 'box-browser',
    name: 'Browser Node',
    keywords: ['browser', 'web client', 'frontend'],
    config: { title: 'BROWSER', subtitle: 'web client', icon: 'browser', accentColor: AI_ARCHITECTURE_PALETTE.blue },
  },
  {
    id: 'box-mobile',
    name: 'Mobile App Node',
    keywords: ['mobile app', 'ios', 'android', 'client'],
    config: { title: 'MOBILE APP', subtitle: 'iOS / Android', icon: 'mobile', accentColor: AI_ARCHITECTURE_PALETTE.green },
  },
  {
    id: 'box-desktop',
    name: 'Desktop Client Node',
    keywords: ['desktop client', 'desktop app', 'client'],
    config: { title: 'DESKTOP CLIENT', subtitle: 'native app', icon: 'desktop', accentColor: AI_ARCHITECTURE_PALETTE.blue },
  },
  {
    id: 'box-load-balancer',
    name: 'Load Balancer Node',
    keywords: ['load balancer', 'traffic', 'routing', 'distributed system'],
    config: { title: 'LOAD BALANCER', subtitle: 'traffic / health checks', icon: 'loadBalancer', accentColor: AI_ARCHITECTURE_PALETTE.purple },
  },
  {
    id: 'box-reverse-proxy',
    name: 'Reverse Proxy Node',
    keywords: ['reverse proxy', 'nginx', 'ingress', 'edge'],
    config: { title: 'REVERSE PROXY', subtitle: 'TLS / routing', icon: 'reverseProxy', accentColor: AI_ARCHITECTURE_PALETTE.purple },
  },
  {
    id: 'box-cdn',
    name: 'CDN / Edge Node',
    keywords: ['cdn', 'edge', 'cache', 'static assets'],
    config: { title: 'CDN / EDGE', subtitle: 'static cache / WAF', icon: 'globe', accentColor: AI_ARCHITECTURE_PALETTE.blue },
  },
  {
    id: 'box-application-server',
    name: 'Application Server Node',
    keywords: ['application server', 'app server', 'backend server'],
    config: { title: 'APP SERVER', subtitle: 'runtime / API handlers', icon: 'server', accentColor: AI_ARCHITECTURE_PALETTE.green },
  },
  {
    id: 'box-backend-server',
    name: 'Backend Server Node',
    keywords: ['backend server', 'backend', 'service'],
    config: { title: 'BACKEND SERVER', subtitle: 'business logic', icon: 'server', accentColor: AI_ARCHITECTURE_PALETTE.green },
  },
  {
    id: 'box-microservice',
    name: 'Microservice Card',
    keywords: ['microservice', 'service', 'bounded context', 'container'],
    config: {
      title: 'MICROSERVICE',
      subtitle: 'bounded capability',
      icon: 'server',
      accentColor: AI_ARCHITECTURE_PALETTE.green,
      chips: [
        { text: 'API', color: AI_ARCHITECTURE_PALETTE.green },
        { text: 'DB', color: AI_ARCHITECTURE_PALETTE.yellow },
      ],
    },
  },
  {
    id: 'box-message-queue',
    name: 'Message Queue Node',
    keywords: ['message queue', 'queue', 'rabbitmq', 'async jobs'],
    config: { title: 'MESSAGE QUEUE', subtitle: 'async jobs / retries', icon: 'queue', accentColor: AI_ARCHITECTURE_PALETTE.orange },
  },
  {
    id: 'box-event-bus',
    name: 'Kafka / Event Bus Node',
    keywords: ['kafka', 'event bus', 'pubsub', 'streaming'],
    config: { title: 'EVENT BUS', subtitle: 'topics / pub-sub', icon: 'event', accentColor: AI_ARCHITECTURE_PALETTE.orange },
  },
  {
    id: 'box-primary-db',
    name: 'Primary Database Node',
    keywords: ['primary database', 'write database', 'leader', 'sql'],
    config: { title: 'PRIMARY DB', subtitle: 'writes / transactions', icon: 'database', accentColor: AI_ARCHITECTURE_PALETTE.yellow },
  },
  {
    id: 'box-sql-db',
    name: 'SQL Database Node',
    keywords: ['sql database', 'postgres', 'mysql', 'relational'],
    config: { title: 'SQL DATABASE', subtitle: 'relational records', icon: 'database', accentColor: AI_ARCHITECTURE_PALETTE.yellow },
  },
  {
    id: 'box-nosql-db',
    name: 'NoSQL Database Node',
    keywords: ['nosql database', 'mongodb', 'dynamodb', 'document db'],
    config: { title: 'NOSQL DATABASE', subtitle: 'documents / keys', icon: 'database', accentColor: AI_ARCHITECTURE_PALETTE.yellow },
  },
  {
    id: 'box-replica-db',
    name: 'Replica Database Node',
    keywords: ['replica database', 'read replica', 'follower', 'replication'],
    config: { title: 'REPLICA DB', subtitle: 'reads / failover', icon: 'database', accentColor: AI_ARCHITECTURE_PALETTE.yellow },
  },
  {
    id: 'box-db-cluster',
    name: 'Database Cluster Node',
    keywords: ['database cluster', 'distributed database', 'cluster', 'sharding'],
    config: {
      title: 'DB CLUSTER',
      subtitle: 'shards / replicas',
      icon: 'database',
      accentColor: AI_ARCHITECTURE_PALETTE.yellow,
      chips: [
        { text: 'SHARD A', color: AI_ARCHITECTURE_PALETTE.yellow },
        { text: 'SHARD B', color: AI_ARCHITECTURE_PALETTE.yellow },
      ],
    },
  },
  {
    id: 'box-object-storage',
    name: 'Object Storage Node',
    keywords: ['object storage', 'file storage', 's3', 'blob'],
    config: { title: 'OBJECT STORAGE', subtitle: 'files / blobs', icon: 'storage', accentColor: AI_ARCHITECTURE_PALETTE.blue },
  },
  {
    id: 'box-external-api',
    name: 'External API Node',
    keywords: ['external api', 'third party', 'integration'],
    config: { title: 'EXTERNAL API', subtitle: 'third-party service', icon: 'gateway', accentColor: AI_ARCHITECTURE_PALETTE.purple },
  },
  {
    id: 'box-payment',
    name: 'Payment Provider Node',
    keywords: ['payment provider', 'stripe', 'billing', 'checkout'],
    config: { title: 'PAYMENT', subtitle: 'provider / checkout', icon: 'payment', accentColor: AI_ARCHITECTURE_PALETTE.yellow },
  },
  {
    id: 'box-email',
    name: 'Email Provider Node',
    keywords: ['email provider', 'smtp', 'notification', 'sendgrid'],
    config: { title: 'EMAIL PROVIDER', subtitle: 'mail / notifications', icon: 'email', accentColor: AI_ARCHITECTURE_PALETTE.green },
  },
  {
    id: 'box-observability',
    name: 'Observability Node',
    keywords: ['monitoring', 'logging', 'metrics', 'observability'],
    config: { title: 'OBSERVABILITY', subtitle: 'logs / metrics / traces', icon: 'monitoring', accentColor: AI_ARCHITECTURE_PALETTE.green },
  },
  {
    id: 'box-monitoring',
    name: 'Monitoring Node',
    keywords: ['monitoring', 'health checks', 'alerts'],
    config: { title: 'MONITORING', subtitle: 'alerts / health', icon: 'monitoring', accentColor: AI_ARCHITECTURE_PALETTE.green },
  },
  {
    id: 'box-logging',
    name: 'Logging Node',
    keywords: ['logging', 'logs', 'events'],
    config: { title: 'LOGGING', subtitle: 'events / audit', icon: 'logging', accentColor: AI_ARCHITECTURE_PALETTE.green },
  },
  {
    id: 'box-metrics',
    name: 'Metrics Node',
    keywords: ['metrics', 'charts', 'telemetry'],
    config: { title: 'METRICS', subtitle: 'time series', icon: 'metrics', accentColor: AI_ARCHITECTURE_PALETTE.green },
  },
  {
    id: 'box-service-registry',
    name: 'Service Registry Node',
    keywords: ['service registry', 'discovery', 'consul', 'eureka'],
    config: { title: 'SERVICE REGISTRY', subtitle: 'discovery / health', icon: 'registry', accentColor: AI_ARCHITECTURE_PALETTE.blue },
  },
  {
    id: 'box-identity',
    name: 'Identity Provider Node',
    keywords: ['identity provider', 'oauth', 'sso', 'authentication'],
    config: { title: 'IDENTITY PROVIDER', subtitle: 'OAuth / SSO / JWT', icon: 'identity', accentColor: AI_ARCHITECTURE_PALETTE.purple },
  },
  {
    id: 'box-custom',
    name: 'Empty Custom Card',
    keywords: ['custom', 'empty', 'box'],
    config: { title: 'CUSTOM NODE', subtitle: 'add your own content', icon: 'server', accentColor: AI_ARCHITECTURE_PALETTE.mutedBorder },
  },
];

export const ARCHITECTURE_ARROW_PRESETS: ArchitectureArrowPreset[] = [
  { id: 'arrow-right', name: 'Right Arrow', keywords: ['right', 'straight'], routing: 'straight', style: 'solid', startArrow: 'none', endArrow: 'arrow' },
  { id: 'arrow-left', name: 'Left Arrow', keywords: ['left', 'straight'], routing: 'straight', style: 'solid', startArrow: 'arrow', endArrow: 'none' },
  { id: 'arrow-up', name: 'Up Arrow', keywords: ['up', 'vertical'], routing: 'straight', style: 'solid', startArrow: 'none', endArrow: 'arrow', angle: -90 },
  { id: 'arrow-down', name: 'Down Arrow', keywords: ['down', 'vertical'], routing: 'straight', style: 'solid', startArrow: 'none', endArrow: 'arrow', angle: 90 },
  { id: 'arrow-double', name: 'Double-ended Arrow', keywords: ['double', 'both'], routing: 'straight', style: 'solid', startArrow: 'arrow', endArrow: 'arrow' },
  { id: 'arrow-open', name: 'Open Arrowhead', keywords: ['open', 'thin'], routing: 'straight', style: 'solid', startArrow: 'none', endArrow: 'open-arrow' },
  { id: 'arrow-circle', name: 'Circle-ended Arrow', keywords: ['circle', 'endpoint'], routing: 'straight', style: 'solid', startArrow: 'circle', endArrow: 'arrow' },
  { id: 'arrow-dashed', name: 'Dashed Arrow', keywords: ['dashed', 'dash'], routing: 'straight', style: 'dashed', startArrow: 'none', endArrow: 'arrow' },
  { id: 'arrow-dotted', name: 'Dotted Arrow', keywords: ['dotted', 'dots'], routing: 'straight', style: 'dotted', startArrow: 'none', endArrow: 'arrow' },
  { id: 'arrow-elbow', name: 'Elbow Arrow', keywords: ['elbow', 'angled'], routing: 'elbow', style: 'solid', startArrow: 'none', endArrow: 'arrow' },
  { id: 'arrow-curved', name: 'Curved Arrow', keywords: ['curved', 'curve'], routing: 'curved', style: 'solid', startArrow: 'none', endArrow: 'arrow' },
  { id: 'arrow-bezier', name: 'Bezier Arrow', keywords: ['bezier', 'curve'], routing: 'bezier', style: 'dotted', startArrow: 'none', endArrow: 'open-arrow' },
  { id: 'arrow-thick', name: 'Thick Arrow', keywords: ['thick', 'bold'], routing: 'straight', style: 'solid', startArrow: 'none', endArrow: 'arrow', width: 7 },
  { id: 'arrow-label', name: 'Arrow with Label', keywords: ['label', 'request', 'flow'], routing: 'straight', style: 'dotted', startArrow: 'none', endArrow: 'arrow', label: 'REQUEST' },
  { id: 'arrow-request', name: 'Request Flow', keywords: ['request', 'api', 'http', 'data flow'], routing: 'straight', style: 'solid', startArrow: 'none', endArrow: 'arrow', label: 'REQUEST' },
  { id: 'arrow-response', name: 'Response Flow', keywords: ['response', 'return', 'api'], routing: 'straight', style: 'dotted', startArrow: 'arrow', endArrow: 'none', label: 'RESPONSE' },
  { id: 'arrow-event', name: 'Event Flow', keywords: ['event', 'pubsub', 'kafka', 'async'], routing: 'orthogonal', style: 'dashed', startArrow: 'none', endArrow: 'arrow', label: 'EVENT' },
  { id: 'arrow-data', name: 'Data Flow', keywords: ['data', 'database', 'storage', 'read write'], routing: 'elbow', style: 'solid', startArrow: 'none', endArrow: 'arrow', label: 'DATA' },
  { id: 'arrow-pubsub', name: 'Pub/Sub Flow', keywords: ['pubsub', 'publish', 'subscribe', 'event bus'], routing: 'curved', style: 'dashed', startArrow: 'circle', endArrow: 'arrow', label: 'PUB/SUB' },
];

export const ARCHITECTURE_ANIMATED_FLOW_PRESETS: ArchitectureAnimatedFlowPreset[] = [
  {
    id: 'animated-request',
    name: 'Animated Request Arrow',
    keywords: ['animated', 'request', 'moving dots', 'green'],
    presetId: 'request-flow',
    config: { routing: 'straight', label: 'REQUEST' },
  },
  {
    id: 'animated-response',
    name: 'Animated Response Arrow',
    keywords: ['animated', 'response', 'pulse', 'green'],
    presetId: 'response-flow',
    config: { routing: 'curved', label: 'RESPONSE' },
  },
  {
    id: 'animated-dots',
    name: 'Moving Dots',
    keywords: ['animated', 'dots', 'particles', 'flow'],
    config: {
      routing: 'straight',
      style: 'dotted',
      animation: { enabled: true, type: 'moving-dots', particleCount: 5, glowEnabled: true },
    },
  },
  {
    id: 'animated-dashes',
    name: 'Moving Dashes',
    keywords: ['animated', 'dashes', 'marching'],
    config: {
      routing: 'straight',
      style: 'dashed',
      animation: { enabled: true, type: 'moving-dashes', dashLength: 9, dashGap: 9 },
    },
  },
  {
    id: 'animated-pulse',
    name: 'Travelling Pulse',
    keywords: ['animated', 'pulse', 'glow'],
    config: {
      routing: 'straight',
      style: 'solid',
      animation: { enabled: true, type: 'travelling-pulse', glowEnabled: true },
    },
  },
  {
    id: 'animated-stream',
    name: 'Streaming Flow',
    keywords: ['animated', 'stream', 'fast', 'dots'],
    presetId: 'stream-flow',
    config: { routing: 'straight', label: 'STREAM' },
  },
  {
    id: 'animated-inference',
    name: 'Inference Flow',
    keywords: ['animated', 'inference', 'arrowhead', 'blue'],
    presetId: 'inference-flow',
    config: { routing: 'straight', label: 'INFERENCE' },
  },
  {
    id: 'animated-event',
    name: 'Event Flow',
    keywords: ['animated', 'event', 'orange', 'dashes'],
    presetId: 'event-flow',
    config: { routing: 'straight', label: 'EVENT' },
  },
  {
    id: 'animated-bidirectional',
    name: 'Bidirectional Flow',
    keywords: ['animated', 'both', 'bidirectional', 'two way'],
    config: {
      routing: 'straight',
      style: 'dotted',
      startArrow: 'arrow',
      endArrow: 'arrow',
      animation: { enabled: true, type: 'moving-dots', direction: 'bidirectional', particleCount: 6 },
    },
  },
  {
    id: 'animated-curved',
    name: 'Curved Animated Connector',
    keywords: ['animated', 'curved', 'bezier'],
    config: {
      routing: 'curved',
      style: 'solid',
      animation: { enabled: true, type: 'flow-trail', trailLength: 0.24, glowEnabled: true },
    },
  },
  {
    id: 'animated-elbow',
    name: 'Elbow Animated Connector',
    keywords: ['animated', 'elbow', 'bend'],
    config: {
      routing: 'elbow',
      style: 'dotted',
      animation: { enabled: true, type: 'moving-dots', particleCount: 4, glowEnabled: true },
    },
  },
];

export const ARCHITECTURE_LIBRARY_CATEGORIES = [
  'Clients',
  'Users',
  'Network',
  'API',
  'Services',
  'Database',
  'Storage',
  'Cache',
  'Cloud',
  'Servers',
  'AI and Models',
  'GPU and Hardware',
  'Messaging',
  'Queues',
  'Security',
  'Streaming',
  'Monitoring',
  'Observability',
  'External Services',
  'Workers',
  'System Architecture',
];
