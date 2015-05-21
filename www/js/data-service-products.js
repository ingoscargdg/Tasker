var url = "http://192.168.1.121:8000";


productsService = (function ()
{
        var baseURL = "";
        return {
                 findByName: function(searchKey) {return $.ajax({url: url + "/" + "getProducts", data: {name: searchKey}}); }
               };
}());


customerService = (function ()
{
        var baseURL = "";
        return {
        			//findById: function(id) { return $.ajax(url + "/getCustomerByID/" + id);},
        		 findById: function(id) { return $.ajax({ url: url + "/getCustomerByID" , data: {id:id} }); },

                 findByName: function(searchKey) {return $.ajax({url: url + "/" + "getCustomer", data: {name: searchKey}}); }
               };
}());