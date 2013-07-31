/** Robust File Uploads
 * Allows chunked uploads and downloading files while they upload.
 *
 * Frederik Hermans <frederik.ac.hermans@gmail.com>
 */

/** Current upload state. */
var uploads = {};
/** Size of each chunk. */
var CHUNK_SIZE = 512*1024;
/** Maximum size for an uploaded file.
 * 10M * 4/3 for base64 encoding. */
var MAX_UPLOAD_SIZE = 50*1024*1024*4/3;

var errorJSON = function(msg) {
    return {error: msg, status: 'error'};
}

/** Handle an incoming chunk.
 * TODO Someone could hijack an upload and inject chunks. */
exports.handleChunk = function(keyfun) {
    return function(req, res) {
        key = keyfun(req);
        body = req.body;
        body.chunk = parseInt(body.chunk);
        body.dataSize = parseInt(body.dataSize);

        if (body.dataSize > MAX_UPLOAD_SIZE) {
            console.log(body.dataSize, MAX_UPLOAD_SIZE);
            res.json(errorJSON('File too large.'), 400);
            return;
        }
        
        if (body.chunk == 0) {
            /* If this is the first chunk, we need to initialize the upload
             * state entry. */
            uploads[key] = {nextChunk: 0,
                            numChunks: Math.ceil(body.dataSize/CHUNK_SIZE),
                            data: new Buffer(body.dataSize),
                            listeners: new Array()};
        }

        var ul = uploads[key];
        if (!ul) {
            res.json(errorJSON('Unknown portal/file combination.'), 400);
            return;
        }
        if (ul.nextChunk != body.chunk) {
            res.json(errorJSON('Unexpected chunk. Want: ' + ul.nextChunk +
                               ', got: ' + body.chunk), 400);
            return;
        }
        if (body.data.length != CHUNK_SIZE &&
            body.chunk != ul.numChunks-1) {
            res.json(errorJSON('Invalid chunk size for non-final chunk'),
                     400);
            return;
        }
        var isLast = body.data.length != CHUNK_SIZE;

        /* Store chunk in buffer. */
        /* TODO Store to file. */
        ul.data.write(body.data, ul.nextChunk*CHUNK_SIZE);
        ul.nextChunk = body.chunk+1;

        /* Let uploader know we accept the chunk. */
        res.end(JSON.stringify({status: 'success'}));

        /* Call listeners. */
        for (var i=0;i<ul.listeners.length;i++) {
            ul.listeners[i](body, isLast);
        }

        /* This was the last chunk, delete the upload state. */
        if (isLast) {
            uploads[key] = undefined;
        }
    }
}


var streamListener = function(req, res) {
    return function(body, isLast) {
        res.write(body.data);
        if (isLast) {
            res.end();
        }
    }
}


/** Stream a file as it is being uploaded. */
exports.streamUpload = function(keyfun) {
    return function(req, res) {
        key = keyfun(req);
        console.log(key);
        if (!uploads[key]) {
            res.json(errorJSON('Not found.'), 404);
            return;
        }
        ul = uploads[key];

        res.setHeader('Content-Length', ul.data.length);
        if (ul.nextChunk > 0) {
            /* Send all data received so far. */
            sofar = ul.data.slice(0, ul.nextChunk*CHUNK_SIZE);
            res.write(sofar);
        }

        /* Add listener. */
        /* TODO Race possible? */
        ul.listeners.push(streamListener(req, res));
    }
}
