import { planned_resource_fragment } from '../panels/result_graphs/results_common.js';


export function get_resources_for_subject(subject, table6, table12, year){
  const fragment = planned_resource_fragment({subject, table6, table12});


  const year_data =  _.find(fragment, { year });
  
  const relevant_fragment = {
    spending:year_data.spending,
    ftes: year_data.ftes,
  };

  if(relevant_fragment.spending || relevant_fragment.ftes){
    return relevant_fragment;
  } else {
    return null;
  }
}