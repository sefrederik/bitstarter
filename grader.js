#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";
var URL_DEFAULT = "http://www.stackoverflow.com";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkStr = function(str, checksfile) {
  $ = str;
  var checks = loadChecks(checksfile).sort();
  var out = {};
  for(var ii in checks) {
    var present = $(checks[ii]).length > 0;
    out[checks[ii]] = present;
  }
  return out;
};

var checkHtmlFile = function(htmlfile, checksfile, onComplete) {
    str = cheerioHtmlFile(htmlfile);
    onComplete(checkStr(str, checksfile));
};


var checkUrl = function(url, checksfile, onComplete) {
    rest.get(url).on('complete', function(result, response) {
        if (result instanceof Error) {
            console.error('Error: ' + result.message);
            return;
        }

        if (response.statusCode != 200) {
            console.error('Warning! Unexpected status code ' + response.statusCode);
        }
        
        str = cheerio.load(result);
        onComplete(checkStr(str, checksfile));
    });
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

var printCheckResult = function(checkJson) {
    var outJson = JSON.stringify(checkJson, null, 4);
    console.log(outJson);
};

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists))
        .option('-u, --url <url>', 'URL to check')
        .parse(process.argv);
    
    if (program.url && program.file) {
        console.error('Usage error: You may either specify a file or a URL');
        program.help();
    } else if (program.url) {
        checkUrl(program.url, program.checks, printCheckResult);
    } else {
        if (!program.file) {
            program.file = HTMLFILE_DEFAULT;
        }
        checkHtmlFile(program.file, program.checks, printCheckResult);
    }
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
