"use strict"
var Hapi = require("hapi");
var Path = require('path');
var server = new Hapi.Server();
var usernames = [];
var numUsers = 0;
var _ = require('lodash');
var webpack = require("webpack");
var config = require('./webpack.config.js');
var events = require('events');
var loki = require("lokijs");
var db = new loki('loki.json');
var fs=require("fs"); 
var Converter=require("csvtojson").core.Converter;
var CronJob = require('cron').CronJob;

webpack(config, function(err, stats) {  console.log(err = err||'not error');  });
//---------------------------------------------------------------------------------------------------------------------------------
//Inicializacion del server
//---------------------------------------------------------------------------------------------------------------------------------           
var i = 0;
var socketServer;
server.connection({ host: '192.168.56.1', port: 8000  },{ cors: true }, { connections: { routes: { files: {relativeTo: Path.join(__dirname, 'www')} } } });
var socketio = require("socket.io")(server.listener)
var ioHandler = function (socket)
{ socketServer = socket;
  var addedUser = false;
  socket.on('sendtask',function(task){ searchTask(task); });
  socket.on('adduser',function (username)
  { socket.username = username;;
    ++numUsers;
    addedUser = true;
    usernames.push({ 'username': username ,'socketid':socket.id, 'ipCliente': socket.client.conn.remoteAddress });
  });
}
socketio.on("connection", ioHandler);

//---------------------------------------------------------------------------------------------------------------------------------
//Se declara arreglos JSON(hard code)
//---------------------------------------------------------------------------------------------------------------------------------
var Actor_Role = db.addCollection('Actor_Role');
var Event_Role = db.addCollection('Event_Role');
var EventTaskRole = db.addCollection('EventTaskRole');
var Jobs = db.addCollection('Jobs');

function ReadFilesCsv(path,file,Collection)
{
  var csvFileName = path + file;
  var csvConverter = new Converter();
  csvConverter.on("end_parsed",function(jsonObj) {db.getCollection(Collection).insert(jsonObj);  });
  var rw = fs.createReadStream(csvFileName,{encoding: 'utf-8'}).pipe(csvConverter);
  rw.setEncoding('utf8');
}

function ReadFilesJobsCsv(path,file,Collection)
{
  var csvFileName = path + file;
  var csvConverter = new Converter();
  csvConverter.on("end_parsed",function(jsonObj) 
  { 
      new CronJob(jsonObj[0]['time'], function() 
      { 
        searchTask(jsonObj[0]);
      }, function () {/* Funcion ejecutada cuando el job se detiene */ },
      true, /* Inicia ahora el job */
      'America/Mexico_City' /* zona. */
    );
  });
  fs.createReadStream(csvFileName).pipe(csvConverter);
}

ReadFilesCsv(__dirname + '/sys/def/','EventTaskRole.csv','EventTaskRole');
ReadFilesCsv(__dirname + '/sys/def/','ActorRole.csv','Actor_Role');
ReadFilesCsv(__dirname + '/sys/def/etc/','Event_Role.csv','Event_Role');
ReadFilesJobsCsv(__dirname + '/sys/def/','Jobs.csv','Jobs');

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
var issuedTask = db.addCollection('issuedTask');
var CustomerOrder = db.addCollection('CustomerOrder');
//---------------------------------------------------------------------------------------------------------------------------------
//funciones para manipulacion de tareas roles y actores
//---------------------------------------------------------------------------------------------------------------------------------
function ActorByRole(role)
{ var data = Actor_Role.data;
  role = role||'';
  if(role === ''){ return _.pluck(data,'actor');}
  else{return _.pluck(_.filter(data,{role:role}),'actor');}
};

//funcion que obtiene los roles para el actor que esta como parametro
function RolsByActor(actorName)
{ var data = Actor_Role.data;
  actorName = actorName || '';
  if (actorName ===''){ return _.pluck(data,'role'); }
  else{return _.pluck(_.filter(data,{actor:actorName}),'role');}
};

//funcion que obtiene  los eventos para el actor respecto a su rol
function events_role(actorName){return RolsByActor(actorName).map(function(items){ return Event_Role.find({role:items}); })};

//funcion que obtiene las tareas por realizar de un actor determinado
function TaskByActor(actor)
{ var data = issuedTask.data;
   actor = actor||'';
   if(actor === ''){ return data;}
   else{return  _.filter(data,{ actor:actor });}
};
//---------------------------------------------------------------------------------------------------------------------------------
//funciones para devolver el conjunto de datos 
//---------------------------------------------------------------------------------------------------------------------------------
var Events = function (request, reply)
{
      var data = Actor_Role.data;
      if(request.params.actor)
      {
        if(existsElement(data,'actor',request.params.actor) === false) //comprobar existencia de usuario
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
      var data = Actor_Role.data;
      if(request.params.actor)
      {
        if(existsElement(data,'actor',request.params.actor) === false) //comprobar existencia de usuario
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
 var id = parseInt(request.payload.id);
 var updateTask = issuedTask.find({'id':id});
 updateTask[0].TimeTaken = fecha;
 issuedTask.update(updateTask);
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
var sendTask = function(event)
{
    Id_Task ++;
    var fecha = new Date();
    var actorName;
    if(existsElement(Actor_Role.data,'actor',event.who) === true){ actorName = event.who;}
    actorName = actorName || ActorByRole(event.who)[0];
    
    var emitTask = { 'id': Id_Task,'event':event.event ,'in':event['in'], 'task': event.action + '_' + event.event,'use': event.use,
                     'what':event.what, 'how':event.how,'out':event.out,'actor': actorName,
                     'TimeCreate' : fecha,'TimeTaken' : undefined,'TimeFinish' : undefined};

    issuedTask.insert(emitTask);      
    //_.map(_.filter(usernames,{'username': actorName}), function(socket){console.log(socketServer.server.sockets.connected[socket.socketid]); console.log('------------------');});
    console.log('nuevo registro');
    console.log(socketServer.nsp.sockets);
    //console.log(socketServer);
    _.map(_.filter(usernames,{'username': actorName}), function(socket){socketServer.in(socket.socketid).emit('sendtask', emitTask)});
    //_.map(_.filter(usernames,{'username': actorName}), function(socket){socketServer.broadcast.to(socket.socketid).emit('sendtask', emitTask)});
}

var searchTask = function(event)
{
  var fecha = new Date();
  var data = EventTaskRole.data;
  var eventIn;
  if(event.out) { eventIn  = event.out; }  
  eventIn = eventIn || event['in'];
   _.map(_.filter(data,{ 'event': event.event, 'in': eventIn }), sendTask);
};

var CustomerOrder_TAKEN = function (request, reply) 
{
  var fecha = new Date();
  var id = parseInt(request.payload.id);
  var updateTask = issuedTask.find({'id':id});
  updateTask[0].TimeFinish = fecha;
  issuedTask.update(updateTask);
  CustomerOrder.insert(request.payload);
  searchTask({'event':updateTask[0].event, 'out': updateTask[0].out});
};

//--------------------------------------------º-------------------------------------------------------------------------------------           
//Router
//---------------------------------------------------------------------------------------------------------------------------------           
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
server.start(function () { console.log("Server starter " + __dirname, server.info.uri); })
