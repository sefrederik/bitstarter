var express = require('express');
var fs = require('fs');

var app = express.createServer();
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use('/static', express.static(__dirname + '/static'));

var cleanHash = function(hash) {
    return hash.replace('/', '');
};

var cleanFilename = function(name) {
    return name.replace('/', '');
}

/** List files in a portal. */
app.get('/portal-api/v0/:hash', function(req, res) {
    hash = cleanHash(req.params.hash);
    try {
        var dir = 'portal/' + hash + '/';
        var json = {'files': Array()};
        files = fs.readdirSync(dir);
        for (var i=0; i<files.length; i++) {
            var stats = fs.statSync(dir + files[i]);
            json['files'].push({name: files[i], size: stats.size});
            /* TODO mime type, timestamp. */
        }
        res.json(json);
    } catch (err) {
        if (err.code = 'ENOENT') {
            res.json({error: 'Portal not found'}, 404);
        } else {
            res.json({error: 'Unknown error'}, 500);
        }
    }
});

/** Get a file in a portal. */
app.get('/portal-api/v0/:hash/:filename', function(req, res) {
    var hash = cleanHash(req.params.hash);
    var filename = cleanFilename(req.params.filename);
    var path = 'portal/'+hash+'/'+filename;
    /* Need to path absolute path, see
     * http://stackoverflow.com/questions/15557480 */
    res.sendfile(path, {root: __dirname}, function(err) {
        if (!err) {
            return;
        } else if (err.code == 'ENOENT') {
            res.json({error: 'File or portal not found'}, 404);
        } else {
            res.json({error: 'Unspecified error'}, 500);
        }
    });
});

var mkdir = function(path) {
    try {
        fs.mkdirSync(path);
    } catch (err) {
        if (err.code != 'EEXIST') {
            return {error: err.message};
            console.log(err);
        }
    }
    return {ok: true};
}

/** Add a newly uploaded file to a portal. */
function addFileToPortal(file, phrase, hash) {
    var result;

    result = mkdir('portal');
    if (result.error) {
        return result;
    }

    result = mkdir('portal/'+hash);
    if (result.error) {
        return result;
    }

    try {
        /* TODO Copy the file, delete original, to enable
         *      renaming across filesystems. */
        fs.renameSync(file.path, 'portal/'+hash+'/'+file.name);
        result = {'ok': true,
                  'phrase': phrase,
                  'filename': file.name};
    } catch (err) {
        console.log(err);
        result = {error: err.message};
    }


    console.log(result);

    return result;
}

/** Add a file to a portal. */
app.post('/portal-api/v0/:hash', function(req, res) {
    req.params.hash = cleanHash(req.params.hash);
    req.files.file.name = cleanFilename(req.files.file.name);

    var result = addFileToPortal(req.files.file, req.body.phrase,
                                 req.params.hash);

    if (req.body.redirect) {
        /* Send the result via cookie. */
        res.cookie('result', JSON.stringify(result), {path: '/'});
        res.redirect('/show', 302);
    } else {
        /* Send a JSON result. */
        res.json(json, result.error ? 500 : 201);
    }
});

/** UI: Show a portal. */
app.get('/show', function(req, res) {
    res.sendfile('show.html', {root: __dirname});
});

/** UI: Add file to portal. */
app.get('/send', function(req, res) {
    res.sendfile('send.html', {root: __dirname});
});

/** Landing page. */
app.get('/', function(req, res) {
    res.sendfile('simple.html', {root: __dirname});
});

/** Landing page email. */
app.post('/email/add', function(request, response) {
  var line = new Date() + ';'; 
  line += request.connection.remoteAddress + ';';
  line += request.body.email.replace('\n', '') + '\n';
  console.log(line);
  response.end();
});

var port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Listening on " + port);
});
