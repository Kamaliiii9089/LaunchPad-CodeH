# API Attack Surface Mapper

A comprehensive SaaS platform for discovering, analyzing, and monitoring API security vulnerabilities across your organization's infrastructure. This tool combines automated scanning with AI-powered analysis to provide actionable security insights in executive-friendly language.

## 🚀 Features

### Core Functionality
- **API Discovery**: Automated subdomain enumeration and endpoint detection
- **Vulnerability Scanning**: OWASP ZAP integration for comprehensive security testing  
- **AI Risk Analysis**: Hugging Face powered vulnerability explanations and recommendations
- **Real-time Monitoring**: Continuous scanning and alerting for new threats
- **Executive Reporting**: Non-technical summaries for C-level decision makers

### Key Capabilities
- ✅ **Subdomain Enumeration** using Sublist3r and Amass
- ✅ **Endpoint Discovery** with intelligent crawling
- ✅ **Shodan Integration** for exposure verification
- ✅ **AI-Powered Analysis** with plain English explanations
- ✅ **Automated Monitoring** with configurable schedules
- ✅ **Multi-tenant SaaS** with usage limits and billing tiers
- ✅ **REST API** for integrations
- ✅ **Slack/Email Notifications** for critical findings

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB
- **AI Integration**: Hugging Face API with LLaMA/GPT-J models
- **Security Tools**: OWASP ZAP, Sublist3r, Amass, Shodan API
- **Authentication**: JWT-based auth with bcrypt
- **Database**: MongoDB with Mongoose ODM
- **Deployment**: Docker-ready with environment configs

### Project Structure
```
api-attack-surface-mapper/
├── backend/                    # Node.js API server
│   ├── models/                # MongoDB schemas
│   ├── routes/                # Express route handlers
│   ├── services/              # Business logic & integrations
│   ├── middleware/            # Auth, validation, error handling
│   └── server.js              # Main server file
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route components
│   │   ├── contexts/          # React contexts (auth, etc.)
│   │   ├── utils/             # Helper functions
│   │   └── App.jsx            # Main app component
│   └── public/                # Static assets
└── package.json               # Root package file
```

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** 18+ and npm
- **MongoDB** 4.4+ (local or cloud)
- **Python 3.8+** (for security tools)
- **Git** for version control

### Required API Keys
Before starting, obtain these API keys:
- **Hugging Face API Key**: For AI analysis features (free tier available) - [Setup Guide](HUGGINGFACE_SETUP.md)
- **Shodan API Key**: For exposure checking (free tier available)

### Step 1: Clone and Install
```bash
# Clone the repository
git clone <your-repo-url>
cd api-attack-surface-mapper

# Install all dependencies (root, backend, frontend)
npm run install-all
```

### Step 2: Environment Configuration
```bash
# Backend environment
cd backend
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Required Environment Variables:**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/api-mapper

# Authentication  
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# AI Integration
HUGGINGFACE_API_KEY=your-huggingface-api-key-here
HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf

# External Services
SHODAN_API_KEY=your-shodan-api-key-here

# Email Notifications (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password

# Slack Integration (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Step 3: Install Security Tools

#### Option A: Using Package Managers (Recommended)
```bash
# Install Python tools
pip install sublist3r

# Install Amass (Go-based)
# On Ubuntu/Debian:
sudo apt install amass

# On macOS:
brew install amass

# Install OWASP ZAP
# Download from: https://owasp.org/www-project-zap/
```

#### Option B: Manual Installation
```bash
# Sublist3r
git clone https://github.com/aboul3la/Sublist3r.git
cd Sublist3r
pip install -r requirements.txt

# Amass  
go install -v github.com/owasp-amass/amass/v4/...@master
```

### Step 4: Database Setup
```bash
# Start MongoDB (if running locally)
mongod

# The application will create indexes automatically on startup
```

### Step 5: Start the Application
```bash
# Development mode (runs both frontend and backend)
npm run dev

# Or start individually:
# Backend only
npm run server

