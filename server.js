"use strict"
var Hapi = require("hapi")
var Path = require('path');
var server = new Hapi.Server();
var usernames = {};
var numUsers = 0;
var _ = require('lodash');
var webpack = require("webpack");
var config = require('./webpack.config.js');
var mssql = require('mssql');  
var config ={ user: 'sa', password: 'N0bba21',database: 'bd_mercantil_erp_20141216',server: 'ZAFIRO\\SQL2012' };// You can use 'localhost\\instance' to connect to named instance 
    		
var connection = new mssql.Connection(config);

webpack(config, function(err, stats) {
    console.log(err = err||'not error');
});

//Se declara arreglos JSON(hard code)
var EventTaskRole = {
                     'CustomerOrder_New':{'action':'Take_CustomerOrder','role':'sales-rep', "use" : "Create_CustomerOrder"},
                     'CustomerOrder_Alert':{'action':'Notify_CustomerAlert','role':'customerService-rep', "use" : " Detail_CustomerOrder"}
                    };
var Actor_Role = [{'actor':'JuanHdzL','role':'phone-opr'},
                  {'actor':'RocioTamezJ','role':'sales-rep'},
                  {'actor':'AlbertoAzuaraM','role':'accounting-clerk'},
                  {'actor':'JoseMiguelFariasH','role':'warehouse-clerk'}];
var Event_Role = [{'id': 1,'event':'CustomerOrder_New','role':'phone-opr'}];
//------------------------------------------------------------------------------------------------------------------------------

var issuedTask = [];
var CustomerOrder = [];

//funcion para obtener el actor o actores a partir del rol especifico
function actor(role){ role = role||'';
   if(role === ''){ return _.pluck(Actor_Role,'actor');}
   else{return _.pluck(_.filter(Actor_Role,{role:role}),'actor');}
};
//funcion que obtiene un arreglo de strings con los roles para el actor que esta como parametro
function roles(actorName){ actorName = actorName || '';
 if (actorName ===''){return _.pluck(Actor_Role,'role');}
 else{return _.pluck(_.filter(Actor_Role,{actor:actorName}),'role');}
};
//funcion que obtiene un arreglo de los eventos para el actor respecto a su rol
function events_role(actorName){return roles(actorName).map(function(items){ return _.filter(Event_Role,{role:items}) })};

//---------------------------------------------------------------------------------------------------------------------------------
//funciones para devolver el conjunto de datos 
//---------------------------------------------------------------------------------------------------------------------------------

var getEvents = function (request, reply)
{
    var event = request.query.event;
    var username = request.query.username;
    var resultEvents = _.flatten(events_role(request.query.username));
    if (event)
    {reply(resultEvents.filter(function(e)
        { return (e.event).toLowerCase().indexOf(event.toLowerCase()) > -1; }));
    }
    else { return reply(resultEvents); }
};

var getEventsBy = function (request, reply)
{
    console.log(request.query);
    if(request.params.actor)
      { 
          if(request.query.format)
            { if (request.query.format === 'App'){reply.file("./www/events.html")}}
          return reply(_.flatten(events_role(request.params.actor)) );
      }
      return reply(_.flatten(events_role('')) );
};

var getTasks = function (request, reply)
{     var task = request.query.task;
      if (task)
      { reply(issuedTask.filter(function(e)
        { return (e.task).toLowerCase().indexOf(task.toLowerCase()) > -1; }));
      }
      else { return reply(issuedTask); }
};

var getProducts = function (request, reply)
{ var name = request.query.name;
      name = name || '';
  connection.connect(function(err_connect)
    {  var request = new mssql.Request(connection);
           request.input('name', mssql.VarChar(50), name);
           request.execute('erDm_ArticulosGrs_Test', function(err_sp, recordsets) 
           {reply(recordsets[0]);});  
    }); 
};

var getCustomer = function(request, reply)
{
	var name = request.query.name;
    name = name || '';

	connection.connect(function(err_connect)
    {  var request = new mssql.Request(connection);
    	var query = 'select TOP 10 ClienteID ,Nombre,Direccion,Colonia,Ciudad,Cp,Rfc,Email from erCa_Clientes where EmpresaID = 1';
           request.query(query, function(err_sp, recordsets) 
           {
           	if (name)
           	{ reply(recordsets.filter(function(e)
		    	{ return (e.Nombre).toLowerCase().indexOf(name.toLowerCase()) > -1; }));
			}
		    else { return reply(recordsets); }
           });  
    });  
}

