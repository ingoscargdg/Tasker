/**
 * @jsx React.DOM
 */

var socket = io.connect();
socket.emit('adduser', 'RocioTamezJ');

var Header = React.createClass(
{  render: function ()
   { return ( <header className="bar bar-nav">
               <a href="#" className={"icon icon-left-nav pull-left" + (this.props.back==="true"?"":" hidden")}></a>
               <h1 className="title">{this.props.text}</h1>
             </header>);
    }
});

var SearchBar = React.createClass(
{  searchHandler: function() { this.props.searchHandler(this.refs.searchKey.getDOMNode().value); },
   render: function ()
  { return ( <div className="bar bar-standard bar-header-secondary">
                <input type="search" ref="searchKey" onChange={this.searchHandler} value={this.props.searchKey}/>
            </div>);
  }
});

var TaskListItem = React.createClass(
{   render: function ()
    {
        return (
            <li className="table-view-cell media" >
                <a href={"/" + "Take_CustomerOrder"}>
                    {this.props.task.task}
                <p>ID: {this.props.task.id}</p>
              </a>
            </li>
        );
    }
});

var TaskList = React.createClass(
{  render: function () {var items = this.props.tasks.map(function (task)
   { return (<TaskListItem key={task.id} task={task} />); });
     return (
             <ul  className="table-view">
                {items}
            </ul>
            );
    }
});

var HomePage = React.createClass(
{
    render: function () {
        return (
            <div className={"page " + this.props.position}>
                <Header text="Tasks" back="false"/>
                <SearchBar searchKey={this.props.searchKey} searchHandler={this.props.searchHandler}/>
                <div className="content">
                    <TaskList tasks={this.props.tasks}/>
                </div>
            </div>
        );
    }
});


var App = React.createClass({
    mixins: [PageSlider],
    getInitialState: function()
   {
       socket.on('sendtask', this.getTask);
       return {searchKey: '',tasks:  [] }
   },
    getTask: function(emited_task)
    {
        this.state.tasks.push(emited_task);
        this.setState();
    },
    searchHandler: function(searchKey)
    {
        taskservice.findByName(searchKey,'task').done(function(tasks) {
            this.setState({
                searchKey:searchKey,
                tasks: tasks,
                pages: [<HomePage key="list" searchHandler={this.searchHandler} searchKey={searchKey} tasks={tasks}/>]});
            }.bind(this));
    },
    componentDidMount: function() {
      taskservice.findByName('','task').done(function(tasks) {
            this.setState({
                tasks: tasks,
                pages: [<HomePage searchHandler={this.searchHandler} tasks={tasks}/>]});
        }.bind(this));
    }      
});

React.render(<App/>, document.body);