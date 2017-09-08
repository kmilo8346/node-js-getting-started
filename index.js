var express = require('express');
var bodyParser = require('body-parser');
var url = require('url');
var https = require('https');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
    extended: false
}));
// parse application/json
app.use(bodyParser.json());

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});


// send to slack

function getSlackHookRequestOptions()
{
    var hookUri     =   url.parse("https://hooks.slack.com/services/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");
    return {
        host:       hookUri.hostname,
        port:       hookUri.port,
        path:       hookUri.path,
        method:     'POST',
        headers:    { 'Content-Type': 'application/json' }
    };
}

function convertToSlackMessage(body)
{
    var parsedBody  = body || {
        status: 'failed',
        complete: false
    };
    var success     = (parsedBody.status === 'success' && parsedBody.complete);
    return JSON.stringify({
        username:   getSlackUserName(parsedBody, success),
        icon_emoji: success ? ':shipit:' : ':warning:',
        text:       getSlackText(parsedBody),
        channel:    '#apppechera'
    });
}

function getSlackUserName(parsedBody, success)
{
    return (
        (success ? 'Deploy exitoso en: ': 'Deploy fallido en: ') +
        ' ' +
        (parsedBody.siteName || 'unknown')
    );
}

function getSlackText(parsedBody)
{
    var hostName = parsedBody.hostName;
    var id = parsedBody.id;
    return (
        'Ejecutado por : ' +
        (parsedBody.author || 'desconocido') +
        ' : ' +
        (parsedBody.authorEmail || 'email desconocido') +
        '\r\n' +
        'Cambios:\r\n' +
        '```' +
        (parsedBody.message || 'No existen mensajes de cambios') +
        '```' +
        '\r\n' +
        'Deploy empezó a las ' + parsedBody.startTime +
        ' y finalizó a las ' + parsedBody.endTime +
        '\r\n' +
        (hostName ? '<https://' + hostName + '|' + hostName + '> ' : '') +
        '\r\n' +
        (id ? 'Id de deploy: ' + parsedBody.id + '\r\n' : '')

    );
}

app.post('/send-slack', function(req, resp) {
    var error           = false;
    var slackMessage    = convertToSlackMessage(req.body);
    var request             = https.request(getSlackHookRequestOptions());

    request.on('error', function(e) {
        console.error(e);
        error = true;
        resp.send('BAD');
    });

    request.on('close', function() {
        if (error) {
            resp.send('BAD');
        } else {
            resp.send('OK');
        }
    } );

    request.write(slackMessage);
    request.end();
});
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
