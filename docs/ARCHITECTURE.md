# BreachBuddy - Architecture Documentation

## System Architecture

BreachBuddy follows a modern three-tier architecture with clear separation of concerns.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  React Router│  │   Context    │      │
│  │  Components  │  │  Navigation  │  │   (State)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                           ↓                                   │
│              HTTP/HTTPS (REST API)                           │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Express    │  │  Middleware  │  │   Services   │      │
│  │   Routes     │  │  (Auth, etc) │  │   (Business) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                           ↓                                   │
│              ┌────────────┴────────────┐                     │
│              ↓                          ↓                     │
│       ┌──────────────┐          ┌──────────────┐            │
│       │   MongoDB    │          │  External    │            │
│       │   Database   │          │  APIs        │            │
│       └──────────────┘          └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack

- **React 18**: UI framework
- **Vite**: Build tool and development server
- **React Router v6**: Client-side routing
- **React Icons**: Icon library
- **Axios**: HTTP client

### Directory Structure

```
src/
├── components/           # Reusable components
│   ├── Sidebar.jsx
│   ├── DashboardLayout.jsx
│   ├── LoadingSpinner.jsx
│   └── ...
├── pages/               # Page components
│   ├── Dashboard.jsx
│   ├── SubscriptionsPage.jsx
│   ├── BreachCheckPage.jsx
│   └── ...
├── context/             # React Context providers
│   └── AuthContext.jsx
├── utils/               # Utility functions
│   └── api.js
├── App.jsx             # Root component
└── main.jsx            # Entry point
```

### Component Hierarchy

```
App
├── AuthProvider (Context)
│   ├── Router
│   │   ├── LandingPage
│   │   │   ├── Navbar
│   │   │   ├── Hero
│   │   │   ├── Features
│   │   │   └── Footer
│   │   │
│   │   ├── DashboardLayout (Protected)
│   │   │   ├── Sidebar
│   │   │   └── Dashboard
│   │   │       ├── StatCards
│   │   │       └── ServiceGrid
│   │   │
│   │   ├── DashboardLayout (Protected)
│   │   │   ├── Sidebar
│   │   │   └── SubscriptionsPage
│   │   │       ├── FilterSection
│   │   │       └── SubscriptionTable
│   │   │
│   │   └── ... (Other protected routes)
```

### State Management

#### Global State (Context API)

**AuthContext**: Manages authentication state
```javascript
{
  user: {
    id: string,
    name: string,
    email: string,
    googleId: string
  },
  loading: boolean,
  login: (credentials) => Promise,
  logout: () => void,
  updateUser: (data) => Promise
}
```

#### Local State (useState/useReducer)

Each page component manages its own local state:
- Form inputs
- Loading states
- Error messages
- Pagination
- Filters

### Routing Strategy

#### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/signup` - Signup page
- `/login/callback` - OAuth callback

#### Protected Routes
- `/dashboard` - Main dashboard
- `/subscriptions` - Subscription management
- `/breach-check` - Security monitoring
- `/surface` - API scanner
- `/settings` - User settings

#### Route Protection

```javascript
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  {/* Other protected routes */}
</Route>
```

### API Integration

#### API Client (`utils/api.js`)

```javascript
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

#### API Modules

- `authAPI`: Authentication operations
- `subscriptionAPI`: Subscription CRUD
- `emailAPI`: Email scanning
- `breachCheckAPI`: Breach monitoring
- `surfaceAPI`: Surface scanning

---

## Backend Architecture

### Technology Stack

- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: NoSQL database
- **Mongoose**: ODM for MongoDB
- **JWT**: Token-based authentication
- **bcrypt**: Password hashing

### Directory Structure

```
backend/
├── middleware/           # Express middleware
│   ├── auth.js
│   └── errorHandler.js
├── models/              # Mongoose models
│   ├── User.js
│   ├── Subscription.js
│   └── Email.js
├── routes/              # API routes
│   ├── auth.js
│   ├── subscriptions.js
│   ├── emails.js
│   └── ...
├── services/            # Business logic
│   ├── gmailService.js
│   ├── hibpService.js
│   └── ...
└── server.js           # Entry point
```

### Layered Architecture

```
┌────────────────────────────────────┐
│         Routes Layer               │
│  (HTTP request handling)           │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│      Middleware Layer              │
│  (Auth, validation, error)         │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│       Services Layer               │
│  (Business logic)                  │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│        Models Layer                │
│  (Data access)                     │
└────────────────────────────────────┘
```

### Request Flow

```
Client Request
    ↓
Express App
    ↓
Route Handler
    ↓
Authentication Middleware
    ↓
Request Validation
    ↓
Controller Logic
    ↓
Service Layer (Business Logic)
    ↓
Database Query (Mongoose)
    ↓
Response Formatting
    ↓
Client Response
```

### Database Schema

#### User Model

```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password: String (hashed),
  googleId: String,
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Subscription Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  serviceName: String,
  serviceEmail: String,
  domain: String,
  category: String (enum),
  status: String (enum: active/revoked),
  emailCount: Number,
  firstDetected: Date,
  lastEmailReceived: Date,
  unsubscribeUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Email Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  subscriptionId: ObjectId (ref: Subscription),
  gmailId: String (unique),
  threadId: String,
  from: String,
  subject: String,
  snippet: String,
  date: Date,
  labels: [String],
  createdAt: Date
}
```

### Authentication Flow

#### JWT-based Authentication

```
1. User Login
   ↓
