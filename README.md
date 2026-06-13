# CertiChain — Academic Certificate Verification System

A full-stack blockchain-based platform for securely issuing, storing, and verifying academic certificates. Built with Node.js, MongoDB, Ethereum (Solidity), and Bootstrap 5.

## Features

- **Role-based access**: Admin, Institution, Student, Employer/Verifier
- **Blockchain storage**: Certificate hashes recorded immutably on Ethereum via Ganache
- **SHA-256 hashing**: Tamper detection through cryptographic certificate hashes
- **QR code verification**: Scan QR codes for instant authenticity checks
- **PDF certificates**: Downloadable PDFs with embedded QR codes
- **Student identity linking**: Students must be registered by an institution before signing up
- **Issuer access control**: Only authorized blockchain wallets can issue on-chain
- **Employer dashboard**: Verification portal with personal history
- **Dashboard analytics**: Charts, reports, and blockchain transaction history

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | HTML5, CSS3, JavaScript, Bootstrap 5, Chart.js |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| Blockchain | Ethereum, Solidity, Ganache, Web3.js |
| Security | bcrypt, JWT, SHA-256 |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) running locally **OR** set `USE_MEMORY_DB=true` in `.env` (dev only)
- [Ganache](https://trufflesuite.com/ganache/) (GUI or CLI) for local Ethereum blockchain (optional for blockchain features)

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Database — choose one:
#    Option A: Start local MongoDB (net start MongoDB)
#    Option B: Set USE_MEMORY_DB=true in .env (no install needed; data resets on restart)

# 4. Start Ganache on http://127.0.0.1:7545

# 5. Compile and deploy smart contract
npm run compile
npm run deploy

# 6. Seed admin account
npm run seed

# 7. Start the server
npm run dev
```

Open **http://localhost:3000** in your browser.

## Default Admin Account

| Email | Password |
|-------|----------|
| admin@certverify.edu | admin123 |

## User Roles

### Administrator
- Approve institution registrations
- Manage users (activate/deactivate)
- View system statistics and reports
- Monitor blockchain transactions

### Institution / Registrar
- Register students
- Issue certificates with blockchain recording
- Generate QR codes and PDF certificates

### Student
- View issued certificates
- Download PDF certificates
- Share verification links

### Employer / Verifier
- Verify certificates by ID or QR code
- View certificate details and blockchain status

## Smart Contract

Located at `contracts/CertificateRegistry.sol` with functions:

- `issueCertificate()` — Record certificate hash on blockchain
- `verifyCertificate()` — Verify hash matches on-chain record
- `getCertificate()` — Retrieve certificate data
- `updateCertificateStatus()` — Revoke or flag certificates (admin only)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/admin/stats` | Admin dashboard stats |
| GET | `/api/students` | List students (institution) |
| POST | `/api/students` | Add student |
| POST | `/api/certificates/issue` | Issue certificate |
| GET | `/api/verify/:id` | Verify certificate |
| GET | `/api/blockchain/status` | Blockchain connection status |
| GET | `/api/blockchain/transactions` | Recent on-chain transactions |

## Project Structure

```
├── contracts/          # Solidity smart contracts
├── scripts/            # Compile, deploy, seed scripts
├── build/              # Compiled contract ABI & bytecode
├── backend/
│   ├── config/         # Database configuration
│   ├── middleware/     # Auth middleware
│   ├── models/         # MongoDB schemas
│   ├── routes/         # API routes
│   ├── services/       # Blockchain & PDF services
│   └── server.js       # Express server entry point
└── frontend/
    ├── css/            # Stylesheets
    ├── js/             # Client-side JavaScript
    └── *.html          # Application pages
```

## Pages

| Page | URL | Access |
|------|-----|--------|
| Landing | `/` | Public |
| About | `/about.html` | Public |
| Login | `/login.html` | Public |
| Register | `/register.html` | Public |
| Verify | `/verify.html` | Public |
| Admin Dashboard | `/admin-dashboard.html` | Admin |
| Institution Dashboard | `/institution-dashboard.html` | Institution |
| Student Dashboard | `/student-dashboard.html` | Student |
| Employer Dashboard | `/employer-dashboard.html` | Employer |
| Issue Certificate | `/issue-certificate.html` | Institution |
| Blockchain | `/blockchain.html` | Authenticated |
| Reports | `/reports.html` | Admin |

## Security & integrity notes

- Set `REQUIRE_BLOCKCHAIN=true` in production to block issuance when Ganache/chain is offline
- Certificates not on-chain are rejected at verification time
- Blockchain issuance failure rolls back — no certificate is saved without a successful chain write (when chain is available)
- Re-run `npm run compile && npm run deploy` after contract updates

## License

MIT
