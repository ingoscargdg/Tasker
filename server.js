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

//---------------------------------------------------------------------------------------------------------------------------------
//Se declara arreglos JSON(hard code)
//---------------------------------------------------------------------------------------------------------------------------------

var EventTaskRole = {
                     'CustomerOrder_NEW':{'action':'Take_CustomerOrder','role':'sales-rep', "use" : "Create_CustomerOrder", "out":"CustomerOrder_TAKEN"},
                     'CustomerOrder_TAKEN':{'action':'Charge_CustomerOrder','role':'accounting-clerk', "use" : "BankCreditApproval","out":"CustomerOrder_CHARGED"},
                     'CustomerOrder_Alert':{'action':'Notify_CustomerAlert','role':'customerService-rep', "use" : " Detail_CustomerOrder","out":"CustomerOrder_NOTIFIED"}
                    };
var Actor_Role = [{'actor':'JuanHdzL','role':'phone-opr'},
                  {'actor':'RocioTamezJ','role':'sales-rep'},
                  {'actor':'AlbertoAzuaraM','role':'accounting-clerk'},
                  {'actor':'JoseMiguelFariasH','role':'warehouse-clerk'}];
var Event_Role = [{'id': 1,'event':'CustomerOrder_NEW','role':'phone-opr'},{'id': 2,'event':'ods','role':'sales-rep'}];
//------------------------------------------------------------------------------------------------------------------------------

var issuedTask = [];
var CustomerOrder = [];
var timeTaskTaken = [];

//---------------------------------------------------------------------------------------------------------------------------------
//funciones para manipulacion de tareas roles y actores
//---------------------------------------------------------------------------------------------------------------------------------

function ActorByRole(role){ role = role||'';
   if(role === ''){ return _.pluck(Actor_Role,'actor');}
   else{return _.pluck(_.filter(Actor_Role,{role:role}),'actor');}
};
//funcion que obtiene los roles para el actor que esta como parametro
function RolsByActor(actorName){ actorName = actorName || '';
 if (actorName ===''){return _.pluck(Actor_Role,'role');}
 else{return _.pluck(_.filter(Actor_Role,{actor:actorName}),'role');}
};
//funcion que obtiene  los eventos para el actor respecto a su rol
function events_role(actorName){return RolsByActor(actorName).map(function(items){ return _.filter(Event_Role,{role:items}); })};

//funcion que obtiene las tareas por realizar de un actor determinado
function TaskByActor(actor){ actor = actor||'';
   if(actor === ''){ return issuedTask;}
   else{return  _.filter(issuedTask,{ actor:actor });}
};
//---------------------------------------------------------------------------------------------------------------------------------
//funciones para devolver el conjunto de datos 
//---------------------------------------------------------------------------------------------------------------------------------

var Events = function (request, reply)
{
      if(request.params.actor)
      {
        if(existsElement(Actor_Role,'actor',request.params.actor) === false) //comprobar existencia de usuario
        { return reply('The actor not exists'); }
        if(request.query.format)
        {
          if (request.query.format === 'App'){return reply.file("./www/events.html");}
          else {return reply('The page was not found').code(404);}
        }
        else if(request.query.name)
        {
            { return reply(_.flatten(events_role(request.params.actor)).filter(function(e){ return (e.event).toLowerCase().indexOf(request.query.name.toLowerCase()) > -1; })); }
        }
        else 
        { 
          if(_.flatten(events_role(request.params.actor)).length === 0)
            {return reply(request.params.actor + " not events" );}
          else
            {return reply(_.flatten(events_role(request.params.actor)) );}
        }
      }
      return reply(_.flatten(events_role('')) );
};

