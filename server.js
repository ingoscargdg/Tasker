"use strict"
var Hapi = require("hapi");
var Path = require('path');
var server = new Hapi.Server();
var usernames = {};
var numUsers = 0;
var _ = require('lodash');
var webpack = require("webpack");
var config = require('./webpack.config.js');
var events = require('events');
var loki = require("lokijs");
var db = new loki('loki.json');

webpack(config, function(err, stats) {
    console.log(err = err||'not error');
});

//---------------------------------------------------------------------------------------------------------------------------------
//Inicializacion del server
//---------------------------------------------------------------------------------------------------------------------------------           
var i = 0;
var socketServer;
server.connection({ host: '192.168.1.107', port: 8000  },{ cors: true }, { connections: { routes: { files: {relativeTo: Path.join(__dirname, 'www')} } } });
var serverEmitter = new events.EventEmitter();
var socketio = require("socket.io")(server.listener)
var ioHandler = function (socket)
    {   socketServer = socket;
        var addedUser = false;
        socket.on('sendtask',function(task)
        {   sendTask(socket,task);   });

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

//---------------------------------------------------------------------------------------------------------------------------------
//Se declara arreglos JSON(hard code)
//---------------------------------------------------------------------------------------------------------------------------------

var EventTaskRole = {'CustomerOrder_NEW':{'action':'Take_CustomerOrder','what':'Tomar orden del cliente' ,'role':'sales-rep', 'use' : 'reate_CustomerOrder', 'out':'CustomerOrder_TAKEN','how':''},
                     'CustomerOrder_TAKEN':{'action':'Charge_CustomerOrder','what':'Cargar orden del cliente','role':'accounting-clerk', 'use' : 'BankCreditApproval','out':'CustomerOrder_CHARGED','how':''},
                     'CustomerOrder_Alert':{'action':'Notify_CustomerAlert','what':'Notificar credito del cliente','role':'customerService-rep', 'use' : 'Detail_CustomerOrder','out':'CustomerOrder_NOTIFIED','how':''}
                    };

var Actor_Role    =[{'actor':'JuanHdzL','role':'phone-opr'},
                    {'actor':'RocioTamezJ','role':'sales-rep'},
                    {'actor':'RocioTamezJ','role':'accounting-clerk'},
                    {'actor':'JoseMiguelFariasH','role':'warehouse-clerk'}
                    ];

var Event_Role = db.addCollection('Event_Role');
Event_Role.insert({id: 1 , event: 'CustomerOrder_NEW', role:'phone-opr'});

var Products = db.addCollection('Products');
    Products.insert({ArticuloID:1, ClaveArticulo:'009MYZAZP600000012',Descripcion:'ZOCLO PZA 2.40M CHOC',CodigoBarras:'009MYZAZP600000012',Precio:25.0});
    Products.insert({ArticuloID:2, ClaveArticulo:'021TRDLM"SC0000005',Descripcion:'TB ROMANA DE LUXE MERMET "M" SCREEN 5% WHITE CANARY',CodigoBarras:'021TRDLM"SC0000005',Precio:25.0});
    Products.insert({ArticuloID:3, ClaveArticulo:'012KLIN.6RB0000001',Descripcion:'TAP KL BAS Y BOR RED .65X.45 AZUL MARINO',CodigoBarras:'012KLIN.6RB0000001',Precio:25.0});
    Products.insert({ArticuloID:4, ClaveArticulo:'001VINYTC310450049',Descripcion:'LOS THRUCHIP 3.1MM L.V I575',CodigoBarras:'001VINYTC310450049',Precio:25.0});
    Products.insert({ArticuloID:5, ClaveArticulo:'001DURAS3(20120023',Descripcion:'LOS DUR SALTO 518',CodigoBarras:'001DURAS3(20120023',Precio:25.0});
    Products.insert({ArticuloID:6, ClaveArticulo:'001IXCAWT1.0450008',Descripcion:'LOS IBERI WINNER 120103',CodigoBarras:'001IXCAWT1.0450008',Precio:25.0});
    Products.insert({ArticuloID:7, ClaveArticulo:'001FOTIDU3.0360001',Descripcion:'LOS NUVO DUELA HZ074-1',CodigoBarras:'001FOTIDU3.0360001',Precio:25.0});
    Products.insert({ArticuloID:8, ClaveArticulo:'000DHETERN0000005',Descripcion:'ALF D.H. ETERNITY 510',CodigoBarras:'000DHETERN0000005',Precio:25.0});

var Customer = db.addCollection('Customer');
    Customer.insert({ClienteID:'1', Nombre:'ARMINDA VAZQUEZ  CAYETANO',Direccion:'AV DE LAS ROSAS',NoExterior:'67',NoInterior:'1',Colonia:'CIUDAD JARDIN',Ciudad:'COYOACAN',Estado:'COYOACAN',Cp:'85000', Rfc:'VACA730513IQ2', Email:''});
    Customer.insert({ClienteID:'2', Nombre:'MIGUEL ANGEL  ORTIZ DELGADO',Direccion:'AV DE LAS ROSAS',NoExterior:'25',NoInterior:'2',Colonia:'',Ciudad:'EL RODEO',Estado:'IZTACALCO',Cp:'89000', Rfc:'EBU050302N73', Email:''});
    Customer.insert({ClienteID:'6', Nombre:'ALEJANDRO  HIDALGO ESPINOSA',Direccion:'AV DE LAS ROSAS',NoExterior:'10',NoInterior:'3',Colonia:'',Ciudad:'FRACC. JARDINES DE SAN MATEO',Estado:'IZTACALCO',Cp:'85000', Rfc:'OIDM620617EF7', Email:''});
//------------------------------------------------------------------------------------------------------------------------------
var issuedTask = [];
var CustomerOrder = [];
var timeTaskTaken = [];

//---------------------------------------------------------------------------------------------------------------------------------
//funciones para manipulacion de tareas roles y actores
//---------------------------------------------------------------------------------------------------------------------------------
function ActorByRole(role)
{ role = role||'';
  if(role === ''){ return _.pluck(Actor_Role,'actor');}
  else{return _.pluck(_.filter(Actor_Role,{role:role}),'actor');}
};

//funcion que obtiene los roles para el actor que esta como parametro
function RolsByActor(actorName)
{ actorName = actorName || '';
  if (actorName ===''){ return _.pluck(Actor_Role,'role'); }
  else{return _.pluck(_.filter(Actor_Role,{actor:actorName}),'role');}
};

//funcion que obtiene  los eventos para el actor respecto a su rol
function events_role(actorName){return RolsByActor(actorName).map(function(items){ return Event_Role.find({role:items}); })};

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
         // if(_.flatten(events_role(request.params.actor)).length === 0)
         //   {return reply(request.params.actor + " not events" );}
         // else
         //   {return reply(_.flatten(events_role(request.params.actor)) );}
         return reply(_.flatten(events_role(request.params.actor)) );
        }
      }
      return reply(_.flatten(events_role('')) );
};

