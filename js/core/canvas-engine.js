/**
 * Canvas Engine - Core rendering and object management
 * Handles canvas rendering, object management, and user interactions
 */

class CanvasEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.objects = [];
        this.selectedObjects = [];
        this.currentTool = 'select';
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        // Interaction state
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.dragTargetObject = null;
        
        // Grid and guides
        this.showGrid = true;
        this.snapToGrid = false;
        this.gridSize = 20;
        
        this.setupEventListeners();
        this.render();
        
        console.log('✅ Canvas Engine initialized');
    }

    // Event Listeners
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
        // Keyboard events (when canvas is focused)
        this.canvas.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Make canvas focusable
        this.canvas.tabIndex = 0;
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Mouse Event Handlers
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        const canvasPos = this.screenToCanvas(pos.x, pos.y);
        
        this.isDragging = true;
        this.dragStartPos = canvasPos;
        
        // Find object under mouse
        const objectUnderMouse = this.getObjectAtPosition(canvasPos.x, canvasPos.y);
        
        if (this.currentTool === 'select') {
            if (objectUnderMouse) {
                // Select object if not already selected
                if (!this.selectedObjects.includes(objectUnderMouse)) {
                    if (!e.ctrlKey && !e.metaKey) {
                        this.clearSelection();
                    }
                    this.selectObject(objectUnderMouse.id);
                }
                this.dragTargetObject = objectUnderMouse;
            } else {
                // Click on empty space - clear selection
                if (!e.ctrlKey && !e.metaKey) {
                    this.clearSelection();
                }
            }
        }
        
        this.render();
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        const canvasPos = this.screenToCanvas(pos.x, pos.y);
        
        if (this.isDragging && this.dragTargetObject && this.currentTool === 'select') {
            // Calculate drag delta
            const deltaX = canvasPos.x - this.dragStartPos.x;
            const deltaY = canvasPos.y - this.dragStartPos.y;
            
            // Move selected objects
            this.selectedObjects.forEach(obj => {
                obj.x += deltaX;
                obj.y += deltaY;
            });
            
            this.dragStartPos = canvasPos;
            this.render();
            
            // Emit object updated event
            this.canvas.dispatchEvent(new CustomEvent('objectUpdated', {
                detail: { objects: this.selectedObjects }
            }));
        }
        
        // Update cursor based on what's under mouse
        this.updateCursor(canvasPos);
    }

    handleMouseUp(e) {
        if (this.isDragging && this.dragTargetObject) {
            // Emit movement complete event
            this.canvas.dispatchEvent(new CustomEvent('objectMoved', {
                detail: { objects: this.selectedObjects }
            }));
        }
        
        this.isDragging = false;
        this.dragTargetObject = null;
    }

    handleClick(e) {
        // Click handling is done in mousedown to prevent conflicts
    }

    handleDoubleClick(e) {
        const pos = this.getMousePos(e);
        const canvasPos = this.screenToCanvas(pos.x, pos.y);
        const objectUnderMouse = this.getObjectAtPosition(canvasPos.x, canvasPos.y);
        
        if (objectUnderMouse && objectUnderMouse.type === 'text') {
            // Enter text editing mode
            this.editTextObject(objectUnderMouse);
        }
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                this.deleteSelectedObjects();
                break;
            case 'Escape':
                this.clearSelection();
                break;
            case 'a':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.selectAllObjects();
                }
                break;
            case 'd':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.duplicateSelectedObjects();
                }
                break;
        }
    }

    // Coordinate Conversion
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    screenToCanvas(x, y) {
        return {
            x: (x - this.panX) / this.zoom,
            y: (y - this.panY) / this.zoom
        };
    }

    canvasToScreen(x, y) {
        return {
            x: x * this.zoom + this.panX,
            y: y * this.zoom + this.panY
        };
    }

    // Object Management
    createObject(type, x, y, properties = {}) {
        const obj = {
            id: this.generateId(),
            type: type,
            x: x,
            y: y,
            width: properties.width || 100,
            height: properties.height || 100,
            rotation: properties.rotation || 0,
            scaleX: properties.scaleX || 1,
            scaleY: properties.scaleY || 1,
            opacity: properties.opacity !== undefined ? properties.opacity : 1,
            visible: properties.visible !== undefined ? properties.visible : true,
            locked: properties.locked || false,
            name: properties.name || `${type}_${this.objects.length + 1}`,
            ...properties
        };
        
        this.objects.push(obj);
        this.selectObject(obj.id);
        
        // Emit object created event
        this.canvas.dispatchEvent(new CustomEvent('objectCreated', {
            detail: { object: obj }
        }));
        
        this.render();
        return obj;
    }

    addImageObject(src, x, y) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const obj = this.createObject('image', x, y, {
                    src: src,
                    image: img,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    originalWidth: img.naturalWidth,
                    originalHeight: img.naturalHeight
                });
                resolve(obj);
            };
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            img.src = src;
        });
    }

    addTextObject(text, x, y) {
        const obj = this.createObject('text', x, y, {
            text: text || 'Text',
            fontSize: 24,
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            textAlign: 'left',
            fontWeight: 'normal',
            fontStyle: 'normal'
        });
        
        // Measure text to set appropriate width/height
        this.updateTextMetrics(obj);
        return obj;
    }

    addShapeObject(shape, x, y) {
        const obj = this.createObject('shape', x, y, {
            shape: shape || 'rectangle',
            fill: '#4CAF50',
            stroke: '#333333',
            strokeWidth: 2,
            radius: 50 // for circles
        });
        return obj;
    }

    updateTextMetrics(textObj) {
        if (textObj.type !== 'text') return;
        
        this.ctx.save();
        this.ctx.font = `${textObj.fontWeight} ${textObj.fontStyle} ${textObj.fontSize}px ${textObj.fontFamily}`;
        const metrics = this.ctx.measureText(textObj.text);
        textObj.width = metrics.width;
        textObj.height = textObj.fontSize * 1.2; // Approximate height
        this.ctx.restore();
    }

    getObject(id) {
        return this.objects.find(obj => obj.id === id);
    }

    updateObject(id, properties) {
        const obj = this.getObject(id);
        if (obj) {
            Object.assign(obj, properties);
            
            // Update text metrics if text properties changed
            if (obj.type === 'text' && ('text' in properties || 'fontSize' in properties)) {
                this.updateTextMetrics(obj);
            }
            
            this.render();
            
            // Emit object updated event
            this.canvas.dispatchEvent(new CustomEvent('objectUpdated', {
                detail: { object: obj }
            }));
        }
    }

    deleteObject(id) {
        const index = this.objects.findIndex(obj => obj.id === id);
        if (index !== -1) {
            const obj = this.objects[index];
            this.objects.splice(index, 1);
            
            // Remove from selection if selected
            const selectedIndex = this.selectedObjects.indexOf(obj);
            if (selectedIndex !== -1) {
                this.selectedObjects.splice(selectedIndex, 1);
            }
            
            this.render();
            
            // Emit object deleted event
            this.canvas.dispatchEvent(new CustomEvent('objectDeleted', {
                detail: { object: obj }
            }));
        }
    }

    duplicateSelectedObjects() {
        const duplicates = [];
        
        this.selectedObjects.forEach(obj => {
            const duplicate = {
                ...obj,
                id: this.generateId(),
                x: obj.x + 20,
                y: obj.y + 20,
                name: obj.name + '_copy'
            };
            
            this.objects.push(duplicate);
            duplicates.push(duplicate);
        });
        
        if (duplicates.length > 0) {
            this.clearSelection();
            duplicates.forEach(obj => this.selectObject(obj.id));
            this.render();
        }
    }

    deleteSelectedObjects() {
        const idsToDelete = this.selectedObjects.map(obj => obj.id);
        idsToDelete.forEach(id => this.deleteObject(id));
    }

    // Selection Management
    selectObject(id) {
        const obj = this.getObject(id);
        if (obj && !this.selectedObjects.includes(obj)) {
            this.selectedObjects.push(obj);
            this.emitSelectionChanged();
            this.render();
        }
    }

    deselectObject(id) {
        const obj = this.getObject(id);
        if (obj) {
            const index = this.selectedObjects.indexOf(obj);
            if (index !== -1) {
                this.selectedObjects.splice(index, 1);
                this.emitSelectionChanged();
                this.render();
            }
        }
    }

    clearSelection() {
        if (this.selectedObjects.length > 0) {
            this.selectedObjects = [];
            this.emitSelectionChanged();
            this.render();
        }
    }

    selectAllObjects() {
        this.selectedObjects = [...this.objects];
        this.emitSelectionChanged();
        this.render();
    }

    emitSelectionChanged() {
        this.canvas.dispatchEvent(new CustomEvent('selectionChanged', {
            detail: { selectedObjects: this.selectedObjects }
        }));
    }

    // Collision Detection
    getObjectAtPosition(x, y) {
        // Check objects in reverse order (top to bottom)
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (this.isPointInObject(x, y, obj)) {
                return obj;
            }
        }
        return null;
    }

    isPointInObject(x, y, obj) {
        if (!obj.visible) return false;
        
        // Simple bounding box collision for now
        const left = obj.x;
        const right = obj.x + obj.width * obj.scaleX;
        const top = obj.y;
        const bottom = obj.y + obj.height * obj.scaleY;
        
        return x >= left && x <= right && y >= top && y <= bottom;
    }

    // Rendering
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply zoom and pan
        this.ctx.save();
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(this.panX / this.zoom, this.panY / this.zoom);
        
        // Draw grid if enabled
        if (this.showGrid) {
            this.drawGrid();
        }
        
        // Draw objects
        this.objects.forEach(obj => {
            if (obj.visible) {
                this.drawObject(obj);
            }
        });
        
        // Draw selection handles
        this.selectedObjects.forEach(obj => {
            this.drawSelectionHandles(obj);
        });
        
        this.ctx.restore();
    }

    drawGrid() {
        const startX = Math.floor(-this.panX / this.zoom / this.gridSize) * this.gridSize;
        const startY = Math.floor(-this.panY / this.zoom / this.gridSize) * this.gridSize;
        const endX = startX + (this.canvas.width / this.zoom) + this.gridSize;
        const endY = startY + (this.canvas.height / this.zoom) + this.gridSize;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 0.5;
        this.ctx.setLineDash([2, 2]);
        
        // Vertical lines
        for (let x = startX; x <= endX; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawObject(obj) {
        this.ctx.save();
        
        // Apply transformations
        this.ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
        this.ctx.rotate(obj.rotation * Math.PI / 180);
        this.ctx.scale(obj.scaleX, obj.scaleY);
        this.ctx.globalAlpha = obj.opacity;
        
        // Draw based on object type
        switch (obj.type) {
            case 'image':
                this.drawImageObject(obj);
                break;
            case 'text':
                this.drawTextObject(obj);
                break;
            case 'shape':
                this.drawShapeObject(obj);
                break;
        }
        
        this.ctx.restore();
    }

    drawImageObject(obj) {
        if (obj.image && obj.image.complete) {
            this.ctx.drawImage(
                obj.image,
                -obj.width / 2,
                -obj.height / 2,
                obj.width,
                obj.height
            );
        } else {
            // Draw placeholder
            this.ctx.fillStyle = '#cccccc';
            this.ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
            this.ctx.fillStyle = '#666666';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Loading...', 0, 0);
        }
    }

    drawTextObject(obj) {
        this.ctx.font = `${obj.fontWeight} ${obj.fontStyle} ${obj.fontSize}px ${obj.fontFamily}`;
        this.ctx.fillStyle = obj.color;
        this.ctx.textAlign = obj.textAlign;
        this.ctx.textBaseline = 'middle';
        
        const lines = obj.text.split('\n');
        const lineHeight = obj.fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        
        lines.forEach((line, index) => {
            const y = (index - (lines.length - 1) / 2) * lineHeight;
            this.ctx.fillText(line, 0, y);
        });
    }

    drawShapeObject(obj) {
        this.ctx.fillStyle = obj.fill;
        this.ctx.strokeStyle = obj.stroke;
        this.ctx.lineWidth = obj.strokeWidth;
        
        switch (obj.shape) {
            case 'rectangle':
                this.ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
                if (obj.strokeWidth > 0) {
                    this.ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
                }
                break;
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(0, 0, obj.radius, 0, 2 * Math.PI);
                this.ctx.fill();
                if (obj.strokeWidth > 0) {
                    this.ctx.stroke();
                }
                break;
        }
    }

    drawSelectionHandles(obj) {
        this.ctx.save();
        
        // Draw selection outline
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(obj.x - 2, obj.y - 2, obj.width + 4, obj.height + 4);
        
        // Draw resize handles
        const handleSize = 8;
        const handles = [
            { x: obj.x - handleSize / 2, y: obj.y - handleSize / 2 }, // Top-left
            { x: obj.x + obj.width - handleSize / 2, y: obj.y - handleSize / 2 }, // Top-right
            { x: obj.x - handleSize / 2, y: obj.y + obj.height - handleSize / 2 }, // Bottom-left
            { x: obj.x + obj.width - handleSize / 2, y: obj.y + obj.height - handleSize / 2 } // Bottom-right
        ];
        
        this.ctx.fillStyle = '#00d4ff';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);
        
        handles.forEach(handle => {
            this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
            this.ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
        });
        
        this.ctx.restore();
    }

    // Tool Management
    setTool(tool) {
        this.currentTool = tool;
        this.updateCursor();
    }

    updateCursor(canvasPos) {
        if (!canvasPos) {
            canvasPos = { x: 0, y: 0 };
        }
        
        const objectUnderMouse = this.getObjectAtPosition(canvasPos.x, canvasPos.y);
        
        switch (this.currentTool) {
            case 'select':
                this.canvas.style.cursor = objectUnderMouse ? 'move' : 'default';
                break;
            case 'move':
                this.canvas.style.cursor = 'move';
                break;
            case 'rotate':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'scale':
                this.canvas.style.cursor = 'nw-resize';
                break;
            default:
                this.canvas.style.cursor = 'default';
        }
    }

    // Text Editing
    editTextObject(obj) {
        const newText = prompt('Edit text:', obj.text);
        if (newText !== null) {
            this.updateObject(obj.id, { text: newText });
        }
    }

    // Utility
    generateId() {
        return 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Zoom and Pan
    setZoom(zoom) {
        this.zoom = Math.max(0.1, Math.min(5, zoom));
        this.render();
        
        this.canvas.dispatchEvent(new CustomEvent('zoomChanged', {
            detail: { zoom: this.zoom }
        }));
    }

    setPan(x, y) {
        this.panX = x;
        this.panY = y;
        this.render();
    }

    // Clear all objects
    clearCanvas() {
        this.objects = [];
        this.selectedObjects = [];
        this.render();
        
        this.canvas.dispatchEvent(new CustomEvent('canvasCleared'));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasEngine;
}