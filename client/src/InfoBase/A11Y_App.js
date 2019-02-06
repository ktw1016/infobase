import { Suspense } from 'react';
import { Route, Switch } from 'react-router';
import { initialize_analytics } from '../core/analytics.js';

import { ensure_linked_stylesheets_load, retrying_react_lazy } from './common_app_component_utils.js'

export const app_reducer = (state={ lang: window.lang }, { type, payload }) => {
  //doesn't do anything yet...
  return state;
};

import { ErrorBoundary } from '../core/ErrorBoundary.js';
import { DevFip } from '../core/DevFip.js';
import { InsertRuntimeFooterLinks } from '../core/InsertRuntimeFooterLinks.js';
import { ReactUnmounter } from '../core/NavComponents';
import { EasyAccess } from '../core/EasyAccess';
import { SpinnerWrapper } from '../components/SpinnerWrapper.js';

const Home = retrying_react_lazy( () => import('../home/a11y_home.js') );
const GraphInventory = retrying_react_lazy( () => import('../graph_route/GraphInventory.js') );
const BudgetMeasuresRoute = retrying_react_lazy( () => import('../partition/budget_measures_subapp/BudgetMeasuresRoute.js') );
const About = retrying_react_lazy( () => import('../about/about.js') );
const MetaData = retrying_react_lazy( () => import('../metadata/metadata.js') );
const IgocExplorer = retrying_react_lazy( () => import('../igoc_explorer/igoc_explorer.js') );
const ResourceExplorer = retrying_react_lazy( () => import('../resource_explorer/resource-explorer.js') );
const Glossary = retrying_react_lazy( () => import('../glossary/glossary.js') );
const ReportBuilder = retrying_react_lazy( () => import('../rpb/index.js') );
const InfoGraph = retrying_react_lazy( () => import('../infographic/infographic.js') );
const EstimatesComparison = retrying_react_lazy( () => import('../EstimatesComparison/EstimatesComparison.js') );

export class App extends React.Component {
  constructor(){
    super();
    initialize_analytics();

    ensure_linked_stylesheets_load();
  }
  render(){
    return (
      <div tabIndex={-1} id="app-focus-root">
        <ErrorBoundary>
          <DevFip />
          <ReactUnmounter />
          <InsertRuntimeFooterLinks />
          <EasyAccess />
          <Suspense fallback={<SpinnerWrapper config_name={"route"} />} > 
            <Switch>
              <Route path="/metadata/:data_source?" component={MetaData}/>
              <Route path="/igoc/:grouping?" component={IgocExplorer} />
              <Route path="/resource-explorer/:hierarchy_scheme?/:doc?" component={ResourceExplorer} />
              <Route path="/orgs/:level/:subject_id/infograph/:bubble?/" component={InfoGraph} />
              <Route path="/glossary/:active_key?" component={Glossary} />
              <Route path="/budget-measures/:first_column?/:selected_value?" component={BudgetMeasuresRoute} />
              <Route path="/rpb/:config?" component={ReportBuilder} />
              <Route path="/about" component={About} />
              <Route path="/graph/:level?/:graph?/:id?" component={GraphInventory} />
              <Route path="/compare_estimates" component={EstimatesComparison} />
              <Route path="/start/:no_basic_equiv?" component={Home} />
              <Route path="/" component={Home} />
            </Switch>
          </Suspense>
        </ErrorBoundary>
      </div>
    );
  }
}
