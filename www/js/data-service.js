var url = "http://192.168.1.121:8000";

taskservice = (function ()
{var baseURL = "";
  return {findById: function(id) { return $.ajax(url + "/gettasks/" + id);},
          findByName: function(searchKey,pageroute) 
          { return $.ajax({url: url + "/" + "gettasks", data: {task: searchKey}}); } };
}());

taskevents = (function ()
{var baseURL = "";
  return {findByName: function(searchKey,username) 
         {return $.ajax({url: url + "/" + "getevents", data: {event: searchKey , username: username }});  }               };
}());
