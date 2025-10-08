# Lokifi Application

This directory contains the main Lokifi application code, separated from the DevOps tooling.

## 📁 Structure

```
lokifi-app/
├── backend/              # FastAPI backend application
│   ├── app/             # Application source code
│   ├── tests/           # Backend tests
│   ├── requirements.txt # Python dependencies
│   └── Dockerfile       # Backend Docker image
│
├── frontend/            # Next.js frontend application
│   ├── src/            # Frontend source code
│   ├── public/         # Static assets
│   ├── package.json    # Node.js dependencies
│   └── Dockerfile      # Frontend Docker image
│
├── infrastructure/      # Infrastructure as Code (IaC)
│   ├── terraform/      # Terraform configurations
│   └── kubernetes/     # Kubernetes manifests
│
├── redis/              # Redis configurations
│   └── redis.conf      # Redis configuration file
│
├── docker-compose.yml       # Main Docker Compose file
├── docker-compose.dev.yml   # Development override
└── docker-compose.redis.yml # Redis-only compose
```

## 🚀 Quick Start

From the **root directory** (not this directory), use the lokifi.ps1 tool:

```powershell
# Start all services
.\lokifi.ps1 servers

# Start backend only
.\lokifi.ps1 dev -Component backend

# Start frontend only
.\lokifi.ps1 dev -Component frontend

# Stop all services
.\lokifi.ps1 stop

# Check status
.\lokifi.ps1 status
```

## 🔧 Development

### Backend Development
```powershell
cd lokifi-app/backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development
```powershell
cd lokifi-app/frontend
npm install
npm run dev
```

## 🐳 Docker Compose

All Docker Compose commands should be run from this directory:

```powershell
cd lokifi-app

# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

Or use the automated tool from the root:
```powershell
.\lokifi.ps1 servers  # Automatically handles paths
```

## 📖 Documentation

- Backend API Documentation: http://localhost:8000/docs
- Frontend Application: http://localhost:3000
- Full Documentation: See `../docs/` directory

## 🎯 Why This Structure?

The application code is separated into its own directory to:
- **Clear Separation**: DevOps tools vs application code
- **Better Organization**: Easier to navigate and understand
- **Deployment Ready**: Can be easily packaged or deployed independently
- **Scalability**: Easier to add new services or components
- **Best Practices**: Follows industry-standard project structures

## 🔗 Related Files

- **Root lokifi.ps1**: Main DevOps automation tool
- **Root docs/**: Project documentation
- **Root scripts/**: Utility scripts
- **Root monitoring/**: Monitoring configurations
- **Root security/**: Security configurations

---

*For more information, see the main README.md in the repository root.*
