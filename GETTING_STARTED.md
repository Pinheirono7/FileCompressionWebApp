# AnimationStudio - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Prerequisites
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **npm 8+** (comes with Node.js)
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
# Clone or download the project
git clone <repository-url>
cd animation-studio

# Install dependencies
npm install

# Start development server
npm run dev
```

**That's it!** The application will automatically open in your browser at `http://localhost:3000`

---

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production version |
| `npm run preview` | Preview production build |
| `npm run serve` | Serve using http-server (alternative) |
| `npm run lint` | Check JavaScript code quality |
| `npm run format` | Format code with Prettier |
| `npm run setup` | Run full development environment setup |

---

## 🎯 First Steps

### 1. Launch the App
```bash
npm run dev
```

### 2. Upload Your First Asset
- Click **"Upload Assets"** in the left panel
- Select image files (PNG, JPEG, GIF, WebP, SVG)
- Assets will appear in the asset panel

### 3. Create Your First Animation
1. **Drag an asset** from the panel to the canvas
2. **Move the timeline** to a different time (e.g., 3 seconds)
3. **Change the object's position** by dragging it
4. **Click "Add Keyframe"** to save the animation state
5. **Press the Play button** to see your animation!

### 4. Export Your Animation
- **WebM Video**: Click "Export Video" (works in Chrome/Firefox)
- **Save Project**: Click "Save Project" to continue later

---

## 🛠️ Development Workflow

### File Structure
```
animation-studio/
├── index.html          # Main application
├── js/                 # JavaScript modules
│   ├── core/          # Core animation engine
│   ├── ui/            # User interface components
│   └── audio/         # Audio synchronization
├── styles/            # CSS stylesheets
├── assets/            # Your animation assets
└── package.json       # Project configuration
```

### Hot Reload Development
- Files are automatically watched for changes
- Save any file to see instant updates in the browser
- No manual refresh needed!

### Code Quality
```bash
# Check code for issues
npm run lint

# Auto-format code
npm run format
```

---

## 🎨 Tips for Best Experience

### Asset Organization
```
assets/
├── characters/    # Character images
├── backgrounds/   # Background images
├── props/         # Props and objects
└── audio/         # Audio files
```

### Performance Tips
- Use optimized images (< 2MB each)
- Keep canvas size reasonable (1920x1080 max)
- Limit to 20-30 objects for smooth playback

### Keyboard Shortcuts
- **Spacebar**: Play/Pause
- **Ctrl+S**: Save project
- **Ctrl+O**: Load project
- **Delete**: Delete selected objects
- **Ctrl+D**: Duplicate objects

---

## 🐛 Troubleshooting

### Development Server Won't Start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Port Already in Use
```bash
# Start on different port
npm run dev -- --port 3001
```

### Browser Compatibility Issues
- **WebM Export**: Chrome, Firefox, Edge (not Safari)
- **Canvas API**: All modern browsers
- **File Upload**: All modern browsers

### Build Issues
```bash
# Clean build cache
npm run clean
npm run build
```

---

## 📚 Next Steps

1. **Read the full README.md** for detailed features
2. **Explore the codebase** in the `js/` directory
3. **Customize the interface** by editing CSS files
4. **Add new features** using the modular architecture
5. **Share your animations** by exporting videos

---

## 💡 Pro Tips

- **Multiple Keyframes**: Set keyframes at different times for complex animations
- **Easing Functions**: Change interpolation types for smooth movements
- **Asset Management**: Use categories and tags to organize large projects
- **Auto-save**: Projects are automatically saved every 5 minutes
- **Drag & Drop**: Drag assets directly onto the canvas for quick placement

---

## 🤝 Getting Help

- Check the browser console for error messages
- Use browser developer tools for debugging
- Ensure all dependencies are installed with `npm install`
- Verify Node.js version with `node --version` (should be 16+)

**Happy Animating! 🎬**