function JSONTextEditor(params) {

    var defaults = {
        width: '100%',
        min_height: '100px',
        styles: {
            error_line: 'background: #FFAAAA',
            error_char: 'background: #990000; color: #FFFFFF', 
            border: '1px solid #000000'
        }
    }
    params = Object.assign({}, defaults, params);

    var el = document.createElement('pre');
    el.contentEditable = true;
    el.spellcheck = false;
    el.style.width = params.width;
    el.style.minHeight = params.min_height;
    el.style.border = params.styles.border;
    params.parent.appendChild(el);

    // sys 
    function addEventListener(obj, evt, handler) {
        if(obj.addEventListener) {
            obj.addEventListener(evt, handler, false);
        } else if(obj.attachEvent) {
            return obj.attachEvent('on' + evt, handler);
        }        
    }    

    function stripTags(text) {
        text = text.replace(/<br>/gi, '\n');
        text = text.replace(/(<([^>]+)>)/gi, '');        
        return text;
    }


    // editor
    function enterKeyPressHandler(event) {
        var sel, range, br, added = false;
        event = event || window.event;
        var charCode = event.which || event.keyCode;
        if(charCode != 13) {
            return;
        }
        if(typeof window.getSelection != 'undefined') {
            sel = window.getSelection();
            if(sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();
                br = document.createElement('br');
                range.insertNode(br);
                range.setEndAfter(br);
                range.setStartAfter(br);                   
                sel.removeAllRanges();
                sel.addRange(range);
                added = true;
            }
        } else if(typeof document.selection != 'undefined') {
            sel = document.selection;
            if (sel.createRange) {
                range = sel.createRange();
                range.pasteHTML('<br>');
                range.select();
                added = true;
            }
        }

        if(added) {
            if(typeof evt.preventDefault != 'undefined') {
                evt.preventDefault();
            } else {
                evt.returnValue = false;
            }
        }
    }
    addEventListener(el, 'keypress', enterKeyPressHandler);


    function focusHandler(event) {
        el.innerHTML = stripTags(el.innerHTML);
    }
    addEventListener(el, 'focus', focusHandler);


    function pasteHandler(event) {
        event = event || window.event;
        var paste = (event.clipboardData || window.clipboardData).getData('text');
        paste = stripTags(paste);
        if(typeof window.getSelection != 'undefined') {
            var sel = window.getSelection();
            if(!sel.rangeCount) {
                return false;
            }
            sel.deleteFromDocument();
            sel.getRangeAt(0).insertNode(document.createTextNode(paste));
            sel.removeAllRanges();
        } else if(typeof document.selection != 'undefined') {
            var sel = document.selection;
            if (sel.createRange) {
                range = sel.createRange();
                range.pasteHTML(paste);
                range.select();
            }
        }
        event.preventDefault();
    }
    addEventListener(el, 'paste', pasteHandler);




    function getContent() {
        var str = stripTags(el.innerHTML);
        try {
            var res = jsonlint.parse(str);
        } catch(e) {
            var lines = str.split('\n');
            var line = lines[e.metadata.line];
            line = 
                '<span style="' + params.styles.error_line + '">' + 
                line.replace(e.metadata.text, '<span style="' + params.styles.error_char + '">' + e.metadata.text + '</span>') +
                '</span>';
            lines[e.metadata.line] = line;
            el.innerHTML = lines.join('\n');
            return undefined;
        }
        return res;        
    }


    function setContent(obj) {
        var str = JSON.stringify(obj, null, 4);
        str = str.replace(/\n/g, '<br>');
        el.innerHTML = str;
    }
    if('content' in params) {
        setContent(params.content);
    }


    return {
        setContent: setContent,
        getContent: getContent,
        destroy: function() {
            el.parentNode.removeChild(el);
        }
    }

}