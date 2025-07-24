module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  plugins: [
    'import'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Error prevention
    'no-console': 'warn',
    'no-debugger': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    
    // Code style
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    
    // Import/Export
    'import/order': ['error', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'never'
    }],
    
    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // ES6+
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error'
  },
  globals: {
    // Canvas API
    'CanvasRenderingContext2D': 'readonly',
    'HTMLCanvasElement': 'readonly',
    'ImageData': 'readonly',
    'Path2D': 'readonly',
    
    // Media APIs
    'MediaRecorder': 'readonly',
    'AudioContext': 'readonly',
    'webkitAudioContext': 'readonly',
    
    // File APIs
    'FileReader': 'readonly',
    'Blob': 'readonly',
    'URL': 'readonly',
    
    // Animation frame
    'requestAnimationFrame': 'readonly',
    'cancelAnimationFrame': 'readonly',
    
    // ResizeObserver
    'ResizeObserver': 'readonly',
    
    // Custom globals
    'CanvasEngine': 'readonly',
    'Timeline': 'readonly',
    'PlaybackEngine': 'readonly',
    'AssetLoader': 'readonly',
    'ProjectExporter': 'readonly',
    'AnimationStudio': 'readonly'
  }
};