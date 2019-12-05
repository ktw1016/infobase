import { get_client } from '../graphql_utils.js';
import gql from 'graphql-tag';
import { log_standard_event } from '../core/analytics.js';
import { 
  Service,
} from './services.js';


const dept_service_fragment = (
  `org_id
      services: services {
        service_id
        program_ids
        is_active

        name
        description
        service_type
        scope
        target_groups
        feedback_channels
        urls
        comment

        last_gender_analysis

        collects_fees
        cra_buisnss_number_is_identifier
        sin_is_identifier
        account_reg_digital_status
        authentication_status
        application_digital_status
        decision_digital_status
        issuance_digital_status
        issue_res_digital_status
        digital_enablement_comment

        telephone_enquires
        website_visits
        online_applications
        in_person_applications
        mail_applications
        other_channel_applications

        standards {
          standard_id
          service_id
          is_active
      
          name
      
          last_gcss_tool_year
          channel
          standard_type
          other_type_comment
      
          target_type
          lower
          upper
          count
          met_count
          is_target_met
          target_comment
          urls
          rtp_urls
        }
      }
  `
);

const get_dept_services_query = gql`
query($lang: String!, $id: String) {
  root(lang: $lang) {
    org(org_id: $id) {
      id
      ${dept_service_fragment}
    }
  }
}
`;

const get_all_services_query = gql`
query($lang: String!) {
  root(lang: $lang) {
    orgs {
      ${dept_service_fragment}
    }
  }
}
`;

const extract_flat_data_from_hierarchical_response = (response) =>{
  return _.chain(response).
    map(resp=>resp.services).
    compact().
    flatten(true).
    value();
};

const _subject_ids_with_loaded_services = {};
export function api_load_services(subject){
  const level = (subject && subject.level) || 'gov';
  
  const {
    is_loaded,
    id,
    query,
    response_data_accessor,
  } = (() => {
    const subject_is_loaded = ({level, id}) => _.get(_subject_ids_with_loaded_services, `${level}.${id}`);

    const all_is_loaded = () => subject_is_loaded({level: 'gov', id: 'gov'});
    const dept_is_loaded = (org) => all_is_loaded() || subject_is_loaded(org);

    switch(level){
      case 'dept':
        return {
          is_loaded: dept_is_loaded(subject),
          id: subject.id,
          query: get_dept_services_query,
          response_data_accessor: (response) => response.data.root.org,
        };
      default:
        return {
          is_loaded: all_is_loaded(subject),
          id: 'gov',
          query: get_all_services_query,
          response_data_accessor: (response) => response.data.root.orgs,
        };
    }
  })();

  if (is_loaded){
    return Promise.resolve();
  }

  const time_at_request = Date.now();
  const client = get_client();
  return client.query({
    query,
    variables: {
      lang: window.lang, 
      id,
      _query_name: 'services',
    },
  })
    .then( (response) => {
      const response_data = response_data_accessor(response);

      const resp_time = Date.now() - time_at_request; 
      if( !_.isEmpty(response_data) ){
        // Not a very good test, might report success with unexpected data... ah well, that's the API's job to test!
        log_standard_event({
          SUBAPP: window.location.hash.replace('#',''),
          MISC1: "API_QUERY_SUCCESS",
          MISC2: `Services, took ${resp_time} ms`,
        });
      } else {
        log_standard_event({
          SUBAPP: window.location.hash.replace('#',''),
          MISC1: "API_QUERY_UNEXPECTED",
          MISC2: `Services, took ${resp_time} ms`,
        });  
      }
      
      const all_services = extract_flat_data_from_hierarchical_response(response_data);

      if ( !_.isEmpty(all_services) ){
        _.each(
          all_services,
          service => Service.create_and_register({...service}),
        );
      }

      // Need to use _.setWith and pass Object as the customizer function to account for keys that may be numbers (e.g. dept id's)
      // Just using _.set makes large empty arrays when using a number as an accessor in the target string, bleh
      _.setWith(
        _subject_ids_with_loaded_services,
        `${level}.${id}`,
        true,
        Object
      );

      // side effect
      _.setWith(
        _subject_ids_with_loaded_services, 
        `${level}.${id}`, 
        _.isEmpty(all_services),
        Object
      );

      return Promise.resolve();
    })
    .catch(function(error){
      const resp_time = Date.now() - time_at_request;     
      log_standard_event({
        SUBAPP: window.location.hash.replace('#',''),
        MISC1: "API_QUERY_FAILURE",
        MISC2: `Services, took ${resp_time} ms - ${error.toString()}`,
      });
      throw error;
    });
}