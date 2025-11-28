# Deploying to Vercel

## Prerequisites
1. **GitHub Repository** - Push your code to GitHub
2. **Neon PostgreSQL Database** - Create at console.neon.tech (free tier available)
3. **Vercel Account** - Sign up at vercel.com (free tier available)

## Step-by-Step Instructions

### 1. Create Neon Database
- Go to https://console.neon.tech
- Create a new project
- Create a database
- Copy your connection string (DATABASE_URL) - it looks like: `postgresql://user:password@host/dbname`

### 2. Generate Session Secret
Open terminal and run:
```bash
openssl rand -hex 32
```
Copy the output - you'll need this as SESSION_SECRET

### 3. Push to GitHub
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 4. Import Project into Vercel
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select "Import Git Repository"
4. Paste your GitHub repository URL or connect your GitHub account
5. Click "Import"

### 5. Configure Environment Variables
In Vercel project settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon PostgreSQL connection string |
| `SESSION_SECRET` | The random string from step 2 |
| `NODE_ENV` | `production` |

### 6. Deploy
- Vercel will automatically:
  - Run `npm run build`
  - Create optimized production bundle
  - Deploy your app
  
- Your app will be live at: `https://your-project.vercel.app`

## Troubleshooting

### If download happens instead of opening webpage:
1. Ensure `DATABASE_URL` is set correctly
2. Restart deployment in Vercel
3. Check Vercel logs: Dashboard → Project → Deployments → View Build Logs

### If you get database connection errors:
1. Verify DATABASE_URL is correct
2. Make sure Neon project is active
3. Test connection string locally first

### How to check logs on Vercel:
1. Go to your Vercel project dashboard
2. Click on the deployment
3. Go to "Logs" tab to see deployment logs
4. Go to "Functions" tab to see runtime logs

## Local Testing (Optional)
To test production build locally:
```bash
npm run build
NODE_ENV=production node dist/index.cjs
```
Visit http://localhost:5000 - should open website normally

## Success Indicators
✅ Website opens normally (not downloading)
✅ Can log in / create account
✅ Database queries work
✅ Chat works
✅ Can view community tab with online users
