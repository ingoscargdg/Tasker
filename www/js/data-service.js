var url = "http://192.168.1.121:8000";

taskservice = (function ()
{var baseURL = "";
  return {findById: function(id) { return $.ajax(url + "/tasks/" + id);},
          findByName: function(searchKey,pageroute) 
          	{ return $.ajax({url: url + "/" + "tasks", data: {task: searchKey}}); },
          getTask: function(data) 
    	  	{ return $.ajax({url: url + "/" + "getTask",  type: "POST", data: data }); 
    	  	}
      	 };
}());

eventsService = (function ()
{var baseURL = "";
  return {findByName: function(searchKey,username) 
  	{
  		return $.ajax({url: url + "/" + "events", data: {event: searchKey , username: username }});  } 
 	};
}());