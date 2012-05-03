function GetReq(){
		var url = location.search;
		var theRequest = new Object();
		if (url.indexOf("?") != -1) {
			var str = url.substr(1);
			strs = str.split("&");
			for(var i = 0; i < strs.length; i ++) {
				theRequest[strs[i].split("=")[0]]=unescape(strs[i].split("=")[1]);
			}
		}
		return theRequest;
}

$(function () {

    var content = $('#content');
    var input = $('#input');
    var status = $('#status');
	var online = $('#cstat');
	var ga = GetReq();

    window.WebSocket = window.WebSocket || window.MozWebSocket;

    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t '
                                    + 'support WebSockets.'} ));
        input.hide();
        $('span').hide();
        return;
    }

    var connection = new WebSocket('ws://www.ga.com:8000');

    connection.onopen = function () {
        input.removeAttr('disabled');
        status.text('say:');
		connection.send(''+ga['fid']+'&'+ga['tid']+'');
    };

    connection.onerror = function (error) {
        content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
                                    + 'connection or the server is down.</p>' } ));
    };

    // most important part - incoming messages
    connection.onmessage = function (message) {
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }
		
		console.log('json:',message.data);

        if (json.type === 'history') {
            for (var i=0; i < json.data.length; i++) {
                addMessage(json.data[i].fid, json.data[i].text,
                           json.data[i].tid, new Date(json.data[i].time));
            }
        } else if (json.type === 'message') {
            input.removeAttr('disabled');
            addMessage(json.data.fid, json.data.text,
                           json.data.tid, new Date(json.data.time));
        }  else if (json.type === 'online') {
			if(json.data.y == 1) {
				online.html('<span style="color:#00F;  font-size:18px;">在线</span>');
			} else {
				online.html("不在线");
			}
        } else {
            console.log('Hmm..., I\'ve never seen JSON like this: ', json);
        }
    };

    /**
     * Send mesage when user presses Enter key
     */
    input.keydown(function(e) {
        if (e.keyCode === 13) {
            var msg = $(this).val();
            if (!msg) {
                return;
            }

            connection.send(msg);
            $(this).val('');
            input.attr('disabled', 'disabled');
        }
    });

    setInterval(function() {
        if (connection.readyState !== 1) {
            status.text('Error');
            input.attr('disabled', 'disabled').val('Unable to comminucate '
                                                 + 'with the WebSocket server.');
			online.html('<span style="color:#F00;  font-size:18px;">您已经离线！</span>');
        }
    }, 3000);

    function addMessage(fid, message, tid, dt) {
        content.append('<p><span style="color:#F00;">' + fid + '</span>	|	<span style="color:#00F;">'+tid+'</span> @ ' +
             + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
             + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
             + ': ' + message + '</p>');
    }
});