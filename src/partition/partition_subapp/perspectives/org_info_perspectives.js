import * as Subject from '../../../models/subject';
import { InstForm } from '../../../models/subject.js';
import { text_maker } from '../../../models/text';
import { PartitionPerspective } from './PartitionPerspective.js';

import {
  absolute_value_sort,
  alphabetic_name_sort,
  get_glossary_entry,
  get_id_ancestry,
  post_traversal_search_string_set,
  partition_show_partial_children,
} from './data_hierarchy_utils';

import { 
  get_common_popup_options, 
  wrap_in_brackets, 
  formats_by_data_type,
} from './perspective_utils.js';


const glossary_entry_from_inst_form_type_id = (type_id) => {
  const type_id_to_glossary_suffix_map = {
    "agents_parl": "APARL",
    "crown_corp": "CC",
    "dept_agency": "STATOA",
    "dept_corp": "DEPTCORP",
    "inter_org": "IO",
    "joint_enterprise": "JE",
    "min_dept": "DEPT",
    "parl_ent": "todo",
    "serv_agency": "SA",
    "shared_gov_corp": "SGC",
    "spec_op_agency": "SOA",
  }
  const glossary_key = type_id === "parl_ent" ?
    "PARL_ORG" :
    "IFORM_"+type_id_to_glossary_suffix_map[type_id];
  return get_glossary_entry(glossary_key);
}

const orgs_to_inst_form_nodes = (orgs) => {
  return _.chain(orgs)
    .reject("is_dead")
    .groupBy("inst_form.id")
    .map( (orgs, parent_form_id) => {
      return _.chain(orgs)
        .groupBy("inst_form.id")
        .map( (orgs, type_id) => ({
          id: type_id,
          description: glossary_entry_from_inst_form_type_id(type_id),
          name: InstForm.lookup(type_id).name,
          is: __type__ => __type__ === "inst_form",
          plural: () => text_maker("type"),
          orgs: orgs,
        }) )
        .value()
    })
    .flatten()
    .value();
}

const org_info_post_traversal_rule_set = (node, data_type, distinct_root_identifier) => {
  node.id_ancestry = get_id_ancestry(distinct_root_identifier, node);
  if ( node.data.is("dept") ){
    node[data_type] = node.value = node.data.value = 1;
  } else {
    node.children = _.filter(node.children, d => d.value !== false && d.value !== 0);
    node[data_type] = node.value = d3.sum(node.children, d => d.value);
  }
}

const create_org_info_ministry_hierarchy = function(data_type) {
  const distinct_root_identifier = (new Date).getTime();

  return d3.hierarchy(Subject.gov,
    node => {
      if (node.is("gov")) {
        return Subject.Ministry.get_all();
      } else if ( node.is("ministry") ) {
        return orgs_to_inst_form_nodes(node.orgs);
      } else if ( node.is("inst_form") ) {
        return node.orgs;
      }
    })
    .eachAfter(node => {
      org_info_post_traversal_rule_set(node, data_type, distinct_root_identifier);
      post_traversal_search_string_set(node);
    })
    .sort( (a, b) => {
      if ( a.data.is("dept") ) {
        return alphabetic_name_sort(a, b);
      } else {
        return absolute_value_sort(a, b);
      }
    });
}

const create_org_info_inst_form_hierarchy = function(data_type, grandparent_inst_form_group) {
  const distinct_root_identifier = (new Date).getTime();

  return d3.hierarchy(Subject.gov,
    node => {
      if ( node.is("gov") ) {
        const orgs = _.chain( Subject.Ministry.get_all() )
          .map(ministry => ministry.orgs)
          .flatten()
          .filter(org => org.inst_form.parent_form.parent_form.id === grandparent_inst_form_group)
          .value();
        return orgs_to_inst_form_nodes(orgs);
      } else if ( node.is("inst_form") ) {
        return node.orgs;
      }
    })
    .eachAfter(node => {
      org_info_post_traversal_rule_set(node, data_type, distinct_root_identifier);
      post_traversal_search_string_set(node);
    })
    .sort( (a, b) => {
      if ( a.data.is("dept") ) {
        return alphabetic_name_sort(a, b);
      } else {
        return absolute_value_sort(a, b);
      }
    });
}


