# Version Management in P-Chart Web

This document explains how P-Chart Web manages and displays version information using **package.json versioning**.

## 🔧 **Implementation Overview**

Version information is managed through the standard `package.json` file:

1. **Version Source**: Version is read from `package.json`
2. **Display**: Version is shown in the footer and about page
3. **Offline Ready**: Works in offline production environments
4. **Simple Management**: Update version by modifying `package.json`

## 📋 **Current Version Display**

The application displays:
- **Version Number**: Semantic version from package.json (e.g., v1.2.3)
- **Application Name**: P-Chart System
- **Simple Format**: Clean, readable version display

## 🛠️ **Implementation Details**

### Version Display Locations

#### 1. **Application Footer** (`src/components/layout/Footer.tsx`)

```tsx
// Import package version
const packageInfo = require("../../../package.json");

function Footer() {
  return (
    <footer>
      <span className="text-xs text-muted-foreground/70">
        Version: v{packageInfo.version}
      </span>
    </footer>
  );
}
```

#### 2. **About Page** (`src/pages/about.tsx`)

```tsx
const packageInfo = require("../../package.json");

const AboutPage: NextPage = () => {
  const version = packageInfo.version;
  const releaseDate = "May 2024";
  
  return (
    <div>
      <CardDescription>Version {version} | Released {releaseDate}</CardDescription>
    </div>
  );
}
```

### Version Management

#### Current Version Format

The `package.json` follows semantic versioning:

```json
{
  "name": "p_chart_web",
  "version": "0.1.0",
  "private": true
}
```

#### Updating Versions

To update the application version:

1. **Edit package.json**:
   ```json
   {
     "version": "0.2.0"
   }
   ```

2. **Rebuild the application**:
   ```bash
   npm run build
   ```

3. **Version will be updated** in footer and about page automatically

## 🚀 **Semantic Versioning Guidelines**

Follow [Semantic Versioning](https://semver.org/) format: `MAJOR.MINOR.PATCH`

### Version Increments

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes, incompatible API changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

### Examples

```json
{
  "version": "1.0.0"    // Initial release
}
```

```json
{
  "version": "1.1.0"    // Added new dashboard features
}
```

```json
{
  "version": "1.1.1"    // Fixed authentication bug
}
```

```json
{
  "version": "2.0.0"    // Major UI redesign, breaking changes
}
```

## 📝 **Development Workflow**

### For Developers

1. **Before Release**:
   - Update version in `package.json`
   - Test the application
   - Build for production

2. **Version Update Process**:
   ```bash
   # Update version in package.json manually or using npm
   npm version patch  # for bug fixes
   npm version minor  # for new features  
   npm version major  # for breaking changes
   
   # Build the application
   npm run build
   ```

3. **Deploy**: The new version will be automatically displayed

### For Production Deployment

1. **Offline Environments**: ✅ Works perfectly
2. **No External Dependencies**: ✅ Self-contained
3. **Consistent Display**: ✅ Always shows correct version
4. **Simple Updates**: ✅ Just update package.json

## 🚀 **Where Version Info Appears**

### 1. **Application Footer**
- Displays: `Version: v0.1.0`
- Location: Bottom of every page
- Format: Simple, clean display

### 2. **About Page**
- Displays version and release information
- Can include additional metadata
- More detailed version information

### 3. **Health Check API** (Optional)
```javascript
// GET /api/health
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🔧 **Advanced Configuration**

### Dynamic Version Import

For consistency across components, create a version utility:

```typescript
// src/lib/version.ts
import packageInfo from '../../package.json';

export const getVersion = () => packageInfo.version;
export const getFullVersionInfo = () => ({
  version: packageInfo.version,
  name: packageInfo.name,
  displayVersion: `v${packageInfo.version}`
});
```

### Environment-Specific Versions

For different environments:

```typescript
// src/lib/version.ts
export const getVersionDisplay = () => {
  const version = packageInfo.version;
  const env = process.env.NODE_ENV;
  
  if (env === 'development') {
    return `v${version}-dev`;
  }
  
  return `v${version}`;
};
```

## 📊 **Version History Tracking**

### Recommended Approach

Keep a `CHANGELOG.md` file to track version changes:

```markdown
# Changelog

## v0.2.0 - 2024-02-01
### Added
- New dashboard features
- Enhanced reporting

### Fixed
- Authentication issues
- Performance improvements

## v0.1.0 - 2024-01-15
### Added
- Initial release
- Basic functionality
```

---

**Implementation**: Package.json versioning  
**Storage**: Static version in package.json  
**Display**: Footer, about page, optional API endpoints  
**Environment**: Offline-ready, no external dependencies
