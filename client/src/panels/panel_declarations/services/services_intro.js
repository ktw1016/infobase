import text from './services.yaml';


import {
  create_text_maker_component,
  InfographicPanel,

  declare_panel,
} from "../shared.js";

const { text_maker } = create_text_maker_component(text);


const ServicesIntroPanel = () => {
  return (
    <div>
      {text_maker("services_intro_text")}
    </div>
  );
};
  

export const declare_services_intro_panel = () => declare_panel({
  panel_key: "dept_services_intro",
  levels: ["dept"],
  panel_config_func: (level, panel_key) => ({
    calculate: () => { return true; },
    footnotes: false,
    render({ calculations, sources}){
      return (
        <InfographicPanel
          title={text_maker("services_intro_title")}
          sources={sources}
        >
          <ServicesIntroPanel
          />
        </InfographicPanel>
      ); 
    },
  }),
});