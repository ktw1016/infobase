import './BudgetMeasuresRoute.scss';

import { ensure_loaded } from '../../core/lazy_loader.js';
import { StandardRouteContainer } from '../../core/NavComponents.js';
import { SpinnerWrapper } from '../../util_components';
import { text_maker } from "../../models/text";

import { BudgetMeasuresTop } from './BudgetMeasuresTop.js';
import { BudgetMeasuresControls } from './BudgetMeasuresControls.js';
import { BudgetMeasuresPartition } from './BudgetMeasuresPartition.js';

export class BudgetMeasuresRoute extends React.Component {
  constructor(){
    super();
    this.state = {loading: true};
  }
  componentWillMount(){
    const first_column = this.props.match.params.first_column;
    if (first_column !== "budget-measure" && first_column !== "dept"){
      this.props.history.push('/budget-measures/dept');
    }
  }
  componentDidMount(){
    ensure_loaded({
      subject_name: 'BudgetMeasure',
    }).then( () => {
      window.addEventListener("resize", this.centerDiagram.bind(this));
      this.setState({loading: false});
    });
  }
  componentWillUnmount(){
    window.removeEventListener("resize", this.centerDiagram.bind(this));
  }
  centerDiagram(){
    if (this.refs.partition){
      this.refs.partition.style.marginLeft = -d3.select("main.container").node().offsetLeft+"px";
    }
  }
  render(){
    const first_column = this.props.match.params.first_column;

    return (
      <StandardRouteContainer
        ref="container"
        title={text_maker("budget_measures")}
        description={"TODO"}
        breadcrumbs={[text_maker("budget_measures")]}
        route_key="budget-measures"
      >
        { this.state.loading && <SpinnerWrapper ref="spinner" scale={4} /> }
        { !this.state.loading && !window.is_a11y_mode &&
          <div className="budget-measures">
            <BudgetMeasuresTop/>
            <BudgetMeasuresControls first_column={first_column} history={this.props.history} />
            <div
              ref="partition"
              className="budget-measures-partition"
              style={{marginLeft: -d3.select("main.container").node().offsetLeft+"px"}}
            >
              <BudgetMeasuresPartition first_column={first_column} />
            </div>
          </div>
        }
        { !this.state.loading && window.is_a11y_mode &&
          <div className="budget-measures">
            <BudgetMeasuresTop/>
            {/* TODO a11y presentation of data, probably just a table */}
          </div>
        }
      </StandardRouteContainer>
    );
  }
}