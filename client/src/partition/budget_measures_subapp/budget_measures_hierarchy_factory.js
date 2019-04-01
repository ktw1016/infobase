import { text_maker } from "./budget_measure_text_provider.js";
import { Subject } from '../../models/subject.js';
import { GlossaryEntry } from '../../models/glossary.js';
import { businessConstants } from '../../models/businessConstants.js';

const { budget_values } = businessConstants;

const {
  BudgetMeasure,
  Dept,
  Program,
  CRSO,
} = Subject;

const absolute_value_sort_net_adjust_biased = (a,b) => {
  if (a.data.type === "net_adjust"){
    return Infinity;
  } else if (b.data.type === "net_adjust"){
    return - Infinity;
  } else {
    return - ( Math.abs(a.value) - Math.abs(b.value) );
  }
};

const get_total_budget_measure_funds = (selected_value, filtered_chapter_keys) => {
  return _.chain( BudgetMeasure.get_all() )
    .filter( budgetMeasure => _.indexOf(filtered_chapter_keys, budgetMeasure.chapter_key) === -1 )
    .flatMap( budgetMeasure => budgetMeasure.data )
    .reduce( (sum, data_row) => sum + (data_row[selected_value]), 0 )
    .value();
};

const post_traversal_modifications = (node, selected_value) => {
  node.value_type = selected_value;

  if ( _.isNaN(node.value) && node.children && node.children.length > 0 ){
    node.value = roll_up_children_values(node);
  }

  if (node.depth > 1 || node.data.id === "net_adjust"){
    node.submeasures = get_node_submeasures(node, selected_value);
  }

  post_traversal_children_filter(node);
  post_traversal_search_string_set(node);
};

const roll_up_children_values = (node) => {
  return _.reduce(node.children, (sum, child_node) => sum + child_node.value, 0);
};

const get_node_submeasures = (node, selected_value) => {
  let org_id, measure_id, program_or_crso_id;

  if (node.data.type === "program_allocation"){
    program_or_crso_id = node.data.id;
    org_id = node.parent.data.type === "dept" ? 
      node.parent.data.id :
      node.parent.parent.data.id;
    measure_id = node.parent.data.type === "budget_measure" ? 
      node.parent.data.id :
      node.parent.parent.data.id;
  } else {
    if (node.data.type === "budget_measure"){
      org_id = node.parent.data.id;
      measure_id = node.data.id;
    } else if (node.data.type === "dept"){
      org_id = node.data.id;
      measure_id = node.parent.data.id;
    } else if (node.data.id === "net_adjust") {
      org_id = "net_adjust";
      measure_id = "net_adjust";
    } else {
      return [];
    }
  }
  
  const node_submeasures = _.chain( BudgetMeasure.lookup(measure_id).submeasures )
    .filter(submeasure => org_id === "net_adjust" || submeasure.data.org_id !== org_id)
    .map( submeasure => ({
      ...submeasure, 
      value: program_or_crso_id ? 
        submeasure.data.program_allocations[program_or_crso_id]: 
        submeasure.data[selected_value],
    }))
    .filter( submeasure => !_.isUndefined(submeasure.value) && submeasure.value !== 0 )
    .sortBy( submeasure => -submeasure.value )
    .value();

  return node_submeasures;
};

const post_traversal_children_filter = (node) => {
  if (node.value_type === "funding"){
    return; // Don't filter anything when Budget 2018 Funding selected, want to show 0$ items in this case only
  } else if ( _.isUndefined(node.children) ){
    return; // Nothing to do on leaves of hierarchy
  } else {
    // Being extra careful here, to avoid cases where a node's children may be non-zero but still sum to zero
    node.children = _.filter(node.children, child_node => {
      return _.isUndefined(child_node.children) ? 
        child_node.value !== 0 :
        _.some(child_node.children, child_node_child => child_node_child.value !== 0);
    });
  }
}

const post_traversal_search_string_set = (node) => {
  node.data.search_string = "";
  if (node.data.name){
    node.data.search_string += _.deburr(node.data.name.toLowerCase());
  }
  if (node.data.description){
    node.data.search_string += _.deburr(node.data.description.replace(/<(?:.|\n)*?>/gm, '').toLowerCase());
  }
}

const make_program_allocation_nodes = (measure_id, org_id) => {
  const program_allocations = _.chain( BudgetMeasure.lookup(measure_id).data )
    .filter( data_row => +data_row.org_id === org_id && !_.isEmpty(data_row.program_allocations) )
    .flatMap(data_row => data_row.program_allocations)
    .value()[0];
  
  if ( _.isEmpty(program_allocations) ){
    return null;
  } else {
    const program_allocation_nodes = _.map(program_allocations, (allocation_value, subject_id) => {
      const program = Program.lookup(subject_id);
      const crso = CRSO.lookup(subject_id);
  
      const program_or_crso = program || crso;

      const type_and_value = {
        type: "program_allocation",
        value: allocation_value,
      };
  
      if ( !_.isUndefined(program_or_crso) ){
        return {
          ...program_or_crso,
          ...type_and_value,
        };
      } else {
        // Budget data can be a bit messy, and might also be introducing new programs not yet in the InfoBase,
        // worth handling cases and just logging it in the console, for ease of catching them
        window.is_dev && console.warn(`Budget hierarchy: missing program ${subject_id}`); // eslint-disable-line

        return {
          name: subject_id,
          id: subject_id,
          no_link: true,
          ...type_and_value,
        };
      }
    });
  
    return program_allocation_nodes;
  }
}


