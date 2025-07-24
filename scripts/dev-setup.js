#!/usr/bin/env node

/**
 * Development Setup Script
 * Helps with initial project setup and development environment configuration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up AnimationStudio development environment...\n');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
  console.error('❌ Node.js version 16 or higher is required');
  console.error(`   Current version: ${nodeVersion}`);
  process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Check if package.json exists
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Create assets directory if it doesn't exist
const assetsDir = path.join(process.cwd(), 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log('✅ Created assets directory');
}

// Create sample assets directory structure
const assetDirs = ['characters', 'backgrounds', 'props', 'audio'];
assetDirs.forEach(dir => {
  const dirPath = path.join(assetsDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    
    // Create a README file in each directory
    const readmeContent = `# ${dir.charAt(0).toUpperCase() + dir.slice(1)}
    
Place your ${dir} assets in this directory.

Supported formats:
- Images: JPEG, PNG, GIF, WebP, SVG
- Audio: MP3, WAV, OGG (for audio directory)

The assets will be automatically detected and available in the AnimationStudio interface.
`;
    
    fs.writeFileSync(path.join(dirPath, 'README.md'), readmeContent);
  }
});

console.log('✅ Created asset directory structure');

// Check for Git repository
if (!fs.existsSync('.git')) {
  console.log('\n📝 Initializing Git repository...');
  try {
    execSync('git init', { stdio: 'inherit' });
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "Initial commit: AnimationStudio setup"', { stdio: 'inherit' });
    console.log('✅ Git repository initialized');
  } catch (error) {
    console.log('⚠️  Could not initialize Git repository (this is optional)');
  }
}

// Create VS Code workspace settings
const vscodeDir = path.join(process.cwd(), '.vscode');
const settingsFile = path.join(vscodeDir, 'settings.json');

if (!fs.existsSync(settingsFile)) {
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir);
  }
  
  const vscodeSettings = {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "files.associations": {
      "*.js": "javascript"
    },
    "emmet.includeLanguages": {
      "javascript": "javascriptreact"
    },
    "javascript.suggest.autoImports": true,
    "typescript.suggest.autoImports": true
  };
  
  fs.writeFileSync(settingsFile, JSON.stringify(vscodeSettings, null, 2));
  console.log('✅ Created VS Code workspace settings');
}

// Create recommended VS Code extensions
const extensionsFile = path.join(vscodeDir, 'extensions.json');
if (!fs.existsSync(extensionsFile)) {
  const recommendedExtensions = {
    "recommendations": [
      "esbenp.prettier-vscode",
      "dbaeumer.vscode-eslint",
      "bradlc.vscode-tailwindcss",
      "christian-kohler.path-intellisense",
      "zignd.html-css-class-completion",
      "formulahendry.auto-rename-tag",
      "ms-vscode.vscode-json"
    ]
  };
  
  fs.writeFileSync(extensionsFile, JSON.stringify(recommendedExtensions, null, 2));
  console.log('✅ Created VS Code extensions recommendations');
}

console.log('\n🎉 Development environment setup complete!');
console.log('\n📋 Next steps:');
console.log('   1. Run "npm run dev" to start the development server');
console.log('   2. Open http://localhost:3000 in your browser');
console.log('   3. Start creating animations!');
console.log('\n💡 Tips:');
console.log('   - Use "npm run lint" to check code quality');
console.log('   - Use "npm run format" to format your code');
console.log('   - Add your assets to the assets/ directory');
console.log('   - Check the README.md for detailed usage instructions');

console.log('\n🔧 Development tools available:');
console.log('   - Vite for fast development and building');
console.log('   - ESLint for code linting');
console.log('   - Prettier for code formatting');
console.log('   - Hot module replacement for instant updates');