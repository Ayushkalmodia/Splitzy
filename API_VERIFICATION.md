# API Flow Verification Guide

## 🔍 Complete API Flow Verification Between Frontend and Backend

### Phase 5: API Flow Verification

This guide ensures seamless communication between Vercel frontend and Render backend.

### 1. Environment Variables Verification

#### Frontend (Vercel)
```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
```

#### Backend (Render)
```env
CLIENT_ORIGIN=https://your-frontend.vercel.app
API_PUBLIC_URL=https://your-backend.onrender.com
```

### 2. CORS Configuration Test

#### Test CORS Pre-flight Request
```bash
curl -X OPTIONS \
  -H "Origin: https://your-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -v \
  https://your-backend.onrender.com/api/auth/login
```

**Expected Response:**
- Status: 204 or 200
- Headers: `Access-Control-Allow-Origin: https://your-frontend.vercel.app`
- Headers: `Access-Control-Allow-Credentials: true`

#### Test Actual API Request
```bash
curl -X POST \
  -H "Origin: https://your-frontend.vercel.app" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -v \
  https://your-backend.onrender.com/api/auth/login
```

### 3. Authentication Flow Verification

#### Registration Flow
```javascript
// Frontend API Call
const registerUser = async (userData) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(userData)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Registration error:', error)
    throw error
  }
}
```

#### Login Flow
```javascript
const loginUser = async (credentials) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials)
    })
    
    const data = await response.json()
    
    if (response.ok) {
      // Store tokens
      localStorage.setItem('token', data.token)
      localStorage.setItem('refreshToken', data.refreshToken)
      return data
    } else {
      throw new Error(data.message || 'Login failed')
    }
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}
```

### 4. Protected Routes Verification

#### Test Authenticated Request
```javascript
const getProfile = async () => {
  const token = localStorage.getItem('token')
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Profile fetch error:', error)
    throw error
  }
}
```

### 5. Real-time Features Verification

#### Socket.IO Connection Test
```javascript
import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  withCredentials: true,
  extraHeaders: {
    'Origin': window.location.origin
  }
})

socket.on('connect', () => {
  console.log('Connected to backend:', socket.id)
})

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error)
})
```

### 6. Complete Verification Script

Create a test file `api-verification.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Splitzy API Verification</title>
    <script src="https://cdn.socket.io/4.8.3/socket.io.min.js"></script>
</head>
<body>
    <h1>Splitzy API Verification Tool</h1>
    <div id="results"></div>

    <script>
        const API_URL = 'https://your-backend.onrender.com/api'
        const SOCKET_URL = 'https://your-backend.onrender.com'
        const results = document.getElementById('results')

        function log(message, type = 'info') {
            const div = document.createElement('div')
            div.style.color = type === 'error' ? 'red' : type === 'success' ? 'green' : 'black'
            div.textContent = `${new Date().toLocaleTimeString()}: ${message}`
            results.appendChild(div)
        }

        async function testHealth() {
            try {
                const response = await fetch(`${API_URL}/health`)
                if (response.ok) {
                    log('✅ Health check passed', 'success')
                    return true
                } else {
                    log(`❌ Health check failed: ${response.status}`, 'error')
                    return false
                }
            } catch (error) {
                log(`❌ Health check error: ${error.message}`, 'error')
                return false
            }
        }

        async function testCORS() {
            try {
                const response = await fetch(`${API_URL}/health`, {
                    method: 'GET',
                    headers: {
                        'Origin': 'https://your-frontend.vercel.app'
                    }
                })
                log(`✅ CORS test passed: ${response.status}`, 'success')
                return true
            } catch (error) {
                log(`❌ CORS test failed: ${error.message}`, 'error')
                return false
            }
        }

        async function testAuth() {
            try {
                // Test registration
                const registerResponse = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        email: `test${Date.now()}@example.com`,
                        password: 'test123456',
                        name: 'Test User'
                    })
                })

                if (registerResponse.ok) {
                    log('✅ Registration test passed', 'success')
                    
                    // Test login
                    const loginResponse = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            email: `test${Date.now()}@example.com`,
                            password: 'test123456'
                        })
                    })

                    if (loginResponse.ok) {
                        log('✅ Login test passed', 'success')
                        return true
                    } else {
                        log(`❌ Login test failed: ${loginResponse.status}`, 'error')
                        return false
                    }
                } else {
                    log(`❌ Registration test failed: ${registerResponse.status}`, 'error')
                    return false
                }
            } catch (error) {
                log(`❌ Auth test error: ${error.message}`, 'error')
                return false
            }
        }

        function testSocket() {
            try {
                const socket = io(SOCKET_URL, {
                    withCredentials: true
                })

                socket.on('connect', () => {
                    log('✅ Socket.IO connection successful', 'success')
                })

                socket.on('connect_error', (error) => {
                    log(`❌ Socket.IO connection failed: ${error.message}`, 'error')
                })

                setTimeout(() => {
                    if (!socket.connected) {
                        log('❌ Socket.IO connection timeout', 'error')
                    }
                }, 5000)

                return true
            } catch (error) {
                log(`❌ Socket test error: ${error.message}`, 'error')
                return false
            }
        }

        async function runAllTests() {
            log('🚀 Starting API verification tests...')
            
            const results = await Promise.all([
                testHealth(),
                testCORS(),
                testAuth(),
                testSocket()
            ])

            const passed = results.filter(r => r).length
            const total = results.length
            
            log(`\n📊 Test Results: ${passed}/${total} tests passed`, 
                passed === total ? 'success' : 'error')
            
            if (passed === total) {
                log('🎉 All API verification tests passed!', 'success')
            } else {
                log('⚠️ Some tests failed. Check the errors above.', 'error')
            }
        }

        // Run tests when page loads
        runAllTests()
    </script>
</body>
</html>
```

