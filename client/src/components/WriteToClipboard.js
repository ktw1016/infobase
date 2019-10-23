import text from './WriteToClipboard.yaml';

import * as clipboard from 'clipboard-polyfill';
import { Fragment } from 'react';

import { FixedPopover } from './modals_and_popovers';
import { IconCopy } from '../icons/icons.js';

import { log_standard_event } from '../core/analytics.js';

import { create_text_maker } from '../models/text.js';

const text_maker = create_text_maker(text);

export class WriteToClipboard extends React.Component {
  constructor(){
    super();

    this.state = {
      copy_status_message: false,
      keyboard_navigation_detected: false,
    };
  }
  render(){
    const {
      text_to_copy,
      button_class_name,
      button_description,
      IconComponent,

      analytics_logging,
      analytics_event_value,
    } = this.props;

    const {
      copy_status_message,
      keyboard_navigation_detected,
    } = this.state;

    const modal_active = _.isString(copy_status_message);
    const copy_success = copy_status_message === text_maker("copy_success");

    return (
      <Fragment>
        <button
          className={button_class_name}
          onClick={
            () => {
              clipboard
                .writeText(text_to_copy)
                .then(
                  () => this.setState({copy_status_message: text_maker("copy_success")})
                )
                .catch(
                  () => this.setState({copy_status_message: text_maker("copy_fail")})
                );

              analytics_logging && log_standard_event({
                SUBAPP: window.location.hash.replace('#',''),
                MISC1: "COPY_TO_CLIPBOARD",
                MISC2: analytics_event_value || text_to_copy,
              });
            }
          }
          onKeyDown={() => this.setState({ keyboard_navigation_detected: true })}
        >
          <IconComponent
            title={button_description}
            color={window.infobase_color_constants.textLightColor}
            alternate_color={false}
          />
        </button>
        <FixedPopover
          on_close_callback={() => this.setState({copy_status_message: false})}
          show={modal_active}
          title={
            <Fragment>
              <IconCopy
                color={window.infobase_color_constants.tertiaryColor}
                alternate_color={false}
                aria_hide={true}
              />
              { modal_active ? 
                ( copy_success ?
                  copy_status_message :
                  text_maker("copy_to_clipboard") 
                ) :
                "" 
              }
            </Fragment>
          }
          subtitle={modal_active && !copy_success && copy_status_message}
          body={modal_active && !copy_success && <div tabIndex="0">{text_to_copy}</div>}
          dialog_position="left"
          auto_close_time={!window.is_a11y_mode && (modal_active && copy_success) && 1900}
          close_button_in_header={!window.is_a11y_mode}
          restore_focus={window.is_a11y_mode || keyboard_navigation_detected}
        />
      </Fragment>
    );
  }
}
WriteToClipboard.defaultProps = {
  button_description: text_maker("copy_to_clipboard"),
  IconComponent: IconCopy,
};