var Tasks = function (request, reply)
{
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
          //if(_.flatten(TaskByActor(request.params.actor)).length === 0)
          //  {return reply(request.params.actor + " not tasks" );}
          //else
            //{return reply(_.flatten(TaskByActor(request.params.actor)) );}
          return reply(_.flatten(TaskByActor(request.params.actor)) );
        }
      }
      return reply(TaskByActor(''));
};

var getProducts = function (request, reply)
{ var name = request.query.name;
      name = name || '';
      reply(Products.find({ClaveArticulo:name}));
};

var getCustomer = function(request, reply)
{
	var name = request.query.name;
    name = name || '';
    reply(Customer.find({Nombre:name}));
}

var getCustomerByID = function(request, reply)
{
  var id = request.query.id;
  reply(Customer.find({ClienteID:id}));
}

//---------------------------------------------------------------------------------------------------------------------------------
// Funciones para guardar los datos
//---------------------------------------------------------------------------------------------------------------------------------
//Establece la hora en que se toma la tarea de acuerdo al ID de la instancia de la tarea
var getTask = function (request, reply) 
{
 var fecha = new Date();
 _.find(issuedTask,function(task){ return task.id == request.payload.id; })["TimeTaken"] = fecha;
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
var sendTask = function(socket,task)
{   
  Id_Task ++;
  //se buscar el actor de acuerdo a su role para realizar la siguiente tarea
  var actorName = ActorByRole(EventTaskRole[task.event].role)[0];
  //La tarea que se emite al usuario especifico
  var fecha = new Date();
  var emitTask = {'id': Id_Task, 
                  'role': EventTaskRole[task.event].role, 
                  'task': EventTaskRole[task.event].action,
                  'use': EventTaskRole[task.event].use,
                  'what':EventTaskRole[task.event].what,
                  'how':EventTaskRole[task.event].how,
                  'out':EventTaskRole[task.event].out,
                  'actor': actorName,
                  'TimeCreate' : fecha,
                  'TimeTaken' : undefined,
                  'TimeFinish' : undefined};
  issuedTask.push(emitTask); //lo agregamos a las tareas existentes
  if(usernames[actorName]){ socket.broadcast.to(usernames[actorName].socket).emit('sendtask', emitTask);} 
  //if(usernames["RocioTamezJ"]){ socket.broadcast.to(usernames["RocioTamezJ"].socket).emit('sendtask', emitTask);}
};

var CustomerOrder_TAKEN = function (request, reply) 
{
  var fecha = new Date();
  _.find(issuedTask,function(task){ return task.id == request.payload.id; })["TimeFinish"] = fecha;
  CustomerOrder.push(request.payload);
  var eventOut = {"event":_.find(issuedTask,function(task){ return task.id == request.payload.id; })['out']};
  sendTask(socketServer,eventOut);
};
//--------------------------------------------º-------------------------------------------------------------------------------------           
//Router
//---------------------------------------------------------------------------------------------------------------------------------           
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
//---------------------------------------------------------------------------------------------------------------------------------           
//Inicializacion del server
//---------------------------------------------------------------------------------------------------------------------------------           
server.start(function () { console.log("Server starter" + __dirname, server.info.uri); })
