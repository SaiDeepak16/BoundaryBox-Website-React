# BoundaryBox - Vercel Deployment Guide

## 📋 Prerequisites

Before deploying to Vercel, ensure you have:

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Supabase Project**: Your Supabase project should be set up and running

## 🚀 Deployment Steps

### 1. Environment Variables Setup

In your Vercel dashboard, add these environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tjqjilftzgexsqlsaejo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcWppbGZ0emdleHNxbHNhZWpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNDEwNjEsImV4cCI6MjA2NTgxNzA2MX0.Ej4rNPZn6Y0-2QOhRVZJZJQX8X8X8X8X8X8X8X8X8X8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcWppbGZ0emdleHNxbHNhZWpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDI0MTA2MSwiZXhwIjoyMDY1ODE3MDYxfQ.MLYdnPhMOhxKbzcY4psBUkxFp84_W84XPSgg_COPRb8
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: GitHub Integration
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables
5. Deploy

### 3. Domain Configuration

After deployment:
1. **Custom Domain**: Add your custom domain in Vercel dashboard
2. **SSL**: Vercel automatically provides SSL certificates
3. **DNS**: Update your DNS records to point to Vercel

## 🔧 Build Configuration

The project includes:
- `vercel.json` - Vercel deployment configuration
- `next.config.js` - Next.js configuration optimized for Vercel
- Environment variable handling

## 📊 Performance Optimization

- **Static Generation**: Pages are statically generated where possible
- **Image Optimization**: Next.js Image component with Vercel optimization
- **Edge Functions**: API routes run on Vercel Edge Network
- **Caching**: Automatic caching for better performance

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env.local` to version control
2. **API Keys**: Use Vercel environment variables for sensitive data
3. **CORS**: Configure Supabase CORS settings for your domain
4. **RLS**: Ensure Row Level Security is enabled in Supabase

## 🐛 Troubleshooting

### Common Issues:

1. **Build Errors**: Check build logs in Vercel dashboard
2. **Environment Variables**: Ensure all required env vars are set
3. **Supabase Connection**: Verify Supabase URL and keys
4. **CORS Issues**: Add your Vercel domain to Supabase allowed origins

### Build Commands:
```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm run start
```

## 📱 Post-Deployment Checklist

- [ ] Test all authentication flows
- [ ] Verify booking system functionality
- [ ] Check admin dashboard access
- [ ] Test mobile responsiveness
- [ ] Verify email notifications (if configured)
- [ ] Test payment integration (if added)

## 🔄 Continuous Deployment

Vercel automatically deploys:
- **Main Branch**: Production deployments
- **Feature Branches**: Preview deployments
- **Pull Requests**: Automatic preview links

## 📞 Support

For deployment issues:
1. Check Vercel documentation
2. Review build logs
3. Verify environment variables
4. Test locally first

---

**Note**: Replace the example environment variables with your actual Supabase credentials.