# Frontend only  
npm run client
```

### Step 6: Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## 📊 Usage Guide

### Getting Started
1. **Register Account**: Create your account at `/register`
2. **Add Domain**: Navigate to Domains and add your first domain to scan
3. **Run Scan**: Start a security scan from the Scans page
4. **View Results**: Check the Dashboard for scan results and AI analysis

### Plan Limits
| Feature | Free | Basic | Premium | Enterprise |
|---------|------|-------|---------|------------|
| Domains | 1 | 5 | 20 | Unlimited |
| Scans/Month | 4 | 20 | 100 | Unlimited |
| AI Analysis | ❌ | ✅ | ✅ | ✅ |
| Real-time Monitoring | ❌ | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ❌ | ✅ |

### API Endpoints

#### Authentication
```bash
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login user
GET  /api/auth/profile     # Get user profile
PUT  /api/auth/profile     # Update profile
```

#### Domains  
```bash
GET    /api/domains        # List domains
POST   /api/domains        # Add domain
GET    /api/domains/:id    # Get domain details
PUT    /api/domains/:id    # Update domain
DELETE /api/domains/:id    # Delete domain
```

#### Scans
```bash
GET  /api/scans           # List scans
POST /api/scans/start     # Start new scan
GET  /api/scans/:id       # Get scan details
POST /api/scans/:id/cancel # Cancel running scan
```

#### Reports
```bash
GET /api/reports/scan/:scanId           # Get scan report
GET /api/reports/domain/:domainId       # Get domain report  
GET /api/reports/executive-summary      # Get executive summary
```

## 🔧 Development

### Code Structure
- **Models**: MongoDB schemas with validation
- **Routes**: Express route handlers with input validation
- **Services**: Business logic and external API integrations
- **Middleware**: Authentication, authorization, error handling
- **Components**: Reusable React components with TypeScript

### Key Services
- **discoveryService.js**: API discovery and enumeration
- **vulnerabilityService.js**: Security scanning with OWASP ZAP
- **aiAnalysisService.js**: OpenAI integration for risk analysis
- **cronService.js**: Automated monitoring and scheduling

### Adding New Features
1. Create database model in `/backend/models/`
2. Add route handlers in `/backend/routes/`
3. Implement business logic in `/backend/services/`
4. Create React components in `/frontend/src/components/`
5. Add pages in `/frontend/src/pages/`

### Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests  
cd frontend
npm test
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Production Environment Variables
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://mongo:27017/api-mapper
JWT_SECRET=production-secret-key
HUGGINGFACE_API_KEY=your-production-huggingface-key
HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf
SHODAN_API_KEY=your-production-shodan-key
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        proxy_pass http://localhost:5173;
    }
}
```

## 🔒 Security Considerations

### Authentication & Authorization
- JWT tokens with secure expiration
- bcrypt password hashing with salt
- Role-based access control (RBAC)
- Rate limiting on all API endpoints

### Data Protection  
- Input validation and sanitization
- SQL injection prevention with Mongoose
- XSS protection with Content Security Policy
- CORS configuration for API access

### Infrastructure Security
- Environment variable isolation
- Secure API key management
- Regular dependency updates
- MongoDB connection encryption

## 📈 Monetization Strategy

### Freemium Model
- **Free Tier**: 1 domain, 4 scans/month, basic reporting
- **Basic Tier**: 5 domains, 20 scans/month, AI analysis
- **Premium Tier**: 20 domains, 100 scans/month, monitoring
- **Enterprise Tier**: Unlimited usage, priority support

### Revenue Streams
1. **Subscription Plans**: Monthly/annual billing
2. **Add-on Services**: Professional penetration testing
3. **Enterprise Features**: Custom integrations, on-premise deployment
4. **API Access**: Developer API with usage-based pricing

## 🤝 Contributing

### Getting Involved
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- ESLint configuration for JavaScript/React
- Prettier for code formatting
- Conventional commit messages
- Comprehensive JSDoc comments

### Issue Reporting
Please use the GitHub issue tracker for:
- Bug reports with reproduction steps
- Feature requests with use cases
- Documentation improvements
- Performance issues

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OWASP ZAP** for vulnerability scanning capabilities
- **OpenAI** for AI-powered analysis features
- **Shodan** for internet exposure data
- **Sublist3r & Amass** for subdomain enumeration
- **React & Node.js** communities for excellent tooling

## 📞 Support

- **Documentation**: Available in `/docs` directory
- **Community**: GitHub Discussions for questions
- **Enterprise Support**: Available with Premium/Enterprise plans
- **Email**: support@your-domain.com

---

**Built with ❤️ for the cybersecurity community**