const org_info_hierarchy_factory = (grandparent_inst_form_group, apply_node_hiding_rules) => {
  const hierarchy = grandparent_inst_form_group ?
    create_org_info_inst_form_hierarchy("org_info", grandparent_inst_form_group):
    create_org_info_ministry_hierarchy("org_info");
  
  if (apply_node_hiding_rules){
    hierarchy
      .each(node => {
        node.__value__ = node.value;
        node.open = true;
        if ( node.data.is("ministry") || node.data.is("inst_form") ){
          node.how_many_to_show = function(_node){
            if (_node.children.length <= 2){ return [_node.children, []]}
            const number_to_show = 1;
            const show = _.take(_node.children, number_to_show);
            const hide = _.slice(_node.children, number_to_show);
            return [show, hide];
          };
        } else {
          node.how_many_to_show = function(_node){
            return [_node.children, []];
          };
        }
      })
      .each(node => {
        node.children = partition_show_partial_children(node);
      });
  }

  return hierarchy;
}


const value_formater = function(node_data){
  return !node_data.data.is("dept") ?
    wrap_in_brackets(
      formats_by_data_type["org_info"](node_data["org_info"]) + " " + 
      (node_data["org_info"] > 1 ? 
        text_maker("orgs") : 
        text_maker("org")
      )
    ) :
    "";
}

const org_info_perspective_popup_template = function(d){
  const common_popup_options = get_common_popup_options(d);
  if (d.data.is("dept")) {
    return text_maker("partition_org_info_org_popup", 
      _.extend(common_popup_options, {
        description: d.data.mandate,
        inst_form_name: d.parent.data.name,
        ministry_name: d.data.ministry.name, 
      })
    );
  } else if (d.data.is("inst_form")) {
    return text_maker("partition_org_info_inst_form_popup", 
      _.extend(common_popup_options, {
        description: d.data.description,
        ministry_name: d.parent.data.is("ministry") ? d.parent.data.name : false,
        plural_child_orgs: d.value !== 1,
      })
    );
  } else if (d.data.is("ministry")) { 
    return text_maker("partition_org_info_ministry_or_inst_form_groups_popup", 
      _.extend(common_popup_options, {
        plural_child_orgs: d.value !== 1,
      })
    );
  }
}


const make_org_info_ministry_perspective = () => new PartitionPerspective({
  id: "org_info_by_ministry",
  name: text_maker("partition_org_info_by_min"),
  data_type: "org_info",
  formater: value_formater,
  hierarchy_factory: _.curry(org_info_hierarchy_factory)(false),
  popup_template: org_info_perspective_popup_template,
  root_text_func: root_value => text_maker("partition_org_info_was", {x: root_value}),
});

const make_org_info_federal_perspective = () => new PartitionPerspective({
  id: "org_info_federal_orgs_by_inst_form",
  name: text_maker("partition_org_info_federal_orgs_by_inst_form"),
  data_type: "org_info",
  formater: value_formater,
  hierarchy_factory: _.curry(org_info_hierarchy_factory)("fed_int_gp"),
  popup_template: org_info_perspective_popup_template,
  root_text_func: root_value => text_maker("partition_org_info_federal_orgs_by_inst_form_was", {x: root_value}),
});

const make_org_info_interests_perspective = () => new PartitionPerspective({
  id: "org_info_interests_by_inst_form",
  name: text_maker("partition_org_info_interests_by_inst_form"),
  data_type: "org_info",
  formater: value_formater,
  hierarchy_factory: _.curry(org_info_hierarchy_factory)("corp_int_gp"),
  popup_template: org_info_perspective_popup_template,
  root_text_func: root_value => text_maker("partition_org_info_interests_by_inst_form_was", {x: root_value}),
});

export {
  make_org_info_ministry_perspective,
  make_org_info_federal_perspective,
  make_org_info_interests_perspective,
};