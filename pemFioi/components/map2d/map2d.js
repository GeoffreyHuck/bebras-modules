function Map2D(params) {


    var defaults = {
        width: false,
        height: false,
        zoom: 0,
        max_zoom: 1,
        min_zoom: -2,
        styles: {
            point_radius: 6,
            line_width: 3,
            line_color: '#000000',
            pin_color: '#FFFFFF',
            area_color: '#FFFFFF66',
            selection_color: '#CC3333',
            text_color: '#FFFFFF',
            text_outline: '#000000',
            marker_color: '#FF0000',
            marker_size: 30,
            font: {
                size: 14,
                face: 'sans'
            }
        },
        strings: {
            point: 'Point',
            line: 'Line',
            area: 'Area',
            delete: 'Delete',
            undo: 'Undo',
            redo: 'Redo',
            tag: 'Tag',
            name: 'Name',
            save: 'Save',
            cancel: 'Cancel'
        },
        tags: []
    }
    params = Object.assign({}, defaults, params);


    // system
    function createElement(tag, className, content) {
        var el = document.createElement(tag);
        if(typeof className === 'string') {
            el.className = className;
        }
        if(typeof content === 'string') {
            el.innerHTML = content;
        } else if(Array.isArray(content)) {
            for(var i=0; i<content.length; i++) {
                el.appendChild(content[i]);
            }
        }
        return el;
    }


    var wrapper = createElement('div', 'map2d');
    params.parent.appendChild(wrapper);



    // Viewport 
    function Viewport(image) {

        var zoom = params.zoom;
        var prev_zoom = null;

        var bounds = {
            width: image.width,
            height: image.height,
            x: 0,
            y: 0,
            scale: 1
        }
        
       

        function refresh() {
            bounds.resized = prev_zoom !== zoom;
            if(bounds.resized) {
                bounds.scale = Math.pow(2, zoom);
                bounds.width = image.width * bounds.scale;
                bounds.height = image.height * bounds.scale;
                bounds.resized = true;
                prev_zoom = zoom;                
            }

            if(bounds.width < wrapper.clientWidth) {
                bounds.x = (bounds.width - wrapper.clientWidth) * 0.5;
            } else {
                var max_x = bounds.width - wrapper.clientWidth;
                bounds.x = Math.min(max_x, bounds.x);
                bounds.x = Math.max(0, bounds.x);
            }

            if(bounds.height < wrapper.clientHeight) {
                bounds.y = (bounds.height - wrapper.clientHeight) * 0.5;
            } else {
                var max_y = bounds.height - wrapper.clientHeight;
                bounds.y = Math.min(max_y, bounds.y);
                bounds.y = Math.max(0, bounds.y);            
            }

            zoom_in.className = zoom == params.max_zoom ? 'button button-disabled' : 'button';
            zoom_out.className = zoom == params.min_zoom ? 'button button-disabled' : 'button';            

            map.setBounds(bounds);
            editor.setBounds(bounds);            
        }



        function changeZoom(ofs) {
            var new_zoom = zoom + ofs;
            new_zoom = Math.max(new_zoom, params.min_zoom);
            new_zoom = Math.min(new_zoom, params.max_zoom);
            var hw = wrapper.clientWidth * 0.5;
            var hh = wrapper.clientHeight * 0.5;
            var scale = Math.pow(2, zoom);
            var k = Math.pow(2, new_zoom) / Math.pow(2, zoom);
            bounds.x = (bounds.x + hw) * k - hw;
            bounds.y = (bounds.y + hh) * k - hh;
            zoom = new_zoom;
            refresh();
        }

        
        // zoom controls
        var zoom_in = createElement('div', 'button', '+');
        zoom_in.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            changeZoom(1);
        });
        var zoom_out = createElement('div', 'button', '-')
        zoom_out.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            changeZoom(-1);
        });
        wrapper.appendChild(
            createElement('div', 'zoom', [zoom_in, zoom_out])
        );
        
        refresh();



        var drag;

        function startDrag(point) {
            drag = {
                x: bounds.x + point.x,
                y: bounds.y + point.y
            }
            return true;
        }

        function handleDrag(point) {
            bounds.x = drag.x - point.x;
            bounds.y = drag.y - point.y;
            refresh();
        }

        function stopDrag() {}


        return {
            refresh: refresh,
            
            startDrag: startDrag,
            handleDrag: handleDrag,
            stopDrag: stopDrag
        }
    }




    // Map layer
    function Map(image) {

        function setBounds(bounds) {
            if(bounds.resized) {
                el.style.width = bounds.width + 'px';
                el.style.height = bounds.height + 'px';            
            }
            el.style.left =  (-bounds.x) + 'px';
            el.style.top = (-bounds.y) + 'px';
        }

        var el = new Image();
        el.src = image.src;
        el.className = 'map';
        wrapper.appendChild(el);


        return {
            destroy: function() {
                wrapper.removeChild(el);
                delete el;
            },

            setBounds: setBounds
        }
    }


    // Editor toolbar
    function Toolbar(handlers) {
        var buttons = {
            point: createElement('div', 'button', params.strings.point),
            line: createElement('div', 'button', params.strings.line),
            area: createElement('div', 'button', params.strings.area),
            delete: createElement('div', 'button', params.strings.delete),
            undo: createElement('div', 'button', params.strings.undo),
            redo: createElement('div', 'button', params.strings.redo)
        }

        var holder = createElement('div', 'toolbar', [
            createElement('div', 'group', [
                buttons.point,
                buttons.line,
                buttons.area
            ]),
            createElement('div', 'group', [
                buttons.delete,
                buttons.undo,
                buttons.redo
            ])
        ]);
        wrapper.appendChild(holder);

        function selectButton(name) {
            var names = ['point', 'line', 'area'];
            for(var i=0; i < names.length; i++) {        
                buttons[names[i]].className = names[i] === name ? 'button button-selected' : 'button';
            }                
        }

        function disableButton(name, diabled) {
            buttons[name].className = diabled ? 'button button-disabled' : 'button';
        }

        var type;
        function setType(new_type) {
            if(new_type !== type) {
                type = new_type;
                handlers.onTypeChange(type);            
            }
        }


        var commands = {
            point: function() {
                setType('point');
            },
            line: function() {
                setType('line');
            },
            area: function() {
                setType('area');
            },
            delete: handlers.onDelete,
            undo: handlers.onUndo,
            redo: handlers.onRedo
        }

        for(var name in commands) {
            buttons[name].addEventListener('click', (function(name) {
                return function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    commands[name]();
                }
            })(name));
        }

        return {
            selectButton: selectButton,

            disableButton: disableButton,

            destroy: function() {
                wrapper.removeChild(holder);
            }
        }
    }



    function State(default_state) {

        var states = [];
        var pointer = 0;


        function read(new_pointer) {
            pointer = new_pointer;
            return JSON.parse(states[pointer]);
        }

        function write(data) {
            states.push(JSON.stringify(data));
            pointer = states.length - 1;
        }

        write(default_state);

        return {
            get: function() {
                return read(pointer);
            },

            push: function(data) {
                if(pointer < states.length - 1) {
                    states = states.slice(0, pointer + 1);
                }
                write(data);
            },

            undo: function() {
                return read(pointer - 1);
            },

            redo: function() {
                return read(pointer + 1);
            },

            getCapabilities: function() {
                return {
                    undo: pointer > 0,
                    redo: pointer !== null && pointer < states.length - 1
                }
            }
        }
    }


    // Drawing editor layer
    function Editor(image) {

        var canvas = createElement('canvas', 'editor');
        wrapper.appendChild(canvas);
        var context2d = canvas.getContext('2d');
        var bounds;
        
        var state;
        var data;


        function resetState(figures) {
            state = State({
                pointer: null,
                type: null,
                figures: figures || params.figures || []
            });
            data = state.get();
            params.onEdit && params.onEdit(data.figures);
        }
        resetState();


        function saveState() {
            state.push(data);
            refreshToolbar();
            params.onEdit && params.onEdit(data.figures);
        }


        function drawPoint(point) {
            context2d.beginPath();
            if(selection.data && isSamePoint(point, selection.data.point)) {
                context2d.fillStyle = params.styles.selection_color;            
            } else {
                context2d.fillStyle = params.styles.pin_color;            
            }
            context2d.arc(point.x, point.y, params.styles.point_radius / bounds.scale, 0, 2 * Math.PI);
            context2d.stroke();
            context2d.fill();  
        }


        function drawFigureName(figure) {
            var text_height = params.styles.font.size / bounds.scale;
            var dx, dy;
            if(figure.type == 'point' || figure.points.length < 2) {
                dx = 0;
                dy = text_height;
                context2d.textAlign = 'center';
                context2d.textBaseline = 'top';
            } else {
                if(figure.points[1].y > figure.points[0].y) {
                    context2d.textBaseline = 'bottom';
                    dy = -params.styles.line_width / bounds.scale;
                } else {
                    dy = params.styles.line_width / bounds.scale;
                    context2d.textBaseline = 'top';
                }
                if(figure.points[1].x > figure.points[0].x) {
                    context2d.textAlign = 'right';
                    dx = -text_height;
                } else {
                    context2d.textAlign = 'left';
                    dx = text_height;                    
                }
            }
            context2d.strokeStyle = params.styles.text_outline;
            context2d.strokeText(figure.name, figure.points[0].x + dx, figure.points[0].y + dy);
            context2d.fillStyle = params.styles.text_color;
            context2d.fillText(figure.name, figure.points[0].x + dx, figure.points[0].y + dy);            
        }


        var shapes = {

            point: function(points) {
                drawPoint(points[0]);
            },

            line: function(points) {
                context2d.beginPath();
                context2d.moveTo(points[0].x, points[0].y);
                for(var i=1; i<points.length; i++) {
                    context2d.lineTo(points[i].x, points[i].y);        
                }
                context2d.stroke();
                for(var i=0; i<points.length; i++) {
                    drawPoint(points[i]);
                }
            },

            area: function(points) {
                context2d.beginPath();
                context2d.fillStyle = params.styles.area_color;                            
                context2d.moveTo(points[0].x, points[0].y);
                for(var i=1; i<points.length; i++) {
                    context2d.lineTo(points[i].x, points[i].y);        
                }
                context2d.closePath();
                context2d.stroke();
                context2d.fill();
                for(var i=0; i<points.length; i++) {
                    drawPoint(points[i]);
                }                
            }

        }



        function draw() {
            if(!bounds) {
                return;
            }
            context2d.setTransform(1, 0, 0, 1, 0, 0);                
            context2d.clearRect(0, 0, bounds.width, bounds.height);
            context2d.setTransform(bounds.scale, 0, 0, bounds.scale, 0, 0);                
            context2d.font = 'bold ' + Math.round(params.styles.font.size / bounds.scale) + 'px ' + params.styles.font.face;
            context2d.strokeStyle = params.styles.line_color;
            context2d.lineWidth = params.styles.line_width / bounds.scale;
            for(var i=0; i<data.figures.length; i++) {
                shapes[data.figures[i].type](data.figures[i].points);
                drawFigureName(data.figures[i]);
            }
            marker.draw();
        }


        function setBounds(new_bounds) {
            bounds = new_bounds;
            if(bounds.resized) {
                canvas.width = bounds.width;
                canvas.height = bounds.height;
                canvas.style.width = bounds.width + 'px';
                canvas.style.height = bounds.height + 'px';
                draw();                
            }
            canvas.style.left =  (-bounds.x) + 'px';
            canvas.style.top = (-bounds.y) + 'px';
        }


        function isSamePoint(point1, point2) {
            var d = params.styles.point_radius / bounds.scale;
            return Math.abs(point1.x - point2.x) <= d && Math.abs(point1.y - point2.y) <= d;
        }



        var selection = {
            
            data: null,

            set: function(data) {
                this.data = data;
                if(this.data) {
                    panel.open(data);
                } else {
                    panel.close();
                }
                refreshToolbar();
            }
        }


        function openFigure(point) {
            selection.set(false);
            data.figures.push({
                type: data.type,
                points: [point],
                name: '',
                tag: ''
            });          
            if(data.type != 'point') {
                data.pointer = data.figures.length - 1;
            }
            saveState();
        }

        function modifyFigure(point) {
            selection.set(false);
            data.figures[data.pointer].points.push(point);
            saveState();
        }


        function closeFigure() {
            selection.set(false);
            if(data.pointer === null) {
                return;
            }
            switch(data.figures[data.pointer].type) {
                case 'line':
                    if(data.figures[data.pointer].points.length < 2) {
                        data.figures.splice(data.pointer, 1);
                    }
                    break;
                case 'area':
                    if(data.figures[data.pointer].points.length < 3) {
                        data.figures.splice(data.pointer, 1);
                    }
                    break;
            }
            data.pointer = null;
            saveState();
            draw();
        }


        var toolbar = Toolbar({
            onTypeChange: function(new_type) {
                closeFigure();
                data.type = new_type;
                refreshToolbar();
            },
            onDelete: function() {
                if(selection.data) {
                    data.figures[selection.data.figure_idx].points.splice(selection.data.point_idx, 1);
                    if(!data.figures[selection.data.figure_idx].points.length) {
                        data.figures.splice(selection.data.figure_idx, 1);
                    }
                    selection.set(false);
                    saveState();
                    draw();
                }
            },
            onRedo: function() {
                if(state.getCapabilities().redo) {
                    data = state.redo();
                    refreshToolbar();
                    draw();
                }
            },
            onUndo: function() {
                if(state.getCapabilities().undo) {
                    data = state.undo();
                    refreshToolbar();
                    draw();
                }
            }
        });

        function refreshToolbar() {
            var caps = state.getCapabilities();
            toolbar.disableButton('undo', !caps.undo);
            toolbar.disableButton('redo', !caps.redo);
            toolbar.disableButton('delete', !selection.data);
            toolbar.selectButton(data.type);
        }


        function findFigure(point) {
            for(var i=0; i<data.figures.length; i++) {
                for(var j=0; j<data.figures[i].points.length; j++) {
                    if(isSamePoint(data.figures[i].points[j], point)) {
                        return {
                            figure_idx: i,
                            figure: data.figures[i],
                            point_idx: j,
                            point: data.figures[i].points[j]
                        }
                    }
                }
            }
            return false;
        }


        function normalizePoint(point) {
            return {
                x: (point.x + bounds.x) / bounds.scale,
                y: (point.y + bounds.y) / bounds.scale
            }
        }



        function handleClick(point) {
            point = normalizePoint(point);
            if(point.x < 0 || point.x > image.width || point.y < 0 || point.y > image.height) {
                return;
            }

            var figure = findFigure(point);
            if(figure) {
                if(data.pointer) {
                    var points = data.figures[data.pointer].points;
                    if(isSamePoint(point, points[points.length - 1])) {
                        closeFigure();
                    }
                }                
                selection.set(figure);
            } else {
                if(data.type === null) {
                    return;
                }
                if(data.pointer === null) {
                    openFigure(point);
                } else {
                    modifyFigure(point);
                }
            }
            draw();
        }        


        var drag;

        function startDrag(point) {
            point = normalizePoint(point);
            drag = {
                figure: findFigure(point),
                mouse: point
            }
            return !!drag.figure;
        }

        function handleDrag(point) {
            selection.set(false);
            point = normalizePoint(point);
            data.figures[drag.figure.figure_idx].points[drag.figure.point_idx] = {
                x: drag.figure.point.x - drag.mouse.x + point.x,
                y: drag.figure.point.y - drag.mouse.y + point.y
            }
            draw();
        }


        function stopDrag() {
            drag = false;
            saveState();
        }


        refreshToolbar();

        var marker = {
            
            data: null, // { point: ..., type: 'extra' || 'missed' }

            set: function(point, type) {
                if(point) {
                    this.data = {
                        point: point,
                        type: type
                    }
                } else {
                    this.data = null;
                }
                draw();
            },

            draw: function() {
                if(!this.data) {
                    return;
                }
                context2d.strokeStyle = params.styles.marker_color;
                context2d.lineWidth = params.styles.line_width / bounds.scale;                
                var s = 0.5 * params.styles.marker_size / bounds.scale;                
                context2d.beginPath();                
                if(this.data.type == 'extra') {
                    context2d.arc(this.data.point.x, this.data.point.y, s, 0, 2 * Math.PI);
                } else if(this.data.type == 'miss') {
                    context2d.rect(this.data.point.x - s, this.data.point.y - s, 2 * s, 2 * s);
                }
                context2d.closePath();
                context2d.stroke();
            }
        }

        return {
            setBounds: setBounds,

            handleClick: handleClick,

            startDrag: startDrag,
            handleDrag: handleDrag,
            stopDrag: stopDrag,

            getFigures: function() {
                return data.figures;
            },

            setFigures: function(figures) {
                selection.set(false);
                resetState(figures);
                draw();
            },

            updateFigure: function(idx, attributes) {
                selection.set(false);
                var changed = false;
                for(var k in attributes) {
                    if(data.figures[idx][k] !== attributes[k]) {
                        data.figures[idx][k] = attributes[k];
                        changed = true;
                    }
                }
                if(changed) {
                    saveState();
                    draw();
                }
            },

            clearSelection: function() {
                selection.set(false);
                draw();
            },

            setMarker: function(point, type) {
                marker.set(point, type);
            },

            destroy: function() {
                toolbar.destroy();
                wrapper.removeChild(canvas);
            }
        }
    }



    // panel
    function Panel() {

        var holder;
        var controls;

       
        function render() {
            if(controls) {
                return;
            }
            var tag_options = '';
            for(var i=0; i<params.tags.length; i++) {
                tag_options += '<option value="' + params.tags[i] + '">' + params.tags[i] + '</option>';
            }            
            controls = {
                name: createElement('input'),
                tag: createElement('select', '', tag_options),
                save: createElement('button', '', params.strings.save),
                cancel:  createElement('button', '', params.strings.cancel),
            }
            controls.name.type = 'input';
            
            controls.save.addEventListener('click', save);
            controls.cancel.addEventListener('click', function() {
                hide();
                editor.clearSelection();
            });

            holder = createElement('div', 'panel', [
                createElement('label', false, params.strings.name),
                controls.name,
                createElement('label', false, params.strings.tag),
                controls.tag,
                controls.save,
                controls.cancel
            ]);
            params.parent.appendChild(holder);
        }


        function hide() {
            if(holder) {
                holder.style.display = 'none';
            }
        }


        function save() {
            hide();
            var attrs = {
                name: controls.name.value,
                tag: controls.tag.value,
            }            
            editor.updateFigure(figure_idx, attrs);
            editor.clearSelection();
        }


        var figure_idx;

        return {
            open: function(selection) {
                render();
                controls.name.value = typeof selection.figure.name == 'string' ? selection.figure.name : '';
                controls.tag.value = typeof selection.figure.tag == 'string' ? selection.figure.tag : '';
                holder.style.display = '';
                figure_idx = selection.figure_idx;
            },

            close: function() {
                hide();
            },

            destroy: function() {
                holder.parent.removeChild(holder);
            }
        }
    }




    function MouseEventsHandler() {

        var mouse_moved = false;

        function getRelativePoint(e) {
            var rect = wrapper.getBoundingClientRect();            
            return {
                x: e.clientX - rect.x,
                y: e.clientY - rect.y
            }            
        }

        var drag_handler;

        wrapper.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            e.preventDefault();

            var point = getRelativePoint(e);
            if(editor.startDrag(point)) {
                drag_handler = editor;
            } else if(viewport.startDrag(point)) {
                drag_handler = viewport;
            }
            mouse_moved = false;
        });

        wrapper.addEventListener('mousemove', function(e) {
            mouse_moved = true;
            if(drag_handler) {
                var point = getRelativePoint(e);            
                drag_handler.handleDrag(point);
            }
        });


        wrapper.addEventListener('mouseup', function(e) {
            if(mouse_moved && drag_handler) {
                drag_handler.stopDrag();
            }
            drag_handler = false;
        });

        wrapper.addEventListener('mouseleave', function(e) {
            if(mouse_moved && drag_handler) {
                drag_handler.stopDrag();
            }
            drag_handler = false;
        });        

        wrapper.addEventListener('click', function(e) {
            if(!mouse_moved) {
                editor.handleClick(getRelativePoint(e));
            }
        });        
    }


    // comparator
    function diff(image, target) {
        var editor_figures = editor.getFigures();
        var canvas = createElement('canvas', 'editor');
        canvas.width = image.width;
        canvas.height = image.height;
        var context2d = canvas.getContext('2d');

        var color = '#FF0000';


        var shapes = {

            point: function(points, size) {
                context2d.beginPath();                
                context2d.arc(points[0].x, points[0].y, size / 2, 0, 2 * Math.PI);
                context2d.closePath();
                context2d.stroke();
                context2d.fill();                
            },

            line: function(points, size) {
                context2d.beginPath();                
                context2d.moveTo(points[0].x, points[0].y);
                for(var i=1; i<points.length; i++) {
                    context2d.lineTo(points[i].x, points[i].y);        
                }
                context2d.stroke();
            },

            area: function(points, size) {
                context2d.beginPath();                
                context2d.moveTo(points[0].x, points[0].y);
                for(var i=1; i<points.length; i++) {
                    context2d.lineTo(points[i].x, points[i].y);        
                }
                context2d.closePath();
                context2d.stroke();
                context2d.fill();
            }
        }


        function createMask(figures, bias) {
            context2d.setTransform(1, 0, 0, 1, 0, 0);                
            context2d.clearRect(0, 0, image.width, image.height);
            context2d.strokeStyle = color;
            context2d.fillStyle = color;  
            context2d.lineWidth = bias * 2;            
            for(var i=0; i<figures.length; i++) {
                shapes[figures[i].type](figures[i].points, bias);
            }
            //debug.displayCanvas('img', canvas);

            var pixels = context2d.getImageData(0, 0, image.width, image.height).data;
            var res = [];            
            for(var i=0; i<pixels.length; i+=4) {
                res.push(pixels[i] != 0 ? 1 : 0);
            }
            return res;
        }
        


        function filterFiguresByTag(figures, tag, include_empty_tags) {
            var res = [];
            for(var i=0; i<figures.length; i++) {
               if(figures[i].tag == tag || (include_empty_tags && figures[i].tag == '')) {
                    res.push(figures[i]);
                }
            }
            return res;
        }


        function displayMistake(ofs, type) {
            var point = {
                x: ofs % image.width, 
                y: Math.floor(ofs / image.width)
            }
            editor.setMarker(point, type);
        }


        var ofs_table = (function() {
            var res = [];

            function add(x, y) {
                res.push(y * image.width + x);
            }
            add(0, 0);
            for(var b=1; b<target.bias; b++) {
                for(var i=-b; i<=b; i++) {
                    add(i, b);
                    add(i, -b);    
                    if(i != -b && i != b) {
                        add(b, i);
                        add(-b, i);                    
                    }
                }
            }
            return res;
        })();


        //debug.setSize({ width: image.width, height: image.height});
        var res = true;
        for(var i=0; i<params.tags.length; i++) {
            var figures = filterFiguresByTag(target.figures, params.tags[i]);
            var target_mask = createMask(figures, target.bias);
            //debug.displayMask('target_mask ' + params.tags[i], target_mask)
            var target_drawing = createMask(figures, 1);
            //debug.displayMask('target_drawing ' + params.tags[i], target_drawing)
            var figures = filterFiguresByTag(editor_figures, params.tags[i], true);
            var editor_drawing = createMask(figures, 1);
            //debug.displayMask('editor_drawing ' + params.tags[i], editor_drawing)
            for(var j=0; j<editor_drawing.length; j++) {
                // check extra pixels in restricted area
                if(editor_drawing[j] != 0 && target_mask[j] == 0) {
                    displayMistake(j, 'extra');
                    return false;
                }

                // check missed pixels
                var l;
                var fl = false;
                bias_loops:
                for(var k=0; k<ofs_table.length; k++) {
                    l = j + ofs_table[k];
                    if(l < 0 || l >= editor_drawing.length) {
                        continue;
                    }
                    if(editor_drawing[l] == target_drawing[j]) {
                        fl = true;
                        break bias_loops;
                    }
                }
                if(!fl) {
                    displayMistake(j, 'miss');
                    return false;
                }
            }
        }
        return true;
    }





    function onResize() {
        var width = params.width ? params.width : params.parent.clientWidth;
        var height = params.height ? params.height : params.parent.clientHeight;    
        wrapper.style.width = width + 'px';
        wrapper.style.height = height + 'px';
        viewport && viewport.refresh();
    }
    

    // main 

    var loaded = false;
    var viewport;
    var map;
    var editor;
    var panel;
    var mouse_events;
    var image;

    function loadImage(src, callback) {
        if(!src) {
            console.error('Map2D: url parameter missed');
            return;
        }
        image = new Image();
        image.onload = function() {
            callback();
        }
        image.onerror = function() {
            console.error('Map2D: ' + src + ' loading error');
        }
        image.src = src;
    }    

    loadImage(params.url, function() {
        onResize();
        if(!params.width && !params.height) {
            window.addEventListener('resize', onResize, false);
        }                
        map = Map(image);
        editor = Editor(image);
        panel = Panel();
        viewport = Viewport(image);
        mouse_events = MouseEventsHandler();        
        onResize();
        loaded = true;
        params.onLoad && params.onLoad();
    })


    return {

        getFigures: function() {
            return editor ? editor.getFigures() : null;
        },

        setFigures: function(figures) {
            editor && editor.setFigures(figures);
        },        

        diff: function(target) {
            return diff(image, target);
        },

        destroy: function() {
            if(loaded) {
                map.destroy();
                editor.destroy();
                viewport.destroy();
            }
            if(!params.width && !params.height) {
                window.removeEventListener('resize', onResize);
            }            
        }
    }

}




