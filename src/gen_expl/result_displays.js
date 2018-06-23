import { createSelector } from 'reselect';

import { TM, text_maker } from '../panels/result_graphs/result_text_provider.js';
import { infograph_href_template } from '../link_utils.js';
import { Indicator } from '../models/results.js';
import { IndicatorDisplay } from '../panels/result_graphs/components.js';


export const ResultCounts = ({ base_hierarchy, doc, subject }) => {

  const indicators = _.filter(Indicator.get_flat_indicators(subject), {doc} )

  const indicator_count_obj = { 
    count: indicators.length, 
    type_key: 'indicator',
    type_name:  ('indicators'),
  };

  const count_items  = _.chain(base_hierarchy)
    .reject('root')
    .groupBy("data.type")
    .toPairs()
    .map( ([type_key,group]) => ({
      type_name: get_type_name(type_key),
      type_key,
      count: group.length,
    }))
    .concat([ indicator_count_obj ])
    //.sortBy( ({type_key}) => _.indexOf(sorted_count_header_keys, type_key))
    .map( ({type_key, count}) => [type_key, count] )
    .fromPairs()
    .value();

  let text_key = "";
  if(subject.level === 'dept'){
    if(doc === 'drr16'){
      if(count_items.sub_program > 0){
        if(count_items.sub_sub_program > 0){
          text_key = "result_counts_drr_dept_sub_sub";
        } else {
          text_key = "result_counts_drr_dept_sub";
        }
      } else {
        text_key = "result_counts_drr_dept_no_subs";
      }

    } else {

      if(subject.is_DRF){
        text_key = "result_counts_dp_dept_drf"

      } else {
        if(count_items.sub_program > 0){
          if(count_items.sub_sub_program > 0){
            text_key = "result_counts_dp_dept_paa_sub_sub"
          } else {
            text_key = "result_counts_dp_dept_paa_sub"
          }
        } else {
          text_key = "result_counts_dp_dept_paa_no_subs"
        }
      }
    //dp dept
    }
  //dept
  } else if(subject.level === 'program'){
    if(doc==='drr16'){
      if(count_items.sub_program > 0){
        if(count_items.sub_sub_program > 0){
          text_key = "result_counts_drr_prog_paa_sub_sub";
        } else {
          text_key = "result_counts_drr_prog_paa_sub";
        }
      } else {
        text_key = "result_counts_drr_prog_paa_no_subs";
      }
    } else {
      if(count_items.sub_program > 0){
        if(count_items.sub_sub_program > 0){
          text_key = "result_counts_dp_prog_paa_sub_sub";
        } else {
          text_key = "result_counts_dp_prog_paa_sub";
        }
      } else {
        text_key = "result_counts_dp_prog_paa_no_subs";
      }
    } 

  } else if(subject.level === 'crso'){
    //we only care about CRs, which are only DP
    text_key = "result_counts_dp_crso_drf";

  }

  return (
    <div className="medium_panel_text">
      <TM 
        k={text_key}
        args={{
          subject,

          num_programs:count_items.program,
          num_results:count_items.result,
          num_indicators:count_items.indicator,

          num_subs:count_items.sub_program,
          num_sub_subs:count_items.sub_sub_program,

          num_drs:count_items.dr,
          num_crs:count_items.cr,
        }}

      />
    </div>
  );
}


export const spending_header = createSelector(
  doc => doc, 
  doc => <TM k={doc === 'dp18' ? "dp_spending" : "drr_spending"} />
);

export const fte_header = createSelector(
  doc => doc,
  doc => <TM k={doc === "dp18" ? "dp_ftes" : "drr_ftes"} />
);


const type_text_keys = {
  dept: "orgs",
  cr: "core_responsibilities",
  so: "strategic_outcomes",
  program: "programs",
  sub_program: "sub_programs",
  sub_sub_program: "sub_sub_programs",
  dr:"dept_results",
  result: "results",
};

export const get_type_name = type_key => {
  const text_key = type_text_keys[type_key];
  return text_key ? text_maker(text_key) : null;
}

export const ResultNodeContent = ({ 
  node: {
    data: {
      result, 
      contributing_programs, 
      result_subject, 
      indicators, 
    },
    children : indicator_nodes,
  },
  doc,
}) => (
  <div className="indicator-container-container">
    <div className="indicator-container">
      <IndicatorDisplay indicators={_.map(indicator_nodes, 'data.indicator')} stripe_rows={true} />
    </div>
    { !_.isEmpty(contributing_programs) && 
      <div>
        <header className="agnostic-header"> <TM k="programs_tagged_as_dr_contributors" /> </header>
        <ul>                
          {_.map(contributing_programs, prog => 
            <li key={prog.id}>
              <a href={infograph_href_template(prog)}> { prog.name } </a>
            </li>
          )}
        </ul>
      </div>
    }
  </div>
);