const budget_measure_first_hierarchy_factory = (selected_value, filtered_chapter_keys) => {
  return d3.hierarchy(
    {
      id: "root",
      type: "root", 
      value: get_total_budget_measure_funds(selected_value, filtered_chapter_keys),
    },
    node => {
      if (node.id === "root"){
        const budgetMeasureNodes = _.chain( BudgetMeasure.get_all() )
          .filter( budgetMeasure => _.isUndefined(filtered_chapter_keys) ||
            filtered_chapter_keys.length === 0 ||
            _.indexOf(filtered_chapter_keys, budgetMeasure.chapter_key) === -1 
          )
          .map( budgetMeasure => {
            
            const has_no_description = _.isEmpty(budgetMeasure.description);

            return {
              ...budgetMeasure, 
              type: budgetMeasure.id === "net_adjust" ? "net_adjust" : "budget_measure",
              description: has_no_description ?
                    text_maker("not_available") :
                    budgetMeasure.description,
              notes: !has_no_description ? text_maker("budget_measure_description_values_clarification") : false,
              chapter_key: budgetMeasure.chapter_key,
              value: _.reduce(budgetMeasure.data, (sum, data_row) => sum + (data_row[selected_value]), 0),
            };
          })
          .value();
        return budgetMeasureNodes;
      } else if (node.type === "budget_measure"){
        const orgNodes = _.chain(node.data)
          .filter(data_row => data_row.org_id !== "net_adjust")
          .map(data_row => {
            if (data_row.org_id === "non_allocated"){
              return {
                name: text_maker("budget_allocation_tbd"),
                description: "", //TODO: get explanation of this case, and use it for item description?
                type: "dept",
                id: 9999,
                value: data_row[selected_value],
                parent_measure_id: node.id,
              };
            } else {
              const dept = Dept.lookup(data_row.org_id);
              return {
                ...dept,
                type: "dept",
                description: dept.mandate,
                value: data_row[selected_value],
                parent_measure_id: node.id,
              };
            }
          })
          .value();
        return orgNodes;
      } else if (selected_value === "allocated" && node.type === "dept"){
        const measure_id = node.parent_measure_id;
        const org_id = node.id;
        return make_program_allocation_nodes(measure_id, org_id);
      }
    })
    .eachAfter( node => post_traversal_modifications(node, selected_value) )
    .sort(absolute_value_sort_net_adjust_biased);
}


const dept_first_hierarchy_factory = (selected_value, filtered_chapter_keys) => {
  const filtered_budget_measure_funds_by_org_id = _.chain( BudgetMeasure.get_all() )
    .filter( budgetMeasure => _.isUndefined(filtered_chapter_keys) || 
      filtered_chapter_keys.length === 0 ||
      _.indexOf(filtered_chapter_keys, budgetMeasure.chapter_key) === -1 
    )
    .flatMap( budgetMeasure => budgetMeasure.data )
    .groupBy( data_row => data_row.org_id )
    .value();
   
  return d3.hierarchy(
    {
      id: "root",
      type: "root", 
      value: get_total_budget_measure_funds(selected_value, filtered_chapter_keys),
    },
    node => {
      if (node.id === "root"){
        const deptNodes = _.map(filtered_budget_measure_funds_by_org_id, (data_rows, org_id) => {
          if (org_id === "non_allocated"){
            return {
              name: text_maker("budget_allocation_tbd"),
              description: "",
              type: "dept",
              id: 9999,
              data_rows,
            };
          } else if (org_id === "net_adjust"){
            const net_adjust_measure = BudgetMeasure.lookup("net_adjust");

            return {
              ...net_adjust_measure,
              type: "net_adjust",
              id: 9998,
              value: _.reduce(data_rows, (sum, data_row) => sum + data_row[selected_value], 0),
            };
          } else {
            const dept = Dept.lookup(org_id);

            return {
              ...dept,
              type: "dept",
              description: dept.mandate,
              data_rows,
            };
          }
        });
        return deptNodes;
      } else if (node.type === "dept"){
        const budgetMeasureNodes = _.map(node.data_rows, data_row => {
          const budgetMeasure = BudgetMeasure.lookup(data_row.measure_id);

          const has_no_description = _.isEmpty(budgetMeasure.description);

          return {
            ...budgetMeasure,
            type: "budget_measure",
            chapter_key: budgetMeasure.chapter_key,
            description: has_no_description ?
                  text_maker("not_available") :
                  budgetMeasure.description,
            notes: !has_no_description ? text_maker("budget_measure_description_values_clarification") : false,
            value: data_row[selected_value],
            parent_org_id: node.id,
          };
        });
        return budgetMeasureNodes;
      } else if (selected_value === "allocated" && node.type === "budget_measure"){
        const measure_id = node.id;
        const org_id = node.parent_org_id;
        return make_program_allocation_nodes(measure_id, org_id);
      }
    })
    .eachAfter(node => post_traversal_modifications(node, selected_value) )
    .sort(absolute_value_sort_net_adjust_biased);
}


const budget_overview_hierarchy_factory = (filtered_chapter_keys) => {
  return d3.hierarchy(
    {
      id: "root",
      type: "root", 
      value: get_total_budget_measure_funds("funding", filtered_chapter_keys),
    },
    node => {
      if (node.id === "root"){
        const measure_funding_nodes = _.chain( BudgetMeasure.get_all() )
          .filter( budgetMeasure => _.isUndefined(filtered_chapter_keys) ||
            filtered_chapter_keys.length === 0 ||
            _.indexOf(filtered_chapter_keys, budgetMeasure.chapter_key) === -1
          )
          .map( budgetMeasure => {
            
            const has_no_description = _.isEmpty(budgetMeasure.description);

            return {
              ...budgetMeasure,
              type: budgetMeasure.id === "net_adjust" ? "net_adjust" : "budget_measure",
              value_type: "funding",
              description: has_no_description ?
                    text_maker("not_available") :
                    budgetMeasure.description,
              notes: !has_no_description ? text_maker("budget_measure_description_values_clarification") : false,
              value: _.reduce(budgetMeasure.data, (sum, data_row) => sum + data_row.funding, 0),
              chapter_key: budgetMeasure.chapter_key,
            };
          })
          .filter( node => node.value !== 0 )
          .sortBy( node => node.type === "net_adjust" ? Infinity : -Math.abs(node.value) )
          .value();
          
        return measure_funding_nodes;
      } else if (node.type === "budget_measure"){
        const allocated_org_nodes = _.chain(node.data)
          .map(data_row => {
            if (data_row.org_id === "non_allocated"){
              return {
                name: text_maker("budget_allocation_tbd"),
                description: "", //TODO: get explanation of this case, and use it for item description?
                type: "dept",
                value_type: "allocated",
                id: 9999,
                value: data_row.allocated,
                parent_measure_id: node.id,
              };
            } else {
              const dept = Dept.lookup(data_row.org_id);
              return {
                ...dept,
                type: "dept",
                value_type: "allocated",
                description: dept.mandate,
                value: data_row.allocated,
                parent_measure_id: node.id,
              };
            }
          })
          .sortBy( node => -Math.abs(node.value) )
          .value();
        
        const measure_withheld_node = {
          id: node.id + "_withheld",
          type: "measure_withheld_slice",
          value_type: "withheld",
          name: budget_values.withheld.text,
          description: GlossaryEntry.lookup("BIV_WITH").definition,
          value: _.reduce(
            BudgetMeasure.lookup(node.id).data,
            (memo, data_row) => memo + data_row.withheld,
            0
          ),
          parent_measure_id: node.id,
        };

        const measure_remaining_node = {
          id: node.id + "_remaining",
          type: "measure_remaining_slice",
          value_type: "remaining",
          name: budget_values.remaining.text,
          description: GlossaryEntry.lookup("BIV_REMA").definition,
          value: _.reduce(
            BudgetMeasure.lookup(node.id).data,
            (memo, data_row) => memo + data_row.remaining,
            0
          ),
          parent_measure_id: node.id,
        };

        if (measure_remaining_node.value !== node.value){
          return _.filter(
            [
              ...allocated_org_nodes,
              measure_withheld_node,
              measure_remaining_node,
            ],
            node => node.value !== 0,
          );
        } else {
          return []; // Don't return any nodes if 100% remaining
        }
      } else if (node.type === "dept"){
        const measure_id = node.parent_measure_id;
        const org_id = node.id;
        return _.sortBy(
          make_program_allocation_nodes(measure_id, org_id),
          node => -Math.abs(node.value),
        );
      }
    })
    .eachAfter(node => {
      if (node.data.type === "program_allocation"){
        node.value_type = "allocated";
      } else {
        node.value_type = node.data.value_type;
      }
      if (node.data.type === "dept" || node.data.type === "program_allocation"){
        node.submeasures = get_node_submeasures(node, "allocated");
      }
      post_traversal_children_filter(node);
      post_traversal_search_string_set(node);
    });
}

export function budget_measures_hierarchy_factory(selected_value, first_column, filtered_chapter_keys){
  if (selected_value === "overview"){
    return budget_overview_hierarchy_factory(filtered_chapter_keys);
  } else {
    if (first_column === "budget-measure"){
      return budget_measure_first_hierarchy_factory(selected_value, filtered_chapter_keys);
    } else if (first_column === "dept"){
      return dept_first_hierarchy_factory(selected_value, filtered_chapter_keys);
    }
  }
}