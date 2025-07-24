/**
 * Canvas Engine - Core 2D Drawing and Object Management
 * Handles rendering, transformations, layers, and object manipulation
 */

class CanvasEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.objects = [];
        this.selectedObjects = [];
        this.layers = [];
        this.currentTool = 'select';
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.selectionBox = null;
        this.background = '#ffffff';
        this.grid = { visible: true, size: 20, color: '#e0e0e0' };
        
        this.setupEventListeners();
        this.render();
    }

    // Object Management
    createObject(type, properties = {}) {
        const id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const obj = {
            id,
            type,
            x: properties.x || 0,
            y: properties.y || 0,
            width: properties.width || 100,
            height: properties.height || 100,
            rotation: properties.rotation || 0,
            scaleX: properties.scaleX || 1,
            scaleY: properties.scaleY || 1,
            opacity: properties.opacity !== undefined ? properties.opacity : 1,
            visible: properties.visible !== undefined ? properties.visible : true,
            locked: properties.locked || false,
            layer: properties.layer || 0,
            zIndex: properties.zIndex || this.objects.length,
            ...properties
        };

        this.objects.push(obj);
        this.sortObjectsByZIndex();
        this.render();
        this.notifyObjectCreated(obj);
        return obj;
    }

    addImageObject(src, x = 0, y = 0) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const obj = this.createObject('image', {
                    x, y,
                    width: img.width,
                    height: img.height,
                    src,
                    image: img,
                    originalWidth: img.width,
                    originalHeight: img.height
                });
                resolve(obj);
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    addTextObject(text, x = 0, y = 0) {
        return this.createObject('text', {
            x, y,
            text: text || 'New Text',
            fontSize: 24,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            color: '#000000',
            textAlign: 'left',
            width: 200,
            height: 30
        });
    }

    addShapeObject(shape, x = 0, y = 0) {
        const shapes = {
            rectangle: { width: 100, height: 60 },
            circle: { width: 80, height: 80 },
            triangle: { width: 80, height: 80 }
        };

        return this.createObject('shape', {
            x, y,
            shape,
            fill: '#3498db',
            stroke: '#2980b9',
            strokeWidth: 2,
            ...shapes[shape] || shapes.rectangle
        });
    }

    deleteObject(objId) {
        const index = this.objects.findIndex(obj => obj.id === objId);
        if (index !== -1) {
            const obj = this.objects[index];
            this.objects.splice(index, 1);
            this.selectedObjects = this.selectedObjects.filter(selected => selected.id !== objId);
            this.render();
            this.notifyObjectDeleted(obj);
        }
    }

    duplicateObject(objId) {
        const obj = this.getObject(objId);
        if (obj) {
            const duplicate = { 
                ...obj, 
                id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                x: obj.x + 20,
                y: obj.y + 20,
                zIndex: this.objects.length
            };
            this.objects.push(duplicate);
            this.sortObjectsByZIndex();
            this.render();
            this.notifyObjectCreated(duplicate);
            return duplicate;
        }
    }

    getObject(objId) {
        return this.objects.find(obj => obj.id === objId);
    }

    updateObject(objId, properties) {
        const obj = this.getObject(objId);
        if (obj) {
            Object.assign(obj, properties);
            this.render();
            this.notifyObjectUpdated(obj);
        }
    }

    sortObjectsByZIndex() {
        this.objects.sort((a, b) => a.zIndex - b.zIndex);
    }

    // Selection Management
    selectObject(objId, addToSelection = false) {
        const obj = this.getObject(objId);
        if (obj && !obj.locked) {
            if (!addToSelection) {
                this.selectedObjects = [];
            }
            if (!this.selectedObjects.find(selected => selected.id === objId)) {
                this.selectedObjects.push(obj);
            }
            this.render();
            this.notifySelectionChanged();
        }
    }

    deselectObject(objId) {
        this.selectedObjects = this.selectedObjects.filter(obj => obj.id !== objId);
        this.render();
        this.notifySelectionChanged();
    }

    clearSelection() {
        this.selectedObjects = [];
        this.render();
        this.notifySelectionChanged();
    }

    getObjectAt(x, y) {
        const canvasPoint = this.screenToCanvas(x, y);
        
        // Check objects in reverse order (top to bottom)
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (!obj.visible) continue;
            
            if (this.isPointInObject(canvasPoint.x, canvasPoint.y, obj)) {
                return obj;
            }
        }
        return null;
    }

    isPointInObject(x, y, obj) {
        // Transform point to object's local coordinate system
        const cos = Math.cos(-obj.rotation * Math.PI / 180);
        const sin = Math.sin(-obj.rotation * Math.PI / 180);
        
        const dx = x - obj.x;
        const dy = y - obj.y;
        
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        
        const halfWidth = (obj.width * obj.scaleX) / 2;
        const halfHeight = (obj.height * obj.scaleY) / 2;
        
        return localX >= -halfWidth && localX <= halfWidth &&
               localY >= -halfHeight && localY <= halfHeight;
    }

    // Coordinate Transformations
    screenToCanvas(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left - this.panX) / this.zoom;
        const y = (screenY - rect.top - this.panY) / this.zoom;
        return { x, y };
    }

    canvasToScreen(canvasX, canvasY) {
        const x = canvasX * this.zoom + this.panX;
        const y = canvasY * this.zoom + this.panY;
        return { x, y };
    }

    // Rendering
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(this.panX / this.zoom, this.panY / this.zoom);
        
        // Draw background
        this.ctx.fillStyle = this.background;
        this.ctx.fillRect(-this.panX / this.zoom, -this.panY / this.zoom, 
                         this.canvas.width / this.zoom, this.canvas.height / this.zoom);
        
        // Draw grid
        if (this.grid.visible) {
            this.drawGrid();
        }
        
        // Draw objects
        this.objects.forEach(obj => {
            if (obj.visible) {
                this.drawObject(obj);
            }
        });
        
        // Draw selection indicators
        this.selectedObjects.forEach(obj => {
            this.drawSelection(obj);
        });
        
        this.ctx.restore();
        
        // Draw selection box
        if (this.selectionBox) {
            this.drawSelectionBox();
        }
    }

    drawGrid() {
        const gridSize = this.grid.size;
        const startX = Math.floor(-this.panX / this.zoom / gridSize) * gridSize;
        const startY = Math.floor(-this.panY / this.zoom / gridSize) * gridSize;
        const endX = startX + Math.ceil(this.canvas.width / this.zoom / gridSize + 1) * gridSize;
        const endY = startY + Math.ceil(this.canvas.height / this.zoom / gridSize + 1) * gridSize;
        
        this.ctx.strokeStyle = this.grid.color;
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.globalAlpha = 0.5;
        
        this.ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
        }
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    drawObject(obj) {
        this.ctx.save();
        
        // Apply transformations
        this.ctx.translate(obj.x, obj.y);
        this.ctx.rotate(obj.rotation * Math.PI / 180);
        this.ctx.scale(obj.scaleX, obj.scaleY);
        this.ctx.globalAlpha = obj.opacity;
        
        switch (obj.type) {
            case 'image':
                this.drawImage(obj);
                break;
            case 'text':
                this.drawText(obj);
                break;
            case 'shape':
                this.drawShape(obj);
                break;
        }
        
        this.ctx.restore();
    }

    drawImage(obj) {
        if (obj.image && obj.image.complete) {
            this.ctx.drawImage(
                obj.image,
                -obj.width / 2,
                -obj.height / 2,
                obj.width,
                obj.height
            );
        }
    }

    drawText(obj) {
        this.ctx.font = `${obj.fontWeight} ${obj.fontSize}px ${obj.fontFamily}`;
        this.ctx.fillStyle = obj.color;
        this.ctx.textAlign = obj.textAlign;
        this.ctx.textBaseline = 'middle';
        
        const lines = obj.text.split('\n');
        const lineHeight = obj.fontSize * 1.2;
        const startY = -(lines.length - 1) * lineHeight / 2;
        
        lines.forEach((line, index) => {
            this.ctx.fillText(line, 0, startY + index * lineHeight);
        });
    }

    drawShape(obj) {
        this.ctx.fillStyle = obj.fill;
        this.ctx.strokeStyle = obj.stroke;
        this.ctx.lineWidth = obj.strokeWidth;
        
        this.ctx.beginPath();
        
        switch (obj.shape) {
            case 'rectangle':
                this.ctx.rect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
                break;
            case 'circle':
                this.ctx.arc(0, 0, Math.min(obj.width, obj.height) / 2, 0, Math.PI * 2);
                break;
            case 'triangle':
                this.ctx.moveTo(0, -obj.height / 2);
                this.ctx.lineTo(-obj.width / 2, obj.height / 2);
                this.ctx.lineTo(obj.width / 2, obj.height / 2);
                this.ctx.closePath();
                break;
        }
        
        this.ctx.fill();
        if (obj.strokeWidth > 0) {
            this.ctx.stroke();
        }
    }

    drawSelection(obj) {
        this.ctx.save();
        this.ctx.translate(obj.x, obj.y);
        this.ctx.rotate(obj.rotation * Math.PI / 180);
        this.ctx.scale(obj.scaleX, obj.scaleY);
        
        // Selection outline
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 2 / this.zoom;
        this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
        this.ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
        
        // Selection handles
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = '#00d4ff';
        const handleSize = 8 / this.zoom;
        const handles = [
            { x: -obj.width / 2 - handleSize / 2, y: -obj.height / 2 - handleSize / 2 },
            { x: obj.width / 2 - handleSize / 2, y: -obj.height / 2 - handleSize / 2 },
            { x: obj.width / 2 - handleSize / 2, y: obj.height / 2 - handleSize / 2 },
            { x: -obj.width / 2 - handleSize / 2, y: obj.height / 2 - handleSize / 2 }
        ];
        
        handles.forEach(handle => {
            this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        });
        
        this.ctx.restore();
    }

    drawSelectionBox() {
        if (!this.selectionBox) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
        
        const x = Math.min(this.selectionBox.startX, this.selectionBox.endX);
        const y = Math.min(this.selectionBox.startY, this.selectionBox.endY);
        const width = Math.abs(this.selectionBox.endX - this.selectionBox.startX);
        const height = Math.abs(this.selectionBox.endY - this.selectionBox.startY);
        
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.restore();
    }

    // Event Handling
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleMouseDown(e) {
        const point = this.screenToCanvas(e.clientX, e.clientY);
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        
        const hitObject = this.getObjectAt(e.clientX, e.clientY);
        
        if (this.currentTool === 'select') {
            if (hitObject) {
                if (!e.ctrlKey && !e.metaKey) {
                    this.clearSelection();
                }
                this.selectObject(hitObject.id, e.ctrlKey || e.metaKey);
            } else {
                if (!e.ctrlKey && !e.metaKey) {
                    this.clearSelection();
                }
                // Start selection box
                this.selectionBox = {
                    startX: e.clientX,
                    startY: e.clientY,
                    endX: e.clientX,
                    endY: e.clientY
                };
            }
        }
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        
        if (this.currentTool === 'select') {
            if (this.selectedObjects.length > 0 && !this.selectionBox) {
                // Move selected objects
                const canvasDx = dx / this.zoom;
                const canvasDy = dy / this.zoom;
                
                this.selectedObjects.forEach(obj => {
                    obj.x += canvasDx;
                    obj.y += canvasDy;
                });
                
                this.dragStart = { x: e.clientX, y: e.clientY };
                this.render();
                this.notifyObjectsUpdated(this.selectedObjects);
            } else if (this.selectionBox) {
                // Update selection box
                this.selectionBox.endX = e.clientX;
                this.selectionBox.endY = e.clientY;
                this.render();
            }
        }
    }

    handleMouseUp(e) {
        if (this.selectionBox) {
            // Select objects within selection box
            const box = this.selectionBox;
            const minX = Math.min(box.startX, box.endX);
            const maxX = Math.max(box.startX, box.endX);
            const minY = Math.min(box.startY, box.endY);
            const maxY = Math.max(box.startY, box.endY);
            
            this.objects.forEach(obj => {
                const objScreen = this.canvasToScreen(obj.x, obj.y);
                if (objScreen.x >= minX && objScreen.x <= maxX &&
                    objScreen.y >= minY && objScreen.y <= maxY) {
                    this.selectObject(obj.id, true);
                }
            });
            
            this.selectionBox = null;
            this.render();
        }
        
        this.isDragging = false;
    }

    handleWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, this.zoom * delta));
        
        // Zoom towards mouse position
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
        this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
        this.zoom = newZoom;
        
        this.render();
        this.notifyZoomChanged();
    }

    handleContextMenu(e) {
        e.preventDefault();
        const hitObject = this.getObjectAt(e.clientX, e.clientY);
        this.notifyContextMenu(e.clientX, e.clientY, hitObject);
    }

    handleKeyDown(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.selectedObjects.forEach(obj => {
                this.deleteObject(obj.id);
            });
        } else if (e.key === 'Escape') {
            this.clearSelection();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            this.selectedObjects.forEach(obj => {
                this.duplicateObject(obj.id);
            });
        }
    }

    // Zoom and Pan Controls
    setZoom(zoom) {
        this.zoom = Math.max(0.1, Math.min(5, zoom));
        this.render();
        this.notifyZoomChanged();
    }

    zoomToFit() {
        if (this.objects.length === 0) return;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.objects.forEach(obj => {
            minX = Math.min(minX, obj.x - obj.width / 2);
            minY = Math.min(minY, obj.y - obj.height / 2);
            maxX = Math.max(maxX, obj.x + obj.width / 2);
            maxY = Math.max(maxY, obj.y + obj.height / 2);
        });
        
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const padding = 50;
        
        const zoomX = (this.canvas.width - padding * 2) / contentWidth;
        const zoomY = (this.canvas.height - padding * 2) / contentHeight;
        this.zoom = Math.min(zoomX, zoomY, 1);
        
        this.panX = (this.canvas.width - contentWidth * this.zoom) / 2 - minX * this.zoom;
        this.panY = (this.canvas.height - contentHeight * this.zoom) / 2 - minY * this.zoom;
        
        this.render();
        this.notifyZoomChanged();
    }

    // Event Notifications
    notifyObjectCreated(obj) {
        this.dispatchEvent('objectCreated', { object: obj });
    }

    notifyObjectUpdated(obj) {
        this.dispatchEvent('objectUpdated', { object: obj });
    }

    notifyObjectsUpdated(objects) {
        this.dispatchEvent('objectsUpdated', { objects });
    }

    notifyObjectDeleted(obj) {
        this.dispatchEvent('objectDeleted', { object: obj });
    }

    notifySelectionChanged() {
        this.dispatchEvent('selectionChanged', { selectedObjects: this.selectedObjects });
    }

    notifyZoomChanged() {
        this.dispatchEvent('zoomChanged', { zoom: this.zoom });
    }

    notifyContextMenu(x, y, object) {
        this.dispatchEvent('contextMenu', { x, y, object });
    }

    dispatchEvent(type, data) {
        const event = new CustomEvent(type, { detail: data });
        this.canvas.dispatchEvent(event);
    }

    // Tool Management
    setTool(tool) {
        this.currentTool = tool;
        this.canvas.style.cursor = this.getCursorForTool(tool);
    }

    getCursorForTool(tool) {
        const cursors = {
            select: 'default',
            move: 'move',
            rotate: 'grab',
            scale: 'nw-resize'
        };
        return cursors[tool] || 'default';
    }

    // Export/Import
    exportToJSON() {
        return {
            objects: this.objects,
            background: this.background,
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY
        };
    }

    importFromJSON(data) {
        this.objects = data.objects || [];
        this.background = data.background || '#ffffff';
        this.zoom = data.zoom || 1;
        this.panX = data.panX || 0;
        this.panY = data.panY || 0;
        this.selectedObjects = [];
        
        // Reload images
        const imagePromises = this.objects
            .filter(obj => obj.type === 'image' && obj.src)
            .map(obj => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        obj.image = img;
                        resolve();
                    };
                    img.onerror = resolve; // Continue even if image fails
                    img.src = obj.src;
                });
            });
        
        return Promise.all(imagePromises).then(() => {
            this.render();
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasEngine;
}