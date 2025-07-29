# WorkCity API

A RESTful API for client and project management built with Node.js, Express, and MongoDB. Features JWT authentication, role-based access control, and comprehensive rate limiting.

## Features

- **JWT Authentication** - Secure login/signup with token-based auth
- **Client Management** - CRUD operations for client records
- **Project Management** - Full project lifecycle management
- **Role-Based Access** - Admin and user permissions
- **Rate Limiting** - Multi-tier protection against abuse
- **Data Validation** - Comprehensive input validation with Joi
- **MongoDB Integration** - Scalable NoSQL database

## Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB (v4.4+)
- npm or yarn

### Installation

1. **Clone and install**
```bash
git clone https://github.com/yourusername/workcity-api.git
cd workcity-api
npm install
```

2. **Environment setup**
Create `.env` file:
```env
PORT=3040
MongoServer=mongodb://localhost:27017/workcity
DB_NAME=workcity
JWT_SECRET=your-super-secret-jwt-key-minimum-256-bits
NODE_ENV=development
APPLICATION_NAME="Work City Test"
APPLICATION_PROTOCOL=http
TOKEN_LIFETIME=360000
```

3. **Start the server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | User login |

### Users
| Method | Endpoint | Description | Auth | Admin |
|--------|----------|-------------|------|-------|
| GET | `/api/users/profile` | Get current user | ✅ | ❌ |
| GET | `/api/users` | Get all users | ✅ | ✅ |

### Clients
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/clients` | Create client | ✅ |
| GET | `/api/clients` | Get all clients | ✅ |
| GET | `/api/clients/:id` | Get client by ID | ✅ |
| PUT | `/api/clients/:id` | Update client | ✅ |
| DELETE | `/api/clients/:id` | Delete client | ✅ |

### Projects
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/projects` | Create project | ✅ |
| GET | `/api/projects` | Get all projects | ✅ |
| GET | `/api/projects/:id` | Get project by ID | ✅ |
| GET | `/api/projects/client/:clientId` | Get projects by client | ✅ |
| PUT | `/api/projects/:id` | Update project | ✅ |
| DELETE | `/api/projects/:id` | Delete project | ✅ |

## Usage Examples

### 1. Register a user
```bash
curl -X POST http://localhost:3040/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "password": "securepass123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

### 3. Create a client
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@techcorp.com",
    "phone": "9876543210",
    "company": "Tech Solutions Inc"
  }'
```

### 4. Create a project
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Website Development",
    "description": "Complete website with modern design",
    "startDate": "2024-03-01",
    "client": "CLIENT_ID_HERE"
  }'
```

## Data Models

### User
```javascript
{
  name: String (required, 2-50 chars)
  email: String (required, unique, valid email)
  phone: String (required, 10-15 chars) 
  password: String (required, min 6 chars, hashed)
  role: String (enum: ['admin', 'user'], default: 'user')
}
```

### Client
```javascript
{
  name: String (required, 2-100 chars)
  email: String (required, valid email)
  phone: String (required, 10-15 chars)
  company: String (required, 2-100 chars)
  address: String (optional, max 200 chars)
  createdBy: ObjectId (ref: User)
}
```

### Project
```javascript
{
  name: String (required, 2-100 chars)
  description: String (required, 10-500 chars)
  status: String (enum: ['planning', 'in-progress', 'completed', 'on-hold'])
  startDate: Date (required)
  endDate: Date (optional, must be after startDate)
  budget: Number (optional, min: 0)
  client: ObjectId (ref: Client, required)
  createdBy: ObjectId (ref: User, required)
}
```

## Rate Limiting

- **General**: 100 requests per 15 minutes
- **Auth endpoints**: 5 requests per 15 minutes  
- **CRUD operations**: 50 requests per 15 minutes
- **Admin endpoints**: 30 requests per 15 minutes

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

Get tokens from `/api/auth/login` or `/api/auth/signup` responses.

## Error Responses

The API returns consistent error responses:

```json
{
  "error": "Error message description"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/workcity |
| `JWT_SECRET` | JWT signing secret (min 256 bits) | - |
| `NODE_ENV` | Environment mode | development |

## Production Deployment

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### PM2
```bash
npm install -g pm2
pm2 start server.js --name "workcity-api"
pm2 save
pm2 startup
```

## Project Structure

```
workcity-api/
├── controllers/         # Route handlers
├── middleware/          # Auth, rate limiting, error handling
├── models/             # MongoDB schemas
├── routes/             # API routes
├── validation/         # Input validation schemas
├── src/tests/          # Test files
├── config/             # Database configuration
├── .env.example       # Environment template
├── app.js             # Express app setup
├── server.js          # Application entry point
└── package.json       # Dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the [Issues](https://github.com/yourusername/workcity-api/issues) page
- Create a new issue with detailed information

---

**Built with Node.js, Express, and MongoDB**