2. Validate Credentials
   ↓
3. Generate JWT Token
   ↓
4. Return Token to Client
   ↓
5. Client Stores Token
   ↓
6. Subsequent Requests Include Token
   ↓
7. Server Validates Token
   ↓
8. Process Request
```

#### Google OAuth Flow

```
1. Client → Initiate OAuth (/auth/google)
   ↓
2. Redirect to Google Consent Screen
   ↓
3. User Approves
   ↓
4. Google → Callback (/auth/google/callback)
   ↓
5. Exchange Code for Tokens
   ↓
6. Fetch User Info
   ↓
7. Create/Update User in DB
   ↓
8. Generate JWT
   ↓
9. Redirect to Frontend with Token
```

### Service Layer

#### Gmail Service

```javascript
class GmailService {
  async scanEmails(userId, maxResults)
  async getEmailDetails(messageId)
  async extractSubscriptions(emails)
  async getUnsubscribeLink(email)
}
```

#### HIBP Service

```javascript
class HibpService {
  async checkEmail(email)
  async getBreachDetails(breachName)
  async calculateRiskScore(breaches)
}
```

#### Surface Service

```javascript
class SurfaceService {
  async quickScan(domain)
  async deepScan(domain)
  async discoverSubdomains(domain)
  async scanEndpoints(subdomain)
}
```

---

## Data Flow

### Email Scanning Flow

```
User clicks "Scan Emails"
    ↓
Frontend → POST /api/emails/scan
    ↓
Backend validates JWT
    ↓
Gmail Service initialized
    ↓
Fetch emails from Gmail API
    ↓
Extract sender information
    ↓
Categorize by domain
    ↓
Create/Update Subscriptions
    ↓
Store Email records
    ↓
Return scan results
    ↓
Frontend updates UI
```

### Subscription Management Flow

```
User performs action (revoke/grant/delete)
    ↓
Frontend → API request
    ↓
Authenticate user
    ↓
Validate subscription ownership
    ↓
Update subscription status
    ↓
Update related email records
    ↓
Return updated subscription
    ↓
Frontend refreshes data
```

### Breach Checking Flow

```
Page loads
    ↓
Frontend → GET /api/breach-check/status
    ↓
Get user's subscriptions
    ↓
For each unique email:
    ↓
    Query HIBP API
    ↓
    Cache results
    ↓
Calculate security score
    ↓
Return breach data
    ↓
Frontend displays results
```

---

## Security Architecture

### Authentication & Authorization

1. **JWT Tokens**: Stateless authentication
2. **Password Hashing**: bcrypt with salt rounds
3. **OAuth 2.0**: Google authentication
4. **Token Refresh**: Refresh token rotation
5. **Session Management**: Token expiration

### Data Protection

1. **Environment Variables**: Sensitive data in .env
2. **CORS**: Restricted origins
3. **Input Validation**: Request sanitization
4. **SQL Injection Protection**: Mongoose queries
5. **XSS Protection**: Output encoding

### API Security

1. **Rate Limiting**: Prevent abuse
2. **HTTPS Only**: Encrypted communication
3. **Helmet.js**: Security headers
4. **Content Security Policy**: XSS prevention
5. **Authentication Required**: Protected endpoints

---

## Performance Optimization

### Frontend

1. **Code Splitting**: Lazy loading routes
2. **Image Optimization**: Compressed assets
3. **Caching**: Browser caching
4. **Minification**: Production builds
5. **Tree Shaking**: Remove unused code

### Backend

1. **Database Indexing**: Fast queries
2. **Connection Pooling**: MongoDB connections
3. **Caching**: Redis (future)
4. **Pagination**: Limit response sizes
5. **Async Operations**: Non-blocking I/O

---

## Scalability Considerations

### Horizontal Scaling

- **Stateless Backend**: Multiple instances
- **Load Balancer**: Distribute traffic
- **Database Replication**: Read replicas
- **CDN**: Static asset delivery

### Vertical Scaling

- **Server Resources**: CPU, RAM
- **Database Optimization**: Query performance
- **Connection Limits**: Pool sizing

---

## Monitoring & Logging

### Application Monitoring

- **Error Tracking**: Sentry (recommended)
- **Performance Monitoring**: New Relic
- **Uptime Monitoring**: Ping services

### Logging Strategy

```javascript
// Log levels
- ERROR: Critical issues
- WARN: Potential problems
- INFO: General information
- DEBUG: Detailed debugging
```

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────┐
│         Frontend (Vercel)           │
│         Static Hosting              │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│      Backend (Railway/Heroku)       │
│      Node.js Application            │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│     Database (MongoDB Atlas)        │
│     Managed Database Service        │
└─────────────────────────────────────┘
```

### CI/CD Pipeline

```
Git Push
    ↓
GitHub Actions
    ↓
Run Tests
    ↓
Build Application
    ↓
Deploy to Staging
    ↓
Run E2E Tests
    ↓
Deploy to Production
```

---

## Future Architecture Enhancements

1. **Microservices**: Split into smaller services
2. **Message Queue**: Async job processing
3. **Caching Layer**: Redis implementation
4. **GraphQL**: Alternative to REST
5. **WebSockets**: Real-time updates
6. **Kubernetes**: Container orchestration
7. **Service Mesh**: Inter-service communication

---

For more details, see:
- [API Documentation](./API.md)
- [Development Guide](./DEVELOPMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)
