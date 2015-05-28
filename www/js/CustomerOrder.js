/** @jsx React.DOM */
Object.assign = Object.assign || require('object.assign');
var FixedDataTable = require('fixed-data-table');
var React = require("react");
require('fixed-data-table/dist/fixed-data-table.css');
var Select = require('react-select');
var Table = FixedDataTable.Table;
var Column = FixedDataTable.Column;

var RemoteSelectField = React.createClass({
  onChange: function(event){this.props.CustomerSelect(event); },
  loadOptions: function(input, callback) {
    input = input.toLowerCase();

    var rtn = {
      options: [
        { label: 'PUBLICO EN GENERAL', value: '1' },
        { label: 'AGROTOR DE LA LAGUNA  S.A. DE C.V.', value: '2' },
        { label: 'COMISION FEDERAL DE ELECTRICIDAD', value: '6' }
      ],
      complete: true
    };

    if (input.slice(0, 1) === 'a') {
      if (input.slice(0, 2) === 'ab') {
        rtn = {
          options: [
            { label: 'AB', value: 'ab' },
            { label: 'ABC', value: 'abc' },
            { label: 'ABCD', value: 'abcd' }
          ],
          complete: true
        };
      } else {
        rtn = {
          options: [
            { label: 'A', value: 'a' },
            { label: 'AA', value: 'aa' },
            { label: 'AB', value: 'ab' }
          ],
          complete: false
        };
      }
    } else if (!input.length) {
      rtn.complete = false;
    }

    setTimeout(function() {
      callback(null, rtn);
    }, 500);
  },
  render: function() {
    return (
      <div>
        <label>{this.props.label}</label>
        <Select asyncOptions={this.loadOptions} className="remote-example" onChange = {this.onChange} value={this.props.value} />
      </div>
    );
  }
});

var CustomerInfo = React.createClass({
   render: function()
   {
      return React.DOM.div({className: "input-group input-group-sm",
             children: [
                React.DOM.label({ 
                htmlFor:"lblname",
                children: this.props.etiqueta,
                name: "lbl" + this.props.nombre
              }),
                 React.DOM.input({
                  type:"text",
                  className:"form-control",
                  name: "txt" + this.props.nombre,
                  placeholder:this.props.etiqueta,
                  value: this.props.value
                 })
              ]
          });
    }
});
  
var GeneralControls =  React.createClass(
{
   render: function()
    { return(
      <div className="row">
        <div className="col-sm-8">
          <CustomerInfo nombre = "Addrees" etiqueta = "Addrees"  value = {this.props.Addrees}/>
          <CustomerInfo nombre = "City" etiqueta = "City" value = {this.props.City}/>
          <CustomerInfo nombre = "Zip" etiqueta = "Zip" value = {this.props.Zip}/>
        </div>
        <div className="col-sm-4">
          <CustomerInfo nombre = "Rfc" etiqueta = "Rfc" value = {this.props.Rfc} />
          <CustomerInfo nombre = "Email" etiqueta = "Email" value = {this.props.Email} />
        </div>
      </div>
    );}
});

var ProductsControls =  React.createClass(
{
    getInitialState: function()
    {
        return { text: '', ItemsProducts: [], Descripcion : '', ArticuloID : 0, ClaveArticulo : ''}
    },
    keyChanging: function(event) 
    {
      if(event.keyCode === 13)
      {
       productsService.findByName(this.refs.inputProduct.getDOMNode().value).done(function(ItemsProducts)
       {
        this.setState({text: this.refs.inputProduct.getDOMNode().value,
                       ArticuloID : ItemsProducts[0].ArticuloID,
                       Descripcion : ItemsProducts[0].Descripcion,
                       ClaveArticulo : ItemsProducts[0].ClaveArticulo
                     });
       }.bind(this));
      }
      else {this.setState({text: this.refs.inputProduct.getDOMNode().value});}
    },
    AddProduct: function(){ 
                              var product = [{  "ArticuloID": this.state.ArticuloID,
                                                "ClaveArticulo": this.state.ClaveArticulo,
                                                "Descripcion": this.state.Descripcion,
                                                "Cantidad": this.refs.inputCantidad.getDOMNode().value,
                                                "Precio": this.refs.inputPrecio.getDOMNode().value,
                                                "Importe": this.refs.inputCantidad.getDOMNode().value * this.refs.inputPrecio.getDOMNode().value
                                              }];
                              this.props.AddProduct(product);
                              this.setState({text: this.refs.inputProduct.getDOMNode().value,
                                            ArticuloID : 0, Descripcion : '',ClaveArticulo : ''});
                              this.refs.inputProduct.getDOMNode().value = '';
                              this.refs.inputCantidad.getDOMNode().value = '';
                              this.refs.inputPrecio.getDOMNode().value = '';

                            },
     render: function()
      { return(
        <div className="row">
      
            <div className="col-sm-12">
              <label htmlFor="products">Product</label>
              <div className="row">
               <div className="col-sm-4">           
                 <input type="text" className="form-control" ref = 'inputProduct' placeholder="Enter product" onKeyDown = {this.keyChanging} />
               </div>
               <div className="col-sm-6">
                 <input type="text" className="form-control" id="productDescription" placeholder="Descripcion" value={this.state.Descripcion}/>
               </div>
               <div className="col-sm-2">
                 <input type="text"  className="form-control" ref = 'inputCantidad' placeholder="Cantidad"/>
                 <input type="text"  className="form-control" ref = 'inputPrecio' placeholder="Precio"/>
                 <button type="button" className="btn btn-primary" onClick={this.AddProduct} >Add</button>
               </div>
            </div>
            
        </div>

  </div>
    );}
});


