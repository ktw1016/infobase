import { Fragment } from 'react';

import { create_text_maker_component } from '../util_components.js';
import { SpinnerWrapper } from './SpinnerWrapper';

import { 
  get_client_id,
  log_standard_event,
} from '../core/analytics.js';
import {
  get_email_template,
  send_completed_email_template,
} from '../email_backend_utils.js';

import text from './EmailFrontend.yaml';
import './EmailFrontend.scss';

const { TM, text_maker } = create_text_maker_component(text);


const get_values_for_automatic_fields = (automatic_fields) => {
  const automatic_field_getters = {
    sha: () => window.sha,
    route: () => window.location.hash.replace('#','') || "start",
    lang: () => window.lang,
    app_version: () => window.is_a11y_mode ? "a11y" : "standard",
    client_id: () => get_client_id(),
    additional: () => ({}),
  };

  return _.mapValues(
    automatic_fields,
    (value, key) => _.isFunction(automatic_field_getters[key]) && automatic_field_getters[key]()
  );
};

class EmailFrontend extends React.Component {
  constructor(props){
    super(props);

    this.state = {
      template_name: props.template_name,
      loading: true,
      privacy_acknowledged: false,
      sent_to_backend: false,
      awaiting_backend_response: false,
      template: {},
      completed_template: {},
    };
  }
  componentDidMount(){
    get_email_template(this.props.template_name)
      .then( (template) => this.setState({loading: false, template: template}) );
  }
  componentDidUpdate(){
    const {
      sent_to_backend,
      awaiting_backend_response,

      template_name,
      template,
      completed_template,
    } = this.state;

    if (awaiting_backend_response && !sent_to_backend){
      const automatic_fields = _.omitBy(template, ({form_type}, key) => key === "meta" || form_type);

      const values_for_automatic_fields = get_values_for_automatic_fields(automatic_fields);

      send_completed_email_template(
        template_name, 
        {...completed_template, ...values_for_automatic_fields },
      ).then( () => this.setState({awaiting_backend_response: false}) );

      this.setState({sent_to_backend: true});
    }
  }
  render(){
    const {
      loading,
      privacy_acknowledged,
      sent_to_backend,
      awaiting_backend_response,
      template,
      completed_template,
    } = this.state;

    const user_fields = _.omitBy(template, ({form_type}, key) => key === "meta" || !form_type);

    const all_required_user_fields_filled = _.chain(user_fields)
      .omitBy( (field) => !field.required )
      .keys()
      .every( (required_field_key) => 
        (
          !_.isUndefined(completed_template[required_field_key]) && 
          !_.isEmpty(completed_template[required_field_key]) 
        )
      )
      .value();
    const ready_to_send = all_required_user_fields_filled && privacy_acknowledged;

    const diable_forms = sent_to_backend || awaiting_backend_response;

    const get_field_id = (field_key) => `emailFrontend${field_key}`;
    const get_form_for_user_field = (field_info, field_key) => {

      const EnumCheckbox = (label, key, is_checked) => (
        <div key={`${key}_check`} className="checkbox">
          <label htmlFor={get_field_id(key)}>
            <input 
              id={get_field_id(key)} 
              type="checkbox" 
              checked={is_checked} 
              disabled={diable_forms}
              onChange={
                () => {
                  this.setState({
                    completed_template: {
                      ...completed_template,
                      [field_key]: _.chain(completed_template[field_key])
                        .xor([key])
                        .sort()
                        .value(),
                    },
                  })
                }
              }
            />
            {label}
          </label>
        </div>
      );

      switch(field_info.form_type){
        case 'checkbox':
          return (
            <div>
              <b>{field_info.form_label[window.lang]}</b>
              {
                _.map(
                  field_info.enum_values,
                  (label_by_lang, key) => EnumCheckbox(
                    label_by_lang[window.lang],
                    key,
                    _.includes(completed_template[field_key], key)
                  )
                )
              }
            </div>
          );
        case 'textarea':
          return (
            <Fragment>
              <label htmlFor={get_field_id(field_key)}>
                {field_info.form_label[window.lang]}
              </label>
              <textarea
                id={get_field_id(field_key)}
                disabled={diable_forms}
                rows="5"
                cols="33"
                defaultValue={completed_template[field_key] || ''}
                onChange={
                  _.debounce(
                    () => this.setState({
                      completed_template: {
                        [field_key]: document.getElementById(`#${get_field_id(field_key)}`).value,
                      },
                    }),
                    500
                  )
                }
              />
            </Fragment>
          );
        case 'error':
          return (
            <label>
              {field_info.form_label[window.lang]}
            </label>
          );
      }
    };
 
    return (
      <div className="email-backend-form">
        { loading && 
          <div style={{height: "50px"}}>
            <SpinnerWrapper config_name="medium_inline" />
          </div>
        }
        { !loading &&
          <form>
            <fieldset>
              {
                _.map(
                  user_fields,
                  (field_info, key) => (
                    <div key={`${`${key}_form`}`} className={`email-backend-form__${field_info.form_type}`}>
                      { get_form_for_user_field(field_info, key) }
                    </div>
                  )
                )
              }
              <div className="email-backend-form__privacy-note">
                <TM k="email_frontend_privacy_note" />
                <div className="checkbox">
                  <label htmlFor={"email_frontend_privacy"}>
                    <input 
                      id={"email_frontend_privacy"} 
                      type="checkbox" 
                      checked={privacy_acknowledged} 
                      disabled={diable_forms}
                      onChange={ () => this.setState({privacy_acknowledged: !privacy_acknowledged }) }
                    />
                    {text_maker("email_frontend_privacy_ack")}
                  </label>
                </div>
              </div>
              { !sent_to_backend && !awaiting_backend_response &&
                <button 
                  className="btn-sm btn btn-ib-primary"
                  disabled={ !ready_to_send || awaiting_backend_response }
                  onClick={ (event) => {
                    event.preventDefault();
                    log_standard_event({
                      SUBAPP: window.location.hash.replace('#',''),
                      MISC1: "REPORT_A_PROBLEM",
                    });
                    this.setState({awaiting_backend_response: true});
                  }}
                >
                  { !awaiting_backend_response && text_maker("email_frontend_send")}
                  { awaiting_backend_response && <SpinnerWrapper config_name="small_inline" />}
                </button>
              }
              { sent_to_backend &&
                <Fragment>
                  <span tabIndex="0">
                    {text_maker("email_frontend_has_sent")}
                  </span>
                  <button 
                    className="btn-sm btn btn-ib-primary"
                    style={{float: "right"}}
                    onClick={ (event) => {
                      event.preventDefault();

                      _.chain(user_fields)
                        .pickBy( ({form_type}) => form_type === "textarea")
                        .forEach( (field_info, key) => document.getElementById( get_field_id(key) ).value = '' )
                        .value();

                      this.setState({
                        ...this.state,
                        sent_to_backend: false,
                        awaiting_backend_response: false,
                        completed_template: {},
                      });
                    }}
                  >
                    {text_maker("email_frontend_reset")}
                  </button>
                </Fragment>
              }
            </fieldset>
          </form>
        }
      </div>
    );
  }
}

export { EmailFrontend };