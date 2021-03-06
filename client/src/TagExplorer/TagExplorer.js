import text from './TagExplorer.yaml';

import { Fragment } from 'react';
import classNames from 'classnames';

import { 
  infograph_href_template,
} from '../link_utils.js';
import { StandardRouteContainer } from '../core/NavComponents.js';
import { ensure_loaded } from '../core/lazy_loader.js';
import { Subject } from '../models/subject.js';
import { GlossaryEntry } from '../models/glossary.js';
import { year_templates} from '../models/years.js';
import { run_template } from '../models/text.js';
import { 
  create_text_maker_component,
  SpinnerWrapper,
  KeyConceptList,
  TabbedControls,
  AlertBanner,
  GlossaryIcon,
} from '../components/index.js';

//drilldown stuff
import { combineReducers, createStore } from 'redux';
import { Provider, connect } from 'react-redux';

import '../explorer_common/explorer-styles.scss';
import { get_col_defs } from '../explorer_common/resource_explorer_common.js';
import { get_root } from '../explorer_common/hierarchy_tools.js';
import { 
  get_memoized_funcs, 
  initial_root_state, 
  root_reducer, 
  map_state_to_root_props_from_memoized_funcs, 
  map_dispatch_to_root_props,
} from '../explorer_common/state_and_memoizing.js';
import { Explorer } from '../explorer_common/explorer_components.js';

import { resource_scheme, get_initial_resource_state } from './resource_scheme.js';

const { Tag } = Subject;

const { text_maker, TM } = create_text_maker_component(text);

const { std_years, planning_years } = year_templates;
const actual_year = _.last(std_years);
const planning_year = _.first(planning_years);

const route_arg_to_year_map = {
  actual: actual_year,
  planned: planning_year,
};
const year_to_route_arg_map = _.invert(route_arg_to_year_map);

const dp_only_schemes = ["MLT"];

const children_grouper = (node, children) => {
  if(node.root){
    return [{node_group: children}];
  }

  return _.chain(children)
    .groupBy(child => child.data.subject.plural() )
    .map( (node_group, plural) => ({
      display: plural,
      node_group,
    }))
    .value();
};


function render_non_col_content({node}){

  const {
    data: {
      subject,
      defs,
    },
  } = node;
  
  const extended_defs = _.compact([
    ...(defs || []),
    subject.old_name && {
      term: text_maker("previously_named"),
      def: subject.old_name,
    },
  ]);

  return (
    <div>
      { !_.isEmpty(extended_defs) && 
        <dl className="dl-horizontal">
          {_.map(extended_defs, ({ term, def }, ix) => !_.isEmpty(def) &&
            <Fragment key={ix}> 
              <dt> { term } </dt>
              <dd> { def } </dd>
            </Fragment>
          )}
        </dl>
      }
      { ( _.includes(['program','dept'], subject.level) || subject.is_cr || subject.is_lowest_level_tag ) && 
        <div className='ExplorerNode__BRLinkContainer'>
          <a href={infograph_href_template(subject)}> 
            <TM k="learn_more" />
          </a>
        </div>
      }
    </div>
  );
}