### 7. Manual Verification Checklist

#### Backend Health Check
- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] Response time < 2 seconds
- [ ] No server errors in logs

#### CORS Configuration
- [ ] OPTIONS requests return proper headers
- [ ] Actual requests include frontend origin
- [ ] Credentials are allowed
- [ ] Multiple origins supported (if needed)

#### Authentication Endpoints
- [ ] `POST /api/auth/register` creates new users
- [ ] `POST /api/auth/login` returns tokens
- [ ] `POST /api/auth/refresh` refreshes tokens
- [ ] Protected routes require valid tokens

#### Data Flow
- [ ] Frontend can create groups
- [ ] Frontend can add expenses
- [ ] Real-time updates work
- [ ] Balance calculations are correct

#### Error Handling
- [ ] 401 responses for unauthorized requests
- [ ] 403 responses for forbidden requests
- [ ] 500 responses for server errors
- [ ] Proper error messages in response body

### 8. Common Issues and Solutions

#### CORS Issues
```bash
# Check current CORS settings
curl -I -H "Origin: https://your-frontend.vercel.app" \
       https://your-backend.onrender.com/api/health
```

**Solution**: Update `CLIENT_ORIGIN` environment variable on Render

#### Authentication Issues
```javascript
// Check token storage
console.log('Token:', localStorage.getItem('token'))
console.log('Refresh Token:', localStorage.getItem('refreshToken'))
```

**Solution**: Ensure tokens are stored and sent correctly

#### Socket.IO Connection Issues
```javascript
// Debug socket connection
socket.on('connect_error', (error) => {
  console.error('Socket error details:', error)
})
```

**Solution**: Check firewall and CORS settings for WebSocket

### 9. Performance Verification

#### API Response Times
- Health check: < 500ms
- Authentication: < 2s
- Data operations: < 3s
- Real-time updates: < 100ms

#### Frontend Performance
- Initial load: < 3s
- Route transitions: < 1s
- API calls: < 2s
- Socket connection: < 1s

### 10. Security Verification

#### HTTPS Enforcement
- [ ] All API calls use HTTPS
- [ ] No mixed content warnings
- [ ] SSL certificates valid

#### Token Security
- [ ] Tokens stored securely
- [ ] Refresh token rotation
- [ ] Proper token expiration

#### Input Validation
- [ ] Backend validates all inputs
- [ ] XSS protection enabled
- [ ] SQL injection prevention

---

**Note**: Run this verification after each deployment to ensure everything works correctly.
