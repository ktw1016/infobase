import './AdvancedSearch.scss';
import text from "./AdvancedSearch.yaml";

import { EverythingSearch } from './EverythingSearch.js';

import { Details } from '../components/Details.js';

import { create_text_maker } from '../models/text.js';
const text_maker = create_text_maker(text);


const complete_option_hierarchy = {
  org_options: {
    label: text_maker("orgs"),

    child_options: {
      include_orgs_normal_data: {label: text_maker("include_orgs_normal_data_label")},
      include_orgs_limited_data: {label: text_maker("include_orgs_limited_data_label")},
    },
  },

  crso_and_program_options: {
    label: text_maker("crso_and_prog_label"),

    child_options: {
      include_crsos: {label: text_maker("core_resps")},
      include_programs: {label: text_maker("programs")},
    },
  },

  tag_options: {
    label: text_maker("tag_categories"),

    child_options: {
      include_tags_goco: {label: text_maker("goco_tag")},
      include_tags_hi: {label: text_maker("hi_tag")},
      include_tags_hwh: {label: text_maker("hwh_tag")},
      include_tags_wwh: {label: text_maker("wwh_tag")},
    },
  },

  other_options: {
    label: text_maker("other_options_label"),

    child_options: {
      include_glossary: {label: text_maker("glossary")},
      include_tables: {label: text_maker("metadata")},
    },
  },
};

const Checkbox = ({label, checked, onChange}) => (
  <div className="checkbox">
    <label>
      <input type={'checkbox'} checked={checked} onChange={onChange}/>
      {label}
    </label>
  </div>
);

export class AdvancedSearch extends React.Component {
  constructor(props) {
    super(props);

    this.state = { ...props.initial_configs };
  }
  render(){
    const optional_configs = this.state;

    const { 
      everything_search_config,
      invariant_configs,
    } = this.props;

    const include_configs = {
      ...optional_configs,
      ...invariant_configs,
    };

    const option_node_to_component = (option_node, option_key) => {
      const is_invariant = _.chain(invariant_configs).keys().includes(option_key).value();
      const all_children_are_invariant = !_.isEmpty(option_node.child_options) && 
        _.chain(option_node.child_options).keys().without(..._.keys(invariant_configs)).isEmpty().value();

      if (is_invariant || all_children_are_invariant){
        return false;
      }

      if ( !_.isEmpty(option_node.child_options) ){
        const has_checked_child_option = _.chain(option_node.child_options)
          .map( (child_node, child_key) => optional_configs[child_key] )
          .some()
          .value();

        const has_children_to_display = !(
          _.size(option_node.child_options) === 1 &&
          _.chain(option_node.child_options).map("label").first().value() === option_node.label
        );

        return (
          <div key={option_key}>
            { ( !window.is_a11y_mode || (window.is_a11y_mode && !has_children_to_display) ) &&
              <Checkbox
                label={option_node.label}
                checked={has_checked_child_option}
                onChange={
                  () => this.setState(
                    _.chain(option_node.child_options)
                      .map( (child_node, child_key) => [child_key, !has_checked_child_option] )
                      .fromPairs()
                      .value()
                  )
                }
              />
            }
            { has_children_to_display &&
              <ul style={{listStyle: 'none'}}>
                { _.map(
                  option_node.child_options,
                  (option_node, option_key) => option_node_to_component(option_node, option_key)
                )}
              </ul>
            }
          </div>
        );
      } else {
        const should_be_displayed = _.chain(optional_configs)
          .keys()
          .includes(option_key)
          .value();
        
        if (should_be_displayed){
          return <Checkbox 
            key={option_key}
            label={option_node.label}
            checked={optional_configs[option_key]}
            onChange={ () => this.setState(
              { [option_key]: !optional_configs[option_key] }
            )}
          />;
        }
      }
    };

    return(
      <div>
        <div className='col-md-12' >
          <EverythingSearch {...{...everything_search_config, ...include_configs}} />
        </div>
        <div className="col-md-12">
          <Details
            summary_content={text_maker("advaced_search_title")}
            persist_content={true}
            content={
              <div>
                <p>{text_maker("advanced_search_description")}:</p>
                <div className="advanced-search-options">
                  { _.map(
                    complete_option_hierarchy,
                    option_node_to_component
                  )}
                </div>
              </div>
            }
          />
        </div>
      </div>  
    );
  }
}