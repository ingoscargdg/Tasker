//var url = "http://192.168.1.69:8000";
productsService = (function ()
{
        var baseURL = "";
        return {
                 findByName: function(searchKey) {return $.ajax({url: baseURL + "/" + "getProducts", data: {name: searchKey}}); }
               };
}());


customerService = (function ()
{
        var baseURL = "";
        return {
        			//findById: function(id) { return $.ajax(url + "/getCustomerByID/" + id);},
        		 findById: function(id) { return $.ajax({ url: baseURL + "/getCustomerByID" , data: {id:id} }); },

                 findByName: function(searchKey) {return $.ajax({url: baseURL + "/" + "getCustomer", data: {name: searchKey}}); }
               };
}());