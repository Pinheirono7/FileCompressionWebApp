import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  X, 
  Archive,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const FileCompressionApp = () => {
  const [files, setFiles] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState(null);

  // Accepted file types
  const acceptedFileTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/pdf': ['.pdf']
  };

  // Handle file drop and selection
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Process accepted files
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'ready'
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      console.log('Rejected files:', rejectedFiles);
      // You could show a toast notification here
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB limit
  });

  // Remove file from list
  const removeFile = (fileId) => {
    setFiles(prev => {
      const updatedFiles = prev.filter(f => f.id !== fileId);
      // Clean up preview URLs
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updatedFiles;
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image className="w-6 h-6 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="w-6 h-6 text-red-500" />;
    return <File className="w-6 h-6 text-gray-500" />;
  };

  // Handle file compression (placeholder for future implementation)
  const handleCompress = async () => {
    if (files.length === 0) return;

    setIsCompressing(true);
    setCompressionStatus(null);

    try {
      // Simulate compression process
      // This is where you would integrate actual compression logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update file statuses
      setFiles(prev => prev.map(file => ({
        ...file,
        status: 'compressed'
      })));

      setCompressionStatus('success');
    } catch (error) {
      console.error('Compression failed:', error);
      setCompressionStatus('error');
    } finally {
      setIsCompressing(false);
    }
  };

  // Clear all files
  const clearFiles = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setCompressionStatus(null);
  };

  // Dropzone styling based on state
  const getDropzoneClassName = () => {
    let baseClasses = "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer";
    
    if (isDragAccept) {
      return `${baseClasses} border-green-400 bg-green-50`;
    }
    if (isDragReject) {
      return `${baseClasses} border-red-400 bg-red-50`;
    }
    if (isDragActive) {
      return `${baseClasses} border-primary-400 bg-primary-50`;
    }
    return `${baseClasses} border-gray-300 hover:border-primary-400 hover:bg-gray-50`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            File Compression Tool
          </h1>
          <p className="text-lg text-gray-600">
            Compress your JPEG, PNG, and PDF files with ease
          </p>
        </div>

        {/* Dropzone */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div {...getRootProps()} className={getDropzoneClassName()}>
            <input {...getInputProps()} />
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            
            {isDragActive ? (
              <div>
                <p className="text-xl font-semibold text-primary-600 mb-2">
                  Drop your files here
                </p>
                <p className="text-gray-500">
                  We'll handle the rest
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-gray-500 mb-4">
                  Supports JPEG, PNG, and PDF files up to 10MB each
                </p>
                <button className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors">
                  Browse Files
                </button>
              </div>
            )}
          </div>
        </div>

        {/* File Preview Grid */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                Files Ready for Compression ({files.length})
              </h2>
              <button
                onClick={clearFiles}
                className="text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.map(file => (
                <div key={file.id} className="file-preview-card animate-fade-in">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(file.type)}
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {file.name}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Image Preview */}
                  {file.preview && (
                    <div className="mb-3">
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  
                  {/* File Info */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Size:</span>
                      <span className="font-medium">{formatFileSize(file.size)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium uppercase">
                        {file.type.split('/')[1] || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className={`font-medium flex items-center space-x-1 ${
                        file.status === 'compressed' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {file.status === 'compressed' ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Compressed</span>
                          </>
                        ) : (
                          <span>Ready</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compression Status */}
        {compressionStatus && (
          <div className={`mb-8 p-4 rounded-lg flex items-center space-x-3 ${
            compressionStatus === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {compressionStatus === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">
              {compressionStatus === 'success' 
                ? 'Files compressed successfully!' 
                : 'Compression failed. Please try again.'}
            </span>
          </div>
        )}

        {/* Compress Button */}
        {files.length > 0 && (
          <div className="text-center">
            <button
              onClick={handleCompress}
              disabled={isCompressing || files.length === 0}
              className="compress-button flex items-center space-x-3 mx-auto"
            >
              <Archive className={`w-5 h-5 ${isCompressing ? 'animate-spin' : ''}`} />
              <span>
                {isCompressing ? 'Compressing Files...' : `Compress ${files.length} File${files.length > 1 ? 's' : ''}`}
              </span>
            </button>
          </div>
        )}

        {/* Instructions */}
        {files.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              How to use this tool
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="text-center">
                <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">1. Upload Files</h4>
                <p className="text-gray-600 text-sm">
                  Drag and drop or click to select JPEG, PNG, or PDF files
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Image className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">2. Preview Files</h4>
                <p className="text-gray-600 text-sm">
                  Review your files with thumbnails and file information
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Archive className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">3. Compress</h4>
                <p className="text-gray-600 text-sm">
                  Click compress to reduce file sizes while maintaining quality
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileCompressionApp;