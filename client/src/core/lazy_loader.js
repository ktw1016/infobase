import { Table } from './TableClass.js';
import { PanelGraph, tables_for_graph } from './PanelGraph.js';
import { Statistics, tables_for_statistics } from './Statistics.js';
import { 
  load_results_bundle, load_results_counts, load_granular_results_counts, 
  api_load_results_bundle, api_load_results_counts,
} from '../models/populate_results.js';
import { load_footnotes_bundle } from '../models/populate_footnotes.js';
import { load_budget_measures } from '../models/populate_budget_measures.js';
import { Subject } from '../models/subject.js';

const { BudgetMeasure } = Subject;

// given an array of tables, returns a promise when they are all loaded.
function load(table_objs){
  return Promise.all(
    _.chain( table_objs ) 
      .reject( _.property('loaded') ) //ignore tables that are already loaded 
      .map( table => table.load() )
      .value()
  );
}

function ensure_loaded({ 
  graph_keys, 
  stat_keys, 
  table_keys, 
  subject_level, 
  results, 
  subject,
  require_result_counts,
  require_granular_result_counts,
  footnotes_for: footnotes_subject,
  use_api_for_results,
}){
  const table_set = _.chain( table_keys )
    .union(
      _.chain(graph_keys)
        .map(key => tables_for_graph(key, subject_level))
        .flatten()
        .value()
    )
    .union(
      _.chain(stat_keys)
        .map(tables_for_statistics)
        .flatten()
        .value()
    )
    .uniqBy()
    .map( table_key => Table.lookup(table_key) )
    .value();

  //results can be required explicitly, or be a dependency of a graph/statistic
  const should_load_results = (
    results || 
    _.chain(graph_keys)
      .map(key => PanelGraph.lookup(key, subject_level))
      .map('requires_results')
      .concat( 
        _.chain(stat_keys)
          .map(key => Statistics.lookup(key))
          .map('requires_results')
          .value()
      )
      .some()
      .value()
  );

  const should_load_result_counts = (
    require_result_counts ||
    _.chain(graph_keys)
      .map(key => PanelGraph.lookup(key, subject_level))
      .map('requires_result_counts')
      .concat( 
        _.chain(stat_keys)
          .map(key => Statistics.lookup(key))
          .map('requires_result_counts')
          .value()
      )
      .some()
      .value()
  );

  const should_load_granular_result_counts = (
    require_granular_result_counts ||
    _.chain(graph_keys)
      .map(key => PanelGraph.lookup(key, subject_level))
      .map('requires_granular_result_counts')
      .concat( 
        _.chain(stat_keys)
          .map(key => Statistics.lookup(key))
          .map('requires_granular_result_counts')
          .value()
      )
      .some()
      .value()
  );

  const should_load_budget_measures = (
    (
      subject && subject.type_name === "budget_measure" ||
      _.chain(graph_keys)
        .map(key => PanelGraph.lookup(key, subject_level))
        .map('requires_budget_measures')
        .some()
        .value()
    ) &&
      _.isEmpty( BudgetMeasure.get_all() )
  );

  const results_prom = (
    should_load_results ?
      use_api_for_results ? 
        api_load_results_bundle(subject) : 
        load_results_bundle(subject) :
      Promise.resolve()
  );

  const result_counts_prom = (
    should_load_result_counts ?
      use_api_for_results ? 
        api_load_results_counts("summary") : 
        load_results_counts() :
      Promise.resolve()
  );

  const granular_result_counts_prom = (
    should_load_granular_result_counts ?
      use_api_for_results ? 
        api_load_results_counts("granular") : 
        load_granular_results_counts() :
      Promise.resolve()
  );

  const footnotes_prom = (
    footnotes_subject ?
      load_footnotes_bundle(footnotes_subject) :
      Promise.resolve()
  );

  const budget_measures_prom = (
    should_load_budget_measures ?
      load_budget_measures() :
      Promise.resolve()
  );
  
  return Promise.all([
    load(table_set),
    results_prom,
    result_counts_prom,
    granular_result_counts_prom,
    footnotes_prom,
    budget_measures_prom,
  ]);
}

window._DEV_HELPERS.ensure_loaded = ensure_loaded;

export { 
  ensure_loaded,
};