class ExplorerPage extends React.Component {
  constructor(){
    super();
    this.state = { _query: "" };
    this.debounced_set_query = _.debounce(this.debounced_set_query, 500);
  }
  handleQueryChange(new_query){
    this.setState({
      _query: new_query,
      loading: new_query.length > 3 ? true : undefined,
    });
    this.debounced_set_query(new_query);
  } 
  debounced_set_query(new_query){
    this.props.set_query(new_query);
    this.timedOutStateChange = setTimeout(()=>{
      this.setState({
        loading: false,
      });
    }, 500);
  }
  componentWillUnmount(){
    !_.isUndefined(this.debounced_set_query) && this.debounced_set_query.cancel();
    !_.isUndefined(this.timedOutStateChange) && clearTimeout(this.timedOutStateChange);
  }
  clearQuery(){
    this.setState({_query: ""});
    this.props.clear_query("");
  }
  render(){
    const {
      flat_nodes,
      is_filtering,

      set_query,
      toggle_node,
      
      //scheme props
      hierarchy_scheme,
      is_descending,
      sort_col,
      col_click,
      year,
      is_m2m,
    } = this.props;


    const explorer_config = {
      column_defs: get_col_defs({year}),
      onClickExpand: id => toggle_node(id),
      is_sortable: true,
      zebra_stripe: true,
      get_non_col_content: render_non_col_content,
      children_grouper,
      col_click,
    };

    const { loading } = this.state;

    const root = get_root(flat_nodes);

    const [
      goco_props, 
      hwh_props,
      //mlt_props,
      wwh_props,
      hi_props,
    ] = _.chain([ 
      Tag.lookup("GOCO"),
      Tag.lookup("HWH"),
      //Tag.lookup("MLT"),
      Tag.lookup("WWH"),
      Tag.lookup("HI"),
    ])
      .compact()
      .map( ({ description, name, id }) => ({
        title: name,
        text: description,  
        active: hierarchy_scheme === id,
        id,
      }))
      .value();
    const min_props = {
      title: text_maker("how_were_accountable"),
      text: text_maker("portfolio_description"),
      active: hierarchy_scheme === 'min',
      id: 'min',
    };

    const dept_props = {
      title: text_maker("organizations_public_funds"),
      text: text_maker("a_z_list_of_orgs"),
      active: hierarchy_scheme === 'dept',
      id: 'dept',
    };
    const all_category_props = [ min_props, dept_props, goco_props, hwh_props, wwh_props, hi_props];
    const current_category = _.find(all_category_props, props => props.active);

    const inner_content = <div>
      <div style={{marginTop: '15px'}}>
        <form
          style={{marginBottom: "15px"}}
          onSubmit={evt => {
            evt.preventDefault();
            evt.stopPropagation();
            set_query(evt.target.querySelector('input').value);
            this.refs.focus_mount.focus();
          }}
        >
          <input 
            aria-label={text_maker("explorer_search_is_optional")}
            className="form-control input-lg"
            type="text"
            style={{width: "100%"}}
            placeholder={text_maker('everything_search_placeholder')}
            onChange={evt => this.handleQueryChange(evt.target.value)}
          />
          {
            window.is_a11y_mode &&
            <input 
              type="submit"
              name="search"
              value={text_maker("explorer_search")}
            />
          }
        </form>
      </div>
      <div 
        tabIndex={-1}
        className="explorer-focus-mount"
        ref="focus_mount" 
        style={{position: 'relative'}}
        aria-label={text_maker("explorer_focus_mount")}
      >
        {loading && 
          <div className="loading-overlay">
            <div style={{height: '200px',position: 'relative'}}>
              <SpinnerWrapper config_name={"sub_route"} /> 
            </div>
          </div>
        }
        {is_filtering && _.isEmpty(root.children) &&
          <div style={{fontWeight: '500', fontSize: '1.5em', textAlign: 'center'}}>  
            <TM k="search_no_results" />
          </div>
        }
        <Explorer 
          config={explorer_config}
          root={root}
          col_state={{
            sort_col,
            is_descending,
          }}
        />
      </div>
    </div>;
    
    return <div>
      <TM k="tag_nav_intro_text" el="div" />
      <div className="tabbed-content">
        <TabbedControls
          tab_callback = {
            (key) => {
              const route_base = window.location.href.split('#')[0];

              const new_route = {
                [actual_year]: `#tag-explorer/${_.includes(dp_only_schemes, hierarchy_scheme) ? "min" : hierarchy_scheme }/actual`,
                [planning_year]: `#tag-explorer/${hierarchy_scheme}/planned`,
              }[key];

              window.location.href = `${route_base}${new_route}`;
            }
          }
          tab_options = {[
            {
              key: actual_year, 
              label: <TM k="actual_resources" args={{year: run_template(actual_year)}}/>,
              is_open: year === actual_year,
            },
            {
              key: planning_year, 
              label: <TM k="planned_resources" args={{year: run_template(planning_year)}}/>,
              is_open: year === planning_year,
            },
          ]}
        />
        <div className="tabbed-content__pane">
          <div>
            <ul className="nav nav-justified nav-pills">
              {_.map(all_category_props, props =>
                <li key={props.id} className={classNames(props.active && 'active')}><a href={`#tag-explorer/${props.id}/${year_to_route_arg_map[year]}`} >{props.title}</a></li>
              )}
            </ul>
          </div>
          <h2 style={{marginBottom: "10px"}}>
            { current_category && current_category.text }
            { current_category && GlossaryEntry.lookup(current_category.id) && 
              <GlossaryIcon
                id={current_category.id}
                icon_color={window.infobase_color_constants.tertiaryColor}
                icon_alt_color={window.infobase_color_constants.primaryColor}
              />
            }
          </h2>
          { is_m2m &&
            <AlertBanner banner_class="danger">
              <KeyConceptList 
                question_answer_pairs={
                  _.map( 
                    [
                      "MtoM_tag_warning_reporting_level",
                      "MtoM_tag_warning_resource_splitting",
                      "MtoM_tag_warning_double_counting",
                    ], 
                    key => [
                      <TM key={key+"_q"} k={key+"_q"} />, 
                      <TM key={key+"_a"} k={key+"_a"} />,
                    ] 
                  )
                }
              />
            </AlertBanner>
          }
          <div>
            {inner_content}
          </div>
        </div>
      </div>
    </div>;
  }
}


