var https                   = require('https');
var url                     = require('url');
var slackHookRequestOptions = getSlackHookRequestOptions();
module.exports.sendToSlack  = sendToSlack;

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

function sendToSlack(parsedRequest, callback)
{
        if (!parsedRequest || (parsedRequest.body||'').trim()=='') {
            callback(true);
            return;
        }

        var error           = false;
        var slackMessage    = convertToSlackMessage(parsedRequest.body, parsedRequest.channel);
        var req             = https.request(slackHookRequestOptions);

        req.on('error', function(e) {
            console.error(e);
            error = true;
        });

        req.on('close', function() { callback(error); } );

        req.write(slackMessage);
        req.end();
}

function convertToSlackMessage(body, channel)
{
    var parsedBody  = trParseBody(body);
    var success     = (parsedBody.status=='success' && parsedBody.complete);
    return JSON.stringify({
        username:   getSlackUserName(parsedBody, success),
        icon_emoji: success ? ':shipit:' : ':warning:',
        text:       getSlackText(parsedBody),
        channel:    channel || '#apppechera'
    });
}

function trParseBody(body)
{
    try
    {
        return JSON.parse(body) || {
            status: 'failed',
            complete: false
        };
    } catch(err) {
        console.error(err);
        return {
            status: err,
            complete: false
        };
    }
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