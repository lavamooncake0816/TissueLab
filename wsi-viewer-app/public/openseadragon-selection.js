/*
 * This software was developed at the National Institute of Standards and
 * Technology by employees of the Federal Government in the course of
 * their official duties. Pursuant to title 17 Section 105 of the United
 * States Code this software is not subject to copyright protection and is
 * in the public domain. This software is an experimental system. NIST assumes
 * no responsibility whatsoever for its use by other parties, and makes no
 * guarantees, expressed or implied, about its quality, reliability, or
 * any other characteristic. We would appreciate acknowledgement if the
 * software is used.
 */

/**
 *
 * This module provides a way to display rectangular overlays on top of the
 * OpenSeadragon viewer and to capture mouse events on those overlays.
 *
 * Overlays are added in the coordinate system of the image (not in the
 * coordinate system of the viewer).  By default, overlays at different zoom
 * levels will appear at the same physical size.
 *
 * To use this, include openseadragon-selection.js after openseadragon.js on
 * your web page.  This will add a method called "selection" to your OpenSeadragon
 * Viewer objects.  Call this method to obtain a Selection object, then use
 * Selection.makeRectangle() to create a rectangle.
 *
 * @version 0.0.1
 * @author Kenton McHenry
 */

(function($) {
    if (!$) {
        // Browser environment - OpenSeadragon should be directly available
        $ = window.OpenSeadragon;
        if (!$) {
            console.error('OpenSeadragon is missing or not loaded before this plugin.');
            return;
        }
    }
    
    // ----------
    $.Viewer.prototype.selection = function(options) {
        if (!this.selectionInstance) {
            options = options || {};
            options.viewer = this;
            this.selectionInstance = new $.Selection(options);
        }
        return this.selectionInstance;
    };

    // ----------
    $.Selection = function(options) {
        var self = this;
        this.viewer = options.viewer;
        
        // Options with defaults
        this.options = {
            element: options.element || null,
            showSelectionControl: options.showSelectionControl !== undefined ? options.showSelectionControl : true,
            startFixed: options.startFixed !== undefined ? options.startFixed : false,
            restrictToImage: options.restrictToImage !== undefined ? options.restrictToImage : false,
            onSelection: options.onSelection || null // Callback function
        };
        
        // Properties
        this.element = null;
        this.rect = null;
        this.enabled = false;
        
        // Initialization
        if (this.options.element) {
            // If element is provided, use it
            if (typeof this.options.element === 'string') {
                this.element = document.getElementById(this.options.element);
            } else {
                this.element = this.options.element;
            }
        } else {
            // Create default element
            this.element = document.createElement('div');
            this.element.className = 'openseadragon-selection';
            this.element.style.position = 'absolute';
            this.element.style.display = 'none';
            this.element.style.border = '2px solid #FF0000';
            this.element.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
            this.element.style.pointerEvents = 'none';
            
            this.viewer.canvas.appendChild(this.element);
        }
        
        // Add selection button to controls if requested
        if (this.options.showSelectionControl) {
            this.addSelectionButton();
        }
        
        this.bindEvents();
    };
    
    $.Selection.prototype = {
        // Start selection
        enable: function() {
            this.enabled = true;
            this.viewer.setMouseNavEnabled(false);
            this.rect = null;
            this.element.style.display = 'none';
            console.log('Selection enabled');
        },
        
        // Disable selection
        disable: function() {
            this.enabled = false;
            this.viewer.setMouseNavEnabled(true);
            this.rect = null;
            this.element.style.display = 'none';
            console.log('Selection disabled');
        },
        
        // Toggle selection
        toggle: function() {
            if (this.enabled) {
                this.disable();
            } else {
                this.enable();
            }
        },
        
        // Add selection button to viewer controls
        addSelectionButton: function() {
            var self = this;
            
            this.toggleButton = new $.Button({
                element:    this.viewer.buttonGroup.element,
                tooltip:    'Toggle Selection',
                srcRest:    '/openseadragon/images/selection_rest.png',
                srcGroup:   '/openseadragon/images/selection_grouphover.png',
                srcHover:   '/openseadragon/images/selection_hover.png',
                srcDown:    '/openseadragon/images/selection_pressed.png',
                onRelease:  function() { self.toggle(); }
            });
            
            this.viewer.buttonGroup.buttons.push(this.toggleButton);
            this.toggleButton.element.style.display = "inline-block";
        },
        
        // Bind mouse events
        bindEvents: function() {
            var self = this;
            var dragStart = null;
            var dragging = false;
            
            // Mouse down - start selection
            this.viewer.addHandler('canvas-press', function(event) {
                if (!self.enabled) return;
                
                dragStart = event.position.clone();
                dragging = true;
                
                // Set initial selection position
                if (self.options.startFixed) {
                    var viewportStart = self.viewer.viewport.pointFromPixel(dragStart);
                    self.rect = new $.Rect(viewportStart.x, viewportStart.y, 0, 0);
                    
                    // Create initial element
                    self.element.style.left = dragStart.x + 'px';
                    self.element.style.top = dragStart.y + 'px';
                    self.element.style.width = '0px';
                    self.element.style.height = '0px';
                    self.element.style.display = 'block';
                }
                
                event.preventDefaultAction = true;
            });
            
            // Mouse move - update selection
            this.viewer.addHandler('canvas-drag', function(event) {
                if (!self.enabled || !dragging) return;
                
                var pos = event.position;
                
                // Create selection rectangle
                var x = Math.min(dragStart.x, pos.x);
                var y = Math.min(dragStart.y, pos.y);
                var width = Math.abs(pos.x - dragStart.x);
                var height = Math.abs(pos.y - dragStart.y);
                
                // Update element
                self.element.style.left = x + 'px';
                self.element.style.top = y + 'px';
                self.element.style.width = width + 'px';
                self.element.style.height = height + 'px';
                self.element.style.display = 'block';
                
                // Update rectangle in viewer coordinates
                var viewportStart = self.viewer.viewport.pointFromPixel(new $.Point(x, y));
                var viewportEnd = self.viewer.viewport.pointFromPixel(new $.Point(x + width, y + height));
                
                self.rect = new $.Rect(
                    viewportStart.x,
                    viewportStart.y,
                    viewportEnd.x - viewportStart.x,
                    viewportEnd.y - viewportStart.y
                );
                
                // Restrict to image bounds if needed
                if (self.options.restrictToImage) {
                    var imageBounds = self.viewer.world.getItemAt(0).getBounds();
                    self.rect = self.rect.intersection(imageBounds);
                    
                    // Update element to reflect restricted bounds
                    var restricted = {
                        topLeft: self.viewer.viewport.viewportToViewerElementCoordinates(
                            new $.Point(self.rect.x, self.rect.y)
                        ),
                        bottomRight: self.viewer.viewport.viewportToViewerElementCoordinates(
                            new $.Point(self.rect.x + self.rect.width, self.rect.y + self.rect.height)
                        )
                    };
                    
                    self.element.style.left = restricted.topLeft.x + 'px';
                    self.element.style.top = restricted.topLeft.y + 'px';
                    self.element.style.width = (restricted.bottomRight.x - restricted.topLeft.x) + 'px';
                    self.element.style.height = (restricted.bottomRight.y - restricted.topLeft.y) + 'px';
                }
                
                event.preventDefaultAction = true;
            });
            
            // Mouse up - end selection
            this.viewer.addHandler('canvas-release', function(event) {
                if (!self.enabled || !dragging) return;
                
                dragging = false;
                
                if (self.rect && self.rect.width > 0 && self.rect.height > 0) {
                    // Fire selection event
                    self.viewer.raiseEvent('selection', {
                        rect: self.rect
                    });
                    
                    // Call the callback function if provided
                    if (typeof self.options.onSelection === 'function') {
                        self.options.onSelection(self.rect);
                    }
                } else {
                    // Empty selection - hide the element
                    self.element.style.display = 'none';
                    self.rect = null;
                }
                
                event.preventDefaultAction = true;
            });
        }
    };
    
    // Backward compatibility
    $.SelectionRect = $.Selection;
    
})(window.OpenSeadragon); 