const map_state_to_props_from_memoized_funcs = memoized_funcs => {

  const { get_scheme_props } = memoized_funcs;
  const mapRootStateToRootProps = map_state_to_root_props_from_memoized_funcs(memoized_funcs);

  return state => ({
    ...mapRootStateToRootProps(state),
    ...get_scheme_props(state),
  });
};


class OldExplorerContainer extends React.Component {
  constructor(props){
    super();
    const { hierarchy_scheme, year } = props;
    const scheme = resource_scheme;
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
      root: ({...initial_root_state, scheme_key}),
      [scheme_key]: get_initial_resource_state({ hierarchy_scheme, year }),
    };

    const connecter = connect(mapStateToProps, mapDispatchToProps);
    const Container = connecter(ExplorerPage);
    const store = createStore(reducer,initialState);

    this.state = {
      store,
      Container,
    };
  }
  static getDerivedStateFromProps(nextProps, prevState){
    const { hierarchy_scheme, year } = nextProps;
    const { store } = prevState;

    resource_scheme.set_hierarchy_and_year(store, hierarchy_scheme, year);
    
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


export default class TagExplorer extends React.Component {
  constructor(){
    super();
    this.state = { loading: true };
  }
  componentDidMount(){
    ensure_loaded({
      table_keys: ['programSpending', 'programFtes'],
    }).then(()=> {
      this.setState({loading: false});
    });
  }
  render(){
    const { match } = this.props;
    const route_container_args = {
      title: text_maker("tag_nav"),
      breadcrumbs: [text_maker("tag_nav")],
      description: text_maker("tag_nav_intro_text"),
      route_key: "_resource-explorer",
    };
    const header = <h1><TM k="tag_nav" /></h1>;

    if(this.state.loading){
      return (
        <StandardRouteContainer {...route_container_args}>
          {header}
          <SpinnerWrapper config_name={"route"} />
        </StandardRouteContainer>
      );
    }
    let { 
      params: {
        hierarchy_scheme,
        period,
      },
    } = match;

    hierarchy_scheme = (
      _.includes(['min','dept','GOCO','HWH', "WWH", "CCOFOG", "MLT", "HI"], hierarchy_scheme) ? 
        hierarchy_scheme :
        'min'
    );

    const year = route_arg_to_year_map[period] || planning_year;

    return (
      <StandardRouteContainer {...route_container_args}>
        {header}
        <OldExplorerContainer {...{hierarchy_scheme, year}} />
      </StandardRouteContainer>
    );
  }
}
