# Render Backend Deployment Configuration

## 🚀 Render.com Deployment Setup for Splitzy Backend

### Prerequisites
- GitHub repository connected to Render
- MongoDB Atlas database (recommended for production)
- Environment variables ready

### Step 1: Create New Web Service

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure the following settings:

### Step 2: Basic Configuration

```
Name: splitzy-backend
Environment: Node
Region: Choose closest to your users
Branch: main
Root Directory: splitzy-backend
```

### Step 3: Build Configuration

```
Build Command: npm install
Start Command: npm start
```

### Step 4: Environment Variables

**Required Variables:**
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/splitzy
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-here
SESSION_SECRET=your-super-secure-session-secret-here
```

**CORS Configuration:**
```
CLIENT_ORIGIN=https://your-frontend-domain.vercel.app
API_PUBLIC_URL=https://your-backend-domain.onrender.com
```

**Python Service Integration:**
```
PYTHON_SERVICE_URL=https://your-python-service.onrender.com
PYTHON_SERVICE_TIMEOUT_MS=8000
PYTHON_SERVICE_RETRIES=2
```

**OAuth (Optional):**
```
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
APPLE_CLIENT_ID=your-apple-oauth-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key
```

**Production Settings:**
```
TRUST_PROXY=1
SESSION_STORE=mongo
```

### Step 5: Advanced Settings

```
Health Check Path: /api/health
Auto-Deploy: Yes (for main branch)
Instance Type: Starter (or higher based on traffic)
```

### Step 6: Post-Deployment Verification

1. **Health Check**: Visit `https://your-backend.onrender.com/api/health`
   - Expected response: `{"status":"ok"}`

2. **CORS Test**: 
   ```bash
   curl -H "Origin: https://your-frontend-domain.vercel.app" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS \
        https://your-backend.onrender.com/api/health
   ```

3. **API Test**:
   ```bash
   curl https://your-backend.onrender.com/api/health
   ```

### Step 7: Database Setup

**MongoDB Atlas Configuration:**
1. Create a new cluster in MongoDB Atlas
2. Create a database user with read/write permissions
3. Add your Render IP to IP whitelist (0.0.0.0/0 for Render)
4. Get the connection string and update `MONGODB_URI`

### Step 8: SSL and Security

Render automatically provides:
- SSL certificates
- HTTPS redirection
- Basic DDoS protection

Additional security measures already implemented:
- Helmet.js for security headers
- Rate limiting
- Input sanitization
- CORS protection

### Step 9: Monitoring and Logs

- Access logs via Render Dashboard
- Monitor performance in Render Analytics
- Set up alerts for downtime

### Troubleshooting

**Common Issues:**

1. **Database Connection Failed**
   - Check MONGODB_URI format
   - Verify IP whitelist in MongoDB Atlas
   - Ensure database user has correct permissions

2. **CORS Errors**
   - Verify CLIENT_ORIGIN includes your frontend domain
   - Check for trailing slashes in URLs
   - Ensure both HTTP and HTTPS versions are included if needed

3. **Build Failures**
   - Check package.json scripts
   - Verify all dependencies are in package.json
   - Check Node.js version compatibility

4. **Runtime Errors**
   - Check Render logs for specific error messages
   - Verify all environment variables are set
   - Ensure MongoDB connection is working

### Environment Variables Template

Copy this template for your Render environment variables:

```env
# Core Configuration
NODE_ENV=production
PORT=10000

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/splitzy

# Authentication
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret-min-32-chars

# CORS & URLs
CLIENT_ORIGIN=https://your-app.vercel.app
API_PUBLIC_URL=https://your-backend.onrender.com

# Python Service
PYTHON_SERVICE_URL=https://your-python-service.onrender.com
PYTHON_SERVICE_TIMEOUT_MS=8000
PYTHON_SERVICE_RETRIES=2

# Production Settings
TRUST_PROXY=1
SESSION_STORE=mongo

# OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key
```

### Performance Optimization

For production deployment:

1. **Enable Caching**: Consider Redis for session storage
2. **Monitor Resources**: Upgrade instance type based on usage
3. **Database Optimization**: Use MongoDB Atlas performance advisor
4. **CDN**: Consider CDN for static assets if needed

### Deployment Commands

For manual deployment or debugging:

```bash
# Local test similar to Render
NODE_ENV=production PORT=10000 npm start

# Test build process
npm install
npm run test  # Verify tests pass
```

---

**Note**: After deployment, update your frontend environment variables to point to the new backend URL.