debug = {

    wrapper: false,

    setSize: function(size) {
        this.size = size;
    },

    getWrapper: function() {
        if(!this.wrapper) {
            var el = document.createElement('div');
            with(el.style) {
                position = 'fixed';
                zIndex = 1000;
                top = 0;
                bottom = 0;
                right = 0;
                padding = '10px 10px 10px 5px';
                background = '#CCC';
                overflow = 'scroll';            
            }
            document.body.appendChild(el);               
            this.wrapper = el;
        }
        return this.wrapper;
    },
 
    addTitle: function(title) {
        var el = document.createElement('div');
        el.innerHTML = title;
        this.getWrapper().appendChild(el);        
    },
 
    createCanvas: function(title) {
        this.addTitle(title);

        var canvas = document.createElement('canvas');
        canvas.width = this.size.width;
        canvas.height = this.size.height;
        canvas.style.width = this.size.width + 'px';
        canvas.style.height = this.size.height + 'px';        
        canvas.style.border = '1px solid #000';        
        var context2d = canvas.getContext('2d');
        this.getWrapper().appendChild(canvas);        

        return canvas;
    },
 
    displayMask: function(title, mask) {
        var canvas = this.createCanvas(title);
        var context2d = canvas.getContext('2d');

        context2d.clearRect(0,0, this.size.width, this.size.height);        
        
        
        var image_data = context2d.getImageData(0, 0, this.size.width, this.size.height);
        var ofs_m = 0;
        var ofs_i = 0;
        for(var y=0; y<this.size.height; y++) {
            for(var x=0; x<this.size.width; x++) {
                var c = mask[ofs_m] * 255;
                //var c = Math.floor(Math.random() * 256);
                image_data.data[ofs_i] = c;
                image_data.data[ofs_i + 1] = c;
                image_data.data[ofs_i + 2] = c;
                image_data.data[ofs_i + 3] = 255;
                ofs_i += 4;
                ofs_m += 1;
            }
        }
        context2d.putImageData(image_data, 0, 0);
    },

    displayCanvas: function(title, canvas) {
        this.addTitle(title);

        var image = new Image();
        image.width = this.size.width;
        image.height = this.size.height;
        image.src = canvas.toDataURL("image/png");
        this.getWrapper().append(image);
    }
 
 }