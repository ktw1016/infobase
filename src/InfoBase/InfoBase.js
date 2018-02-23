const { App, app_reducer }  = require('../core/App.js');

const ReactDOM = require('react-dom')

const { 
  createStore, 
  combineReducers, 
  applyMiddleware,
} = require('redux');

const { Provider } = require('react-redux')

const { 
  ConnectedRouter, 
  routerReducer, 
  routerMiddleware, 
  //push,
} = require('react-router-redux');
const {default: createHistory} = require('history/createHashHistory');

const { populate_stores } = require('../models/populate_stores.js');

const { Table } = require('../core/TableClass.js');
const WebFont = require('webfontloader');

require("../tables/table_common");

const table_defs = [
  require("../tables/table1/table1"),
  require("../tables/table2/table2"),
  require("../tables/table4/table4"),
  require("../tables/table5/table5"),
  require("../tables/table6/table6"),
  require("../tables/table7/table7"),
  require("../tables/table8/table8"),
  require("../tables/table9/table9"),
  require("../tables/table10/table10"),
  require("../tables/table11/table11"),
  require("../tables/table12/table12"),
  //require("../tables/table111/table111"),
  //require("../tables/table112/table112"),
  require('../tables/table300/table300.js'), //prog_by_vote/stat
  //require('../tables/table302/table302'),
  //require('../tables/table303/table303'),
  //require('../tables/table304/table304'),
  require('../tables/table305/table305.js'), //prog_by_sobj
];

require('../home/home.js');
// require("../igoc_explorer/igoc_explorer.js");
// require("../dept_explore/dept_explore");
// require("../rpb/index.js");
// require("../glossary/glossary");
require("../metadata/metadata.js");
// require("../infographic/infographic");

// require('../gen_expl/gen_expl.js');
// require('../program_explorer/resource-explorer.js');
// require('../program_explorer2/pe2.js');

// require("../graph_route/graph_route.js");
// require("../footnote_inventory/footnote_inventory.js");


module.exports  = function start({spinner, app_el}){
  
  WebFont.load({
    google: {
      families: ["Roboto:300,300i,400,400i,700,700i"],
    },
  });

  populate_stores().then(()=>{
    _.each(table_defs, table_def => Table.create_and_register(table_def));

    // Create a history of your choosing (we're using a browser history in this case)
    const history = createHistory({hashType: "noslash"});

    // Build the middleware for intercepting and dispatching navigation actions
    const middleware = routerMiddleware(history)

    // Add the reducer to your store on the `router` key
    // Also apply our middleware for navigating
    const store = createStore(
      combineReducers({
        app: app_reducer,
        router: routerReducer,
      }),
      applyMiddleware(middleware)
    );

    // Now you can dispatch navigation actions from anywhere!
    // store.dispatch(push('/foo'))

    ReactDOM.render( 
      <Provider store={store}>
        { /* ConnectedRouter will use the store from Provider automatically */ }
        <ConnectedRouter history={history}>
          <App />
        </ConnectedRouter>
      </Provider>,
      document.getElementById('app')
    );



    spinner.stop();
    d4.select(app_el).attr('aria-busy', false);

  });

}

