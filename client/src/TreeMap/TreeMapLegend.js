import './TreeMap.scss';
import treemap_text from './TreeMap.yaml';
import { create_text_maker } from '../models/text.js';
import { Fragment } from 'react';
import { formats } from '../core/format.js';

const text_maker = create_text_maker([treemap_text]);


const size_controls = {
  "drf": text_maker("expenditures"),
  "drf_ftes": text_maker("fte"),
  "tp": text_maker("SOBJ10"),
  "vote_stat": text_maker("expenditures"),
  "so": text_maker("expenditures"),
}

export class TreeMapLegend extends React.Component {
  constructor() {
    super();
  }
  render() {
    const {
      perspective,
      legend_cols,
      legend_measure_text,
    } = this.props;
    return (
      <Fragment>
        <div className='row'>
          <div className="col-sm-5">
            <div className="row">
              <div className="col-sm-4" style={{textAlign: "right", paddingRight: "0px"}}>
                {proportional_block()}
              </div>
              <div className="col-sm-8">
                {`${text_maker("treemap_legend_text")} ${size_controls[perspective]}.`}
              </div>
            </div>
          </div>
          <div className="col-sm-7">
            <div className="row" style={{textAlign: "center"}}>
              <svg width={`${legend_cols.length*80+10}`} height="50">
                <g className="mutLegendGroup" transform="translate(0,0)">
                  <rect className="mutLegendBG" fill="rgb(253, 253, 253)" stroke="none" width="500" height="50" />
                  {_.map(legend_cols, (o, ix) => {
                    return legend_block(o.val, o.col, ix);
                  })
                  }
                </g>
              </svg>
            </div>
            <div className="row" style={{textAlign: "center"}}>
              <span style={{paddingTop: "40px", paddingBottom: "40px"}}>
                {legend_measure_text}
              </span>
            </div>
          </div>
        </div>
      </Fragment>
    )
  }
}

const proportional_block = () =>
  <svg width="70" height="70">
    <g transform="translate(5,5)">
      <rect className="mutLegendBG" fill="white" stroke="black" strokeWidth="2" width="60" height="60" />
      <rect className="mutLegendBG" fill="white" stroke="black" strokeWidth="2" width="30" height="30" />
      <text className="breakLabels" x="25" y="25" style={{ textAnchor: "end", display: "block" }} >
        {`${formats.big_int_real_raw(25)}`}
      </text>
      <text className="breakLabels" x="55" y="55" style={{ textAnchor: "end", display: "block" }} >
        {`${formats.big_int_real_raw(100)}`}
      </text>
    </g>
  </svg>;

const legend_block = (val, col, ix) =>
  <g className="legendCells" transform={`translate(${ix * 80 + 10},5)`}>
    <rect className="breakRect" height="25" width="80" fill={col} stroke="black" />
    {val &&
      <text className="breakLabels" x="0" y="40" style={{ textAnchor: "middle", display: "block" }} >
        {val}
      </text>}
  </g>