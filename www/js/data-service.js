//var url = "http://192.168.1.69:8000";
var baseURL = "";

taskservice = (function ()
{var baseURL = "";
  return {findByName: function(searchKey,username) 
          	{ return $.ajax({url: baseURL + "/" + "tasks/" + username , data: {name: searchKey}}); },
          getTask: function(data) 
    	  	{ return $.ajax({url: baseURL + "/" + "getTask",  type: "POST", data: data }); 
    	  	}
      	 };
}());

eventsService = (function ()
{var baseURL = "";
  return {findByName: function(searchKey,username) 
  	{
      console.log(baseURL);
  		return $.ajax({url: baseURL + "/" + "events/" + username, data: {name: searchKey }});  } 
 	};
}());
