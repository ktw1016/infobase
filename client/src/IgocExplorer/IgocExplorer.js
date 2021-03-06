import './IgocExplorer.scss';
import { StandardRouteContainer } from '../core/NavComponents.js';
import { createSelector } from 'reselect';

//drilldown stuff
import { combineReducers, createStore } from 'redux';
import { Provider, connect } from 'react-redux';
import { create_igoc_hierarchy } from './hierarchies.js';
import { ExplorerForIgoc } from './explorer_view.js';
import { filter_hierarchy } from '../explorer_common/hierarchy_tools.js';
import { igoc_tmf as text_maker, TM } from './igoc_explorer_text.js';
import { 
  get_memoized_funcs, 
  initial_root_state, 
  root_reducer, 
  map_state_to_root_props_from_memoized_funcs, 
  map_dispatch_to_root_props, 
} from '../explorer_common/state_and_memoizing';


const map_state_to_props_from_memoized_funcs = memoized_funcs => {

  const { get_scheme_props } = memoized_funcs;
  const mapRootStateToRootProps = map_state_to_root_props_from_memoized_funcs(memoized_funcs);

  return state => ({
    ...mapRootStateToRootProps(state),
    ...get_scheme_props(state),
  });
};

const scheme = {
  key: 'igoc',

  get_props_selector: () => createSelector(
    _.property('igoc.grouping'),
    _.property('igoc.should_show_orgs_without_data'),
    (grouping, should_show_orgs_without_data) => {
      return {
        sort_func: _.identity,
        grouping,
        should_show_orgs_without_data,
      };
    }
  ),

  dispatch_to_props: dispatch => ({
    on_toggle_orgs_without_data: ()=> dispatch({
      type: 'toggle_orgs_without_data',
    }),
  }),

  reducer: (state={ grouping: 'portfolio', should_show_orgs_without_data: true}, action) => {
    const { type, payload } = action;
    switch(type){
      case 'toggle_orgs_without_data':
        return {...state, should_show_orgs_without_data: !state.should_show_orgs_without_data };
      case 'set_grouping':
        return {...state, grouping: payload};
      default: 
        return state;
    }
  },

  get_base_hierarchy_selector: () => createSelector( 
    _.property('igoc.grouping'),
    grouping => create_igoc_hierarchy(grouping)
  ),

  get_filter_func_selector: ()=> createSelector(
    _.property('igoc.should_show_orgs_without_data'), 
    should_show_orgs_without_data => (
      should_show_orgs_without_data ? 
      _.identity :
      nodes => filter_hierarchy(
        nodes,
        node => (_.get(node, 'data.subject.tables.length') || 0) > 1,
        { leaves_only: false, markSearchResults: false }
      )
    )
  ),
  
};


//This code is a little strange. This components exists as an intermediary between redux and react-router. 
//Trying to use a functional component here results in re-creating the redux store, connecter functions and Container component. 
//Instead, this component will own those long-term objects and keep the store updated with URL changes. 
class ExplorerContainer extends React.Component {
  constructor(props){
    super();

    const { grouping } = props;

    const scheme_key = scheme.key;

    const reducer = combineReducers({
      root: root_reducer, 
      [scheme_key]: scheme.reducer,
    });

    const mapStateToProps = map_state_to_props_from_memoized_funcs(get_memoized_funcs([scheme]));

    const mapDispatchToProps = dispatch => ({
      ...map_dispatch_to_root_props(dispatch),
      ...scheme.dispatch_to_props(dispatch),
    });

    const initialState = {
      root: { ...initial_root_state, scheme_key },
      [scheme_key]: { 
        grouping,
        should_show_orgs_without_data: true,
      },
    };

    const connecter = connect(mapStateToProps, mapDispatchToProps);
    const Container = connecter(ExplorerForIgoc);
    const store = createStore(reducer,initialState);

    this.state = {
      store,
      Container,
    };
  }
  static getDerivedStateFromProps(nextProps, prevState){
    const { grouping } = nextProps;
    prevState.store.dispatch({
      type: 'set_grouping',
      payload: grouping,
    });
    return null;
  }
  render(){
    const { store, Container } = this.state;

    return (
      <Provider store={store}>
        <Container />
      </Provider>
    );
  }
}


const IgocExplorer = ({match}) => {
  let grouping = _.get(match, "params.grouping");
  if(_.isEmpty(grouping)){
    grouping = "portfolio";
  }
  //sanitize grouping param
  return (
    <StandardRouteContainer
      breadcrumbs={[text_maker("igoc")]}
      title={text_maker("igoc")}
      route_key="_igoc_explorer"
      description={text_maker("igoc_desc_meta_attr")}
    >
      <div>
        <h1> <TM k="igoc" /> </h1>
      </div>
      <div className="medium_panel_text">
        <div style={{marginBottom: "1.5em"}}>
          <TM k="about_inventory"/>
        </div>
        <ExplorerContainer grouping={grouping} />
      </div>
    </StandardRouteContainer>
  );
};
export { IgocExplorer as default };