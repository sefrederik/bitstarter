var express = require('express');
var fs = require('fs');

var app = express.createServer();
app.use(express.logger());
app.use(express.bodyParser());
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

/** Add a file to a portal. */
app.post('/portal-api/v0/:hash', function(req, res) {
    var hash = cleanHash(req.params.hash);
    var filename = cleanFilename(req.files.file.name);
    var path = 'portal/'+hash+'/';
    try {
        fs.mkdirSync('portal');
        fs.mkdirSync(path);
    } catch (err) {
        console.log(err);
    }

    var json = {};
    var code = 500;
    try {
        fs.renameSync(req.files.file.path, path+filename);
        json = {ok: true, 'portal-phrase': req.body.portal_phrase};
        code = 200;
    } catch (err) {
        console.log(err);
        json = {error: 'Unspecified error'};
        code = 500;
    }

    if (req.body.redirect) {
        var params = '';
        for (var key in json) {
            params += encodeURIComponent(key) + '=' +
                      encodeURIComponent(json[key]) + '&';
        }
        res.redirect('/show?' + params, 302);
    } else {
        res.json(json, code);
    }
});

/** UI: Show a portal. */
app.get('/show', function(req, res) {
    res.send(fs.readFileSync('show.html').toString());
});

/** UI: Add file to portal. */
app.get('/send', function(req, res) {
    res.setHeader('content-type', 'text/html');
    res.send(fs.readFileSync('send.html').toString());
});

/** Landing page. */
app.get('/', function(request, response) {
  buf = fs.readFileSync('simple.html');
  response.send(buf.toString());
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
