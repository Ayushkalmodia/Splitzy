# Vercel Frontend Deployment Configuration

## 🚀 Vercel.com Deployment Setup for Splitzy Frontend

### Prerequisites
- GitHub repository connected to Vercel
- Backend API deployed on Render
- Environment variables ready

### Step 1: Create New Project

1. Go to Vercel Dashboard → Add New → Project
2. Import your GitHub repository
3. Configure the following settings:

### Step 2: Project Configuration

```
Project Name: splitzy-client
Framework Preset: Vite
Root Directory: splitzy-client
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### Step 3: Environment Variables

**Required Variables:**
```
VITE_API_URL=https://your-backend-domain.onrender.com/api
VITE_SOCKET_URL=https://your-backend-domain.onrender.com
```

**Example for Production:**
```
VITE_API_URL=https://splitzy-backend.onrender.com/api
VITE_SOCKET_URL=https://splitzy-backend.onrender.com
```

### Step 4: Build Settings

Verify these settings in Vercel dashboard:

```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Node.js Version: 18.x (or latest)
```

### Step 5: Domain Configuration

1. **Default Domain**: `https://splitzy-client.vercel.app`
2. **Custom Domain** (optional):
   - Add custom domain in Vercel dashboard
   - Update DNS records as instructed
   - Update CORS in backend to include custom domain

### Step 6: Deployment Process

Vercel will automatically:
1. Install dependencies
2. Build the React application
3. Deploy to global CDN
4. Provide SSL certificates
5. Set up continuous deployment

### Step 7: Post-Deployment Verification

1. **Basic Functionality**:
   - Visit your deployed URL
   - Check if the app loads without errors
   - Verify all pages are accessible

2. **API Connectivity**:
   - Open browser dev tools
   - Check Network tab for API calls
   - Verify requests go to correct backend URL

3. **Authentication Flow**:
   - Test registration/login
   - Verify token storage
   - Check protected routes

### Step 8: CORS Configuration Update

**Important**: Update your backend CORS settings to include the new frontend URL:

In your Render backend environment variables:
```
CLIENT_ORIGIN=https://splitzy-client.vercel.app,https://your-custom-domain.com
```

### Step 9: Environment Files

Create `.env.production` in `splitzy-client/` (optional, for local testing):

```env
VITE_API_URL=https://splitzy-backend.onrender.com/api
VITE_SOCKET_URL=https://splitzy-backend.onrender.com
```

### Step 10: Custom Configuration (Optional)

Create `vercel.json` in `splitzy-client/` for custom settings:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Troubleshooting

**Common Issues:**

1. **Build Failures**:
   ```bash
   # Local build test
   cd splitzy-client
   npm run build
   npm run preview
   ```

2. **API Connection Errors**:
   - Check `VITE_API_URL` environment variable
   - Verify backend is running and accessible
   - Check CORS settings on backend

3. **White Screen/404 Errors**:
   - Check build output in `dist/` folder
   - Verify `index.html` exists
   - Check routing configuration

4. **Environment Variables Not Working**:
   - Ensure variables start with `VITE_`
   - Check Vercel dashboard environment variables
   - Redeploy after adding variables

### Performance Optimization

**Build Optimization:**
```javascript
// vite.config.js updates for production
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'clsx']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    host: true
  }
})
```

### Deployment Commands

For local testing:

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Test environment variables
echo $VITE_API_URL
```

### Monitoring and Analytics

Vercel provides built-in:
- Build logs
- Performance metrics
- Error tracking
- Analytics dashboard

### CI/CD Integration

Vercel automatically integrates with GitHub:
- Auto-deploy on push to main branch
- Preview deployments for pull requests
- Rollback functionality

### Security Considerations

1. **Environment Variables**: Never expose secrets in frontend code
2. **API Keys**: Use backend proxy for external API calls
3. **HTTPS**: Automatically provided by Vercel
4. **Content Security Policy**: Configure headers as needed

### Multiple Environments

**Staging Environment:**
1. Create separate Vercel project
2. Use different environment variables
3. Connect to staging backend

**Environment Variables Template:**

```env
# Production
VITE_API_URL=https://splitzy-backend.onrender.com/api
VITE_SOCKET_URL=https://splitzy-backend.onrender.com

# Staging
VITE_API_URL=https://splitzy-backend-staging.onrender.com/api
VITE_SOCKET_URL=https://splitzy-backend-staging.onrender.com

# Development
VITE_API_URL=http://localhost:5050/api
VITE_SOCKET_URL=http://localhost:5050
```

### Post-Deployment Checklist

- [ ] App loads successfully
- [ ] All pages accessible
- [ ] API calls working
- [ ] Authentication flow functional
- [ ] Real-time features connected
- [ ] Responsive design working
- [ ] No console errors
- [ ] Performance acceptable
- [ ] SEO meta tags correct

---

**Note**: Always test thoroughly after deployment as some behaviors may differ between development and production environments.