var Tasks = function (request, reply)
{
  //console.log(request.params);
  //console.log(request.query);
      if(request.params.actor)
      {
        if(existsElement(Actor_Role,'actor',request.params.actor) === false) //comprobar existencia de usuario
        { return reply('The actor not exists'); }
        if(request.query.format)
        {
          if (request.query.format === 'App'){return reply.file("./www/tasks.html");}
          else {return reply('The page was not found').code(404);}
        }
        else if(request.query.name)
        {
            { return reply(_.flatten(TaskByActor(request.params.actor)).filter(function(e){ return (e.task).toLowerCase().indexOf(request.query.name.toLowerCase()) > -1; })); }
        }
        else 
        { 
          if(_.flatten(TaskByActor(request.params.actor)).length === 0)
            {return reply(request.params.actor + " not tasks" );}
          else
            {return reply(_.flatten(TaskByActor(request.params.actor)) );}
        }
      }
      return reply(TaskByActor(''));
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
// Funciones para guardar los datos
//---------------------------------------------------------------------------------------------------------------------------------
var CustomerOrder_TAKEN = function (request, reply) 
{
	CustomerOrder.push(request.payload);
  sendTask(request.payload.out);
  console.log(request.payload.out);
};

var getTask = function (request, reply) 
{
   console.log(request.payload);
   console.log(request.payload.id);
   //console.log(_.find(issuedTask,function(a){  return a.id === request.payload.id}) ); 
   console.log(request.payload);
};

//---------------------------------------------------------------------------------------------------------------------------------           
//Funciones generales
//---------------------------------------------------------------------------------------------------------------------------------           

//arr: array sobre el cual se busca
//item: campo sobre el cual se encuentra
//element: elemento a buscar
var existsElement = function(arr,item,element)
{
    if(_.contains(_.pluck(arr, item), element))
    { return true;}
      return false;
};

var Id_Task = 0;
var sendTask = function(task)
{   
  Id_Task ++;
  //se buscar el actor de acuerdo a su role para realizar la siguiente tarea
  var actorName = ActorByRole(EventTaskRole[task.event].role)[0];
  //La tarea que se emite al usuario especifico
  var fecha = new Date();
  var emitTask = {"id": Id_Task, 
                  "role": EventTaskRole[task.event].role, 
                  "task": EventTaskRole[task.event].action,
                  "use": EventTaskRole[task.event].use,
                  "actor": actorName,
                  "TimeCreate" : fecha,
                  "TimeTaken" : undefined,
                  "TimeFinish" : undefined};
  issuedTask.push(emitTask); //lo agregamos a las tareas existentes
  if(usernames[actorName]){ socket.broadcast.to(usernames[actorName].socket).emit('sendtask', emitTask);}
};

//---------------------------------------------------------------------------------------------------------------------------------           
server.connection({ host: '192.168.1.69', port: 8000  },{ cors: true }, { connections: { routes: { files: {relativeTo: Path.join(__dirname, 'www')} } } });

var socketio = require("socket.io")(server.listener)
var ioHandler = function (socket)
    {
        var addedUser = false;
        socket.on('sendtask',function(task)
        {
            sendTask(task);
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
//     compileMode: 'async', // global setting
//    path: Path.join(__dirname, 'www')
//});

//server.route({ method: 'GET', path: '/events',  handler: function(request, reply) { reply.file("./www/events.html");  }}); //--CAMBIAR ESTA RU
server.route({ method: 'POST', path: '/CustomerOrder_TAKEN',handler: CustomerOrder_TAKEN }  );
server.route({ method: 'POST', path: '/getTask',handler: getTask} );
server.route({ method: 'GET', path: '/events/{actor?}',handler: Events }); 
server.route({ method: 'GET', path: '/tasks/{actor?}',  handler: Tasks });

server.route({ method: 'GET', path: '/getCustomer',handler: getCustomer } );
server.route({ method: 'GET', path: '/getCustomerByID',handler: getCustomerByID } );
server.route({ method: 'GET', path: '/getProducts',handler: getProducts } );
//server.route({ method: 'GET', path: '/gettasks',handler: getTasks }  );
//server.route({ method: 'GET', path: '/getevents',handler: getEvents } );
server.route({ method: 'GET', path: '/Take_CustomerOrder',  handler: function(request, reply) { reply.file("./www/customerOrder.html");  }});
server.route({ method: 'GET', path: '/tasks/{param*}',handler: { directory:  { path: 'www', listing: false, index: true }   } });
server.route({ method: 'GET', path: '/events/{param*}',handler: { directory:  { path: 'www', listing: false, index: true }   } });
server.route({ method: 'GET', path: '/{param*}',handler: { directory:  { path: 'www', listing: false, index: true }   } });
server.start(function () {console.log("Server starter" + __dirname, server.info.uri); })