var getCustomerByID = function(request, reply)
{
	var id = request.query.id;
	connection.connect(function(err_connect)
    {  var request = new mssql.Request(connection);
    	var query = 'select TOP 1 ClienteID ,Nombre,Direccion,Colonia,Ciudad,Cp,Rfc,Email from erCa_Clientes where EmpresaID = 1 and clienteid = ' + id;
           request.query(query, function(err_sp, recordsets) 
           {
           	return reply(recordsets);
           });  
    });  
}

//---------------------------------------------------------------------------------------------------------------------------------
// FUNCIONES PARA GUARFAR DATOS
//---------------------------------------------------------------------------------------------------------------------------------
var OrderID = 0;
var CustomerOrder_TAKEN = function (request, reply) 
{
	OrderID = OrderID + 1;
	ID = {"OrderID" : OrderID};
	CustomerOrder = request.payload;
	//CustomerOrder.push(request.payload);
	//console.log(JSON.stringify(_.merge((ID),CustomerOrder)));
};

//---------------------------------------------------------------------------------------------------------------------------------           
server.connection({ host: '192.168.1.121', port: 8000  },{ cors: true }, { connections: { routes: { files: {relativeTo: Path.join(__dirname, 'www')} } } });

var Id_Task = 0;
var socketio = require("socket.io")(server.listener)
var ioHandler = function (socket)
    {
        var addedUser = false;
        socket.on('sendtask',function(task)
        {
        //aqui debe ir la busqueda del actor de acuerdo a su role para realizar la siguiente tarea
           Id_Task ++;
           //apartir del evento que recibe node, se busca en Evento-Tarea-Role
           var eventReceived = task.event;
           //La tarea que se emite al usuario especifico
           var emitTask = {"id": Id_Task, 
                           "role": EventTaskRole[eventReceived].role, 
                           "task": EventTaskRole[eventReceived].action};
           issuedTask.push(emitTask); //lo agregamos a las tareas existentes
           var actorName = actor(EventTaskRole[eventReceived].role)[0];
           if(usernames[actorName])
            { socket.broadcast.to(usernames[actorName].socket).emit('sendtask', emitTask);}
        });

        socket.on('adduser',function (username)
        {
        //if(usernames[username]){ return;}
            socket.username = username;
            usernames[username] = username;
            ++numUsers;
            addedUser = true;
            usernames[username] = {"socket": socket.id , ipCliente: socket.client.conn.remoteAddress };
        });
    }
    socketio.on("connection", ioHandler);

//server.views({
//    engines: {
//        html: require('handlebars')
//    },
//    path: Path.join(__dirname, 'www/views')
//});
server.route({ method: 'GET', path: '/events',  handler: function(request, reply) { reply.file("./www/events.html");  }}); //--CAMBIAR ESTA RU
server.route({ method: 'POST', path: '/CustomerOrder_TAKEN',handler: CustomerOrder_TAKEN }  );
//server.route({ method: 'GET', path: '/events/{actor?}',handler: getEventsBy }); //--CAMBIAR ESTA RU

server.route({ method: 'GET', path: '/getCustomer',handler: getCustomer } );
server.route({ method: 'GET', path: '/getCustomerByID',handler: getCustomerByID } );
server.route({ method: 'GET', path: '/getProducts',handler: getProducts } );
server.route({ method: 'GET', path: '/gettasks',handler: getTasks }  );
server.route({ method: 'GET', path: '/getevents',handler: getEvents } );
server.route({ method: 'GET', path: '/styles/{param*}', handler: {  directory: { path: './www/styles', listing: false, index: true }  } });
server.route({ method: 'GET', path: '/{param*}',handler: { directory:  { path: './www', listing: false, index: true }   } });
server.route({ method: 'GET', path: '/tasks',  handler: function(request, reply) { reply.file("./www/tasks.html");  }});
server.route({ method: 'GET', path: '/Take_CustomerOrder',  handler: function(request, reply) { reply.file("./www/customerOrder.html");  }});
server.start(function () {console.log("Server starter" + __dirname, server.info.uri); })