var GridArticulos = React.createClass(
  {
      render: function()
      {
      var datasource;   
      datasource = this.props.products;
      return(
            <Table 
              rowHeight={25}
              rowGetter={function(rowIndex) {return datasource[rowIndex];  }}
              rowsCount={datasource.length}
              width={1120}
              height={220}
              headerHeight={25}>
              <Column label="Articulo" width={100} dataKey={'ArticuloID'} />
              <Column label="Clave" width={200} dataKey={'ClaveArticulo'} />
              <Column label="Descripcion" width={400} dataKey={'Descripcion'} />
              <Column label="Cantidad" width={100} dataKey={'Cantidad'} />
              <Column label="Precio" width={100} dataKey={'Precio'} />
              <Column label="Importe" width={100} dataKey={'Importe'} />
            </Table>
            );
      }
  });

var App = React.createClass(
{   
    getInitialState: function()
    {
        return { searchKey: '',products: [] ,Addrees:'', Rfc:'',City:'',Email:'',Zip:'', customer : 0}
    },
    searchHandler: function(searchKey)
    {
        productsService.findByName(searchKey).done(function(products)
        {
           this.setState({searchKey:searchKey, products: products});
        }.bind(this));
    },
    AddProduct: function(ItemsProducts)
    {
        this.state.products.push(ItemsProducts[0]);
        this.setState();
    },
    SaveCustomerOrder: function(event)
    {
      var regex = /[?&]([^=#]+)=([^&#]*)/g,
      url = window.location.href,
      params = {},
      match;
      while(match = regex.exec(url)) {params[match[1]] = match[2]; }
      var dia = new Date();
      var items = JSON.stringify(this.state.products);
      var customerOrder = { id: params.id,"date": dia , "customer": this.state.customer, "shipping": this.state.Addrees , "items" : items};
      $.ajax({url: "/CustomerOrder_TAKEN", type: "POST", data: JSON.stringify(customerOrder),
        contentType:"application/json; charset=utf-8", dataType:"json"});
    },
    CustomeronChange: function(customer)
    {
       customerService.findById(customer).done(function(customers)
        {
            this.setState({customer:customer, Addrees: customers[0].Direccion, Rfc: customers[0].Rfc , City: customers[0].Ciudad });
        }.bind(this));
    },
    render: function()
    {
        return(
        <div className="container-fluid">
            <div className="row">
              <div className="col-sm-1">
              </div>

              <div className="col-sm-10">
                <RemoteSelectField label="Customer:" CustomerSelect = {this.CustomeronChange} value = {this.state.customer} />
                <GeneralControls text = "Datos Generales" Addrees = {this.state.Addrees} Rfc = {this.state.Rfc} 
                  City = {this.state.City} Email = {this.state.Email}  Zip = {this.state.Zip} />                        
              </div>
              <div className="col-sm-1">
              </div>
            </div>

            <div className="row">
                <div className="col-sm-1">
                </div>
                <div className="col-sm-10">
                  <ProductsControls text = "products"  AddProduct={this.AddProduct}/>     
                  <GridArticulos products ={this.state.products} />
                  <button type="button" className="btn btn-primary"  onClick = {this.SaveCustomerOrder} >Save</button>
                </div>
                <div className="col-sm-1">
                </div>
            </div>
        </div>
        );
    }
});
React.render(<App/>, document.body);