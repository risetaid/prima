# PRIMA Bundle Size Optimization Guide

## Overview

This guide provides strategies and best practices for optimizing the bundle size of the PRIMA healthcare management system to ensure fast loading times and optimal user experience.

## Current Bundle Analysis

### Bundle Size Metrics (Estimated)
- **Main Bundle**: ~800KB (gzipped: ~250KB)
- **Vendor Libraries**: ~400KB (gzipped: ~120KB)
- **CSS Bundle**: ~50KB (gzipped: ~15KB)
- **Total Initial Load**: ~1.25MB (gzipped: ~385KB)

### Key Dependencies Impact
```
📦 Largest Dependencies:
├── next (280KB) - React framework
├── @clerk/nextjs (180KB) - Authentication
├── drizzle-orm (150KB) - Database ORM
├── @radix-ui/* (120KB) - UI components
├── tailwindcss (90KB) - Styling
├── tinymce (200KB) - Rich text editor
└── ioredis (80KB) - Redis client
```

## Optimization Strategies

### 1. Code Splitting & Dynamic Imports

#### Route-Based Code Splitting
```typescript
// Before: Static import
import HeavyComponent from '@/components/HeavyComponent'

// After: Dynamic import
const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false
})
```

#### Component-Level Splitting
```typescript
// Lazy load heavy components
const ComplianceChart = lazy(() => import('@/components/ComplianceChart'))
const PatientAnalytics = lazy(() => import('@/components/PatientAnalytics'))
```

### 2. Tree Shaking Optimization

#### Remove Unused Dependencies
```json
{
  "dependencies": {
    "lodash": "^4.17.21"  // Consider replacing with smaller alternatives
  },
  "devDependencies": {
    "@types/lodash": "^4.14.202"  // Remove if using alternatives
  }
}
```

#### Selective Imports
```typescript
// Before: Full library import
import { isEmpty, map, filter } from 'lodash'

// After: Selective imports
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'
import filter from 'lodash/filter'
```

### 3. Image Optimization

#### Next.js Image Component
```tsx
// Before: Regular img tag
<img src="/patient-photo.jpg" alt="Patient" />

// After: Optimized Image component
import Image from 'next/image'

<Image
  src="/patient-photo.jpg"
  alt="Patient"
  width={200}
  height={200}
  priority={false}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
/>
```

#### Image Formats & Compression
- Use WebP format for modern browsers
- Implement responsive images
- Compress images during build process
- Lazy load images below the fold

### 4. Library Optimization

#### TinyMCE Optimization
```typescript
// Dynamic import for TinyMCE
const Editor = dynamic(() => import('@tinymce/tinymce-react').then(mod => mod.Editor), {
  ssr: false,
  loading: () => <div>Loading editor...</div>
})

// Minimal configuration
const editorConfig = {
  plugins: ['lists', 'link'], // Only essential plugins
  toolbar: 'bold italic underline | bullist numlist | link',
  menubar: false,
  statusbar: false
}
```

#### Radix UI Optimization
```typescript
// Tree-shake unused components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@radix-ui/react-dialog'
```

### 5. Bundle Analysis & Monitoring

#### Webpack Bundle Analyzer
```bash
# Analyze bundle composition
npm run build:analyze

# Generate detailed report
npm run analyze-bundle
```

#### Performance Budget
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks.chunks = 'all'
    }
    return config
  }
}
```

### 6. Caching & Compression

#### Service Worker Caching
```typescript
// Implement service worker for static assets
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
```

#### HTTP Compression
```javascript
// next.config.js - Ensure compression is enabled
module.exports = {
  compress: true,
  experimental: {
    gzipSize: true
  }
}
```

### 7. Runtime Optimizations

#### React Optimization
```tsx
// Use React.memo for expensive components
const PatientCard = memo(({ patient, onUpdate }) => {
  return (
    <div className="patient-card">
      <h3>{patient.name}</h3>
      <ComplianceChart data={patient.complianceData} />
    </div>
  )
})

// Implement proper key props for lists
{patients.map(patient => (
  <PatientCard
    key={patient.id}
    patient={patient}
    onUpdate={handleUpdate}
  />
))}
```

#### State Management Optimization
```typescript
// Use selective state updates
const [patients, setPatients] = useState([])
const [loading, setLoading] = useState(false)

// Instead of updating entire state
const updatePatient = (patientId, updates) => {
  setPatients(prev =>
    prev.map(patient =>
      patient.id === patientId
        ? { ...patient, ...updates }
        : patient
    )
  )
}
```

## Implementation Roadmap

### Phase 1: Quick Wins (Immediate Impact)
1. ✅ Implement dynamic imports for heavy components
2. ✅ Replace img tags with Next.js Image component
3. ✅ Optimize TinyMCE configuration
4. ✅ Enable webpack bundle analyzer

### Phase 2: Medium-term Optimizations
1. ⏳ Implement code splitting for routes
2. ⏳ Optimize Radix UI imports
3. ⏳ Add service worker caching
4. ⏳ Implement lazy loading for images

### Phase 3: Advanced Optimizations
1. ⏳ Bundle splitting by feature
2. ⏳ Implement virtual scrolling for large lists
3. ⏳ Optimize font loading
4. ⏳ Implement progressive loading

## Monitoring & Metrics

### Key Performance Indicators
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Bundle Size**: < 500KB gzipped

### Monitoring Tools
```bash
# Lighthouse CI
npm install -g lighthouse
lighthouse https://your-app.com --output json --output-path ./report.json

# Web Vitals monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getFCP(console.log)
getLCP(console.log)
getTTFB(console.log)
```

## Best Practices

### Development Guidelines
1. **Always use dynamic imports** for components > 50KB
2. **Implement lazy loading** for below-the-fold content
3. **Use tree-shakable imports** whenever possible
4. **Monitor bundle size** in CI/CD pipeline
5. **Optimize images** during build process

### Performance Budget
```javascript
// .github/workflows/ci.yml
- name: Bundle size check
  uses: preactjs/compressed-size-action@v2
  with:
    pattern: 'dist/**/*.{js,css,html}'
    maximum-size: '500KB'
```

### CDN & Asset Optimization
1. **Use CDN** for static assets
2. **Implement proper caching headers**
3. **Optimize font loading** with font-display: swap
4. **Preload critical resources**
5. **Use resource hints** for performance

## Troubleshooting

### Common Issues & Solutions

#### Large Bundle Size
```bash
# Identify large dependencies
npm run analyze-bundle

# Check for unused dependencies
npx depcheck

# Analyze duplicate dependencies
npm ls --depth=0
```

#### Slow Loading Times
```bash
# Check network waterfall
# Use Chrome DevTools Network tab

# Implement critical CSS
# Use above-the-fold optimization
```

#### Memory Issues
```bash
# Monitor memory usage
# Implement proper cleanup
# Use virtualization for large lists
```

## Conclusion

Bundle size optimization is an ongoing process that requires continuous monitoring and improvement. By implementing the strategies outlined in this guide, the PRIMA system can achieve optimal loading performance while maintaining rich functionality for healthcare professionals.

### Quick Start Checklist
- [ ] Enable bundle analyzer
- [ ] Implement dynamic imports
- [ ] Optimize images
- [ ] Configure compression
- [ ] Set up performance monitoring
- [ ] Establish performance budgets

---

*Regular bundle analysis and optimization should be part of the development workflow to maintain optimal performance as the application grows.*