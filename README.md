# File Compression Web App

A modern React-based file compression web application with drag-and-drop functionality, built with Tailwind CSS and react-dropzone.

## Features

- **Drag & Drop Interface**: Intuitive file upload using react-dropzone
- **Multiple File Support**: Upload multiple JPEG, PNG, and PDF files simultaneously
- **Image Previews**: Thumbnail previews for image files
- **File Information**: Display file size, type, and status
- **Clean UI**: Modern, minimal design with Tailwind CSS
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **File Validation**: Automatic validation of file types and sizes (10MB limit)
- **Ready for Integration**: Structured code for easy addition of compression logic

## Supported File Types

- **Images**: JPEG (.jpg, .jpeg), PNG (.png)
- **Documents**: PDF (.pdf)
- **File Size Limit**: 10MB per file

## Technology Stack

- **React 18**: Modern functional components with hooks
- **react-dropzone**: Drag and drop file uploads
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful, customizable icons
- **Webpack**: Module bundler with development server

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd file-compression-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm start` - Start development server
- `npm run build` - Build for production

## Project Structure

```
file-compression-app/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/
│   │   └── FileCompressionApp.jsx  # Main component
│   ├── index.css               # Global styles with Tailwind
│   └── index.js                # Application entry point
├── package.json                # Dependencies and scripts
├── webpack.config.js           # Webpack configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── README.md                   # Project documentation
```

## Component Features

### FileCompressionApp Component

The main component includes:

- **File Upload**: Drag-and-drop zone with click-to-upload fallback
- **File Preview Grid**: Responsive grid showing file thumbnails and info
- **File Management**: Add/remove files with visual feedback
- **Compression Status**: Success/error states with loading indicators
- **Responsive Design**: Mobile-first approach with Tailwind classes

### Key Hooks and State Management

- `useState` for files, compression status, and loading states
- `useCallback` for optimized event handlers
- `useDropzone` for file upload functionality

## Customization

### Adding Compression Logic

The `handleCompress` function in `FileCompressionApp.jsx` is currently a placeholder. To integrate actual compression:

1. Install compression libraries (e.g., `browser-image-compression` for images)
2. Replace the placeholder logic in `handleCompress`
3. Add progress tracking and real compression status updates

### Styling Customization

- Modify `tailwind.config.js` for custom colors and animations
- Update CSS classes in the component for different styling
- Add custom CSS in `src/index.css` for additional styles

### File Type Support

To add more file types:

1. Update `acceptedFileTypes` object in the component
2. Add corresponding icons in `getFileIcon` function
3. Update file validation logic as needed

## Browser Support

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers on iOS and Android

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Future Enhancements

- [ ] Actual file compression implementation
- [ ] Download compressed files
- [ ] Compression quality settings
- [ ] Progress bars for individual files
- [ ] File size comparison (before/after)
- [ ] Batch operations
- [ ] Cloud storage integration
- [ ] File format conversion