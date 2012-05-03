
/*
定义使用变量
	*/
var webseverport = 8000;
var mongoserveradd = '127.0.0.1';

var webSocketServer = require('websocket').server;
var http = require('http');

var mongo = require('mongodb');
var db = new mongo.Db('chats',new mongo.Server(mongoserveradd,27017,function(){}),{});

var dictionary = require('./Dictionary.js'), clients = new dictionary();

var cliendid = 1;
	  
/*
open/close database
 */
db.open(function(err, client){
	if(err) throw err;
	client.createCollection("chats", function(err, col) { if(err) throw err;});
});

process.on('exit', function () {
  	process.nextTick(function () {
   		db.close(true, function(){});
 	});
});

/*
创建监听端口
 */
var server = http.createServer(function(request, response) {
    
});
server.listen(webseverport, function() {
    console.log((new Date()) + " Server is listening on port " + webseverport);
});

var wsServer = new webSocketServer({httpServer: server});

/* 
 */
function htmlEntities(str) {
   return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/*
main
  */
  
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
    var connection = request.accept(null, request.origin);
	
	var sid = cliendid;
	connection.sid = cliendid;
	cliendid++;
	
	var init = false;
	var fromid, toid;

    console.log((new Date()) + ' Connection accepted.');

    connection.on('message', function(message) {
        console.log('input',message);
		if (message.type === 'utf8') {
			if(init == false) {
				var cstr = message.utf8Data.split('&');
				fromid = cstr[0];
				toid = cstr[1];
			//*	
				var old = clients.fetch(fromid);
				if(old) {
					clients.remove(fromid);
					clients.store(fromid,connection);
					/*
					old.conn = null;
					old.conn = connection;
					old.toid = null;
					old.toid = toid;
					
					//*/
					
					console.log("re connect!!");
				} else {
					
					//*/
					//var obj = {conn:connection,fid:fromid,tid:toid};
					clients.store(fromid,connection);
					
					console.log("new connect!!");
				}
				
				db.collection('chats', function (err, collection) {
						collection.find({$or:[{'fid':fromid},{'fid':toid}]}, function (err1, cursor) {
							cursor.toArray(function(err, docs) {
								if (docs.length > 0) {
									connection.sendUTF(JSON.stringify( { type: 'history', data: docs} ));
								}
							});
						});
				});
				
				var otherc = clients.fetch(toid);

				if(otherc) {
					connection.sendUTF(JSON.stringify( { type: 'online', data: {y:1}} ));
					otherc.sendUTF(JSON.stringify( { type: 'online', data: {y:1}} ));
				} else {
					connection.sendUTF(JSON.stringify( { type: 'online', data: {y:2}} ));
				}
				
				init = true;
			} else {
				console.log((new Date()) + ' Received Message from '+ message.utf8Data);
                
                var obj = {
                    time: (new Date()).getTime(),
                    text: htmlEntities(message.utf8Data),
                    fid: fromid,
                    tid: toid
                };
				
				db.collection('chats', function (err, col) {
					col.insert(obj,function() {console.log('insert:%s||%s||%s', fromid,toid,obj.text);});
					connection.sendUTF(JSON.stringify( { type: 'message', data:obj} ));
				});
				
				//console.log('has key:' + clients.hasKey(toid));
				
				var otherc = clients.fetch(toid);

				if(otherc) {
					var json = JSON.stringify({ type:'message', data: obj });
                	otherc.sendUTF(json);
					connection.sendUTF(JSON.stringify( { type: 'online', data: {y:1}} ));
					otherc.sendUTF(JSON.stringify( { type: 'online', data: {y:1}} ));
				} else {
					connection.sendUTF(JSON.stringify( { type: 'online', data: {y:2}} ));
				}
			}
		}
    });

    connection.on('close', function(connection) {
		console.log("before close:"+clients.fetch(fromid).sid+' n:'+sid);
		if(clients.fetch(fromid).sid == sid) {
			console.log("close connection!");
			clients.remove(fromid);
			var otherc = clients.fetch(toid);
			if(otherc) {
				otherc.sendUTF(JSON.stringify( { type: 'online', data: {y:2}} ));
			}
		}
    });

});