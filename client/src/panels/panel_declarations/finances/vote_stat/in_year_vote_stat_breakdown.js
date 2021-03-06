import { text_maker, TM } from './vote_stat_text_provider.js';
import { Fragment } from 'react';
import {
  Subject,
  formats,
  util_components,
  infograph_href_template,
  StdPanel,
  Col,
  newIBLightCategoryColors,
  FlatTreeMapViz,

  declare_panel,
} from '../../shared.js';
const { Format } = util_components;

const main_col = "{{est_in_year}}_estimates";


const text_func = (vs, d, break_str) => {
  if (vs == 'voted') {
    return d.dept ? `${Subject.Dept.lookup(d.dept).fancy_name} ${break_str}  ${d.desc}` : d.desc;
  } else {
    return d.dept ? `${d.desc} ${break_str} ${Subject.Dept.lookup(d.dept).fancy_name}` : d.desc;
  }
};

const node_render = vs => function (foreign_sel) {
  foreign_sel.html(function (node) {
    if (this.offsetHeight <= 30 || this.offsetWidth <= 50) { return; }

    const ret = `
      <div class="FlatTreeMap__TextBox">
        <div class="FlatTreeMap__ContentTitle">
          ${text_func(vs, node.data, "-")}
        </div>
        ${ this.offsetHeight > 50 ?
          `<div class="FlatTreeMap__ContentText">
            ${formats.compact1(node.data["{{est_in_year}}_estimates"])}
          </div>` : 
          "" }
      </div>
    `;
    return ret;
  });
};

const tooltip_render = vs => function (d) {
  const sel = d3.select(this);
  sel.attrs({
    className: "link-unstyled",
    tabIndex: "0",
    "aria-hidden": "true",
    // this can't be called "title" (what tooltip.js uses) because of some other hover effects that fire on titles.
    "data-ibtt-text": ` 
      <div class="FlatTreeMap__ToolTip">
        ${text_func(vs, d.data, "<br/>", true)} <br/>
        ${formats.compact1(d.data["{{est_in_year}}_estimates"])} (${formats.percentage(d.data["{{est_in_year}}_estimates"]/d.data.total)} ${text_maker("of")} ${d.data.total_of})
      </div>`,
    "data-toggle": "tooltip",
    "data-ibtt-html": "true",
    "data-container": "body",
  });
};

const d3_scale = d3.scaleOrdinal( newIBLightCategoryColors );
const color_scale = vs => function (d) {
  return d3_scale(text_func(vs, d, ""));
};

const planned_vote_or_stat_render = vs => function ({ calculations, footnotes, sources }) {
  const { info, panel_args } = calculations;
  const isVoted = vs === "voted";

  const { data } = panel_args;

  const col = "{{est_in_year}}_estimates";
  const top_10_rows = _.take(data, 10);
  const complement_amt = _.last(data)[col];
  const total_amt = d3.sum(data, _.property(col));

  const rows = _.map(top_10_rows, obj => ({
    name: Subject.Dept.lookup(obj.dept).fancy_name,
    rpb_link: infograph_href_template(Subject.Dept.lookup(obj.dept)),
    voted_stat: obj.desc,
    amount: obj[col],
  }));

  const packing_data = {
    name: "",
    children: _.map(data, (d, i) => _.extend({
      id: i,
      total: total_amt,
      total_of: text_maker(
        isVoted ?
          'all_voted_items' :
          'all_stat_items'
      ),
    }, d)),
  };

  const show_pack = !window.is_a11y_mode;

  return (
    <StdPanel
      title={text_maker(
        isVoted ?
          "in_year_voted_breakdown_title" :
          "in_year_stat_breakdown_title"
      )}
      {...{ footnotes, sources }}
    >
      <Col isText size={12}>
        <TM
          k={
            isVoted ?
              "in_year_voted_breakdown_text" :
              "in_year_stat_breakdown_text"
          }
          args={info}
        />
      </Col>
      <Col isGraph size={6}>
        <TopTenTable
          rows={rows}
          complement_amt={complement_amt}
          total_amt={total_amt}
          isVoted={isVoted}
        />
      </Col>
      {show_pack &&
        <Col isGraph size={6}>
          <div className="centerer" style={{ width: "100%" }}>
            <FlatTreeMapViz
              data={packing_data}
              colorScale={color_scale(vs)}
              node_render={node_render(vs)}
              tooltip_render={tooltip_render(vs)}
              value_string="{{est_in_year}}_estimates"
            />
          </div>
        </Col>
      }
    </StdPanel>
  );

};


const planned_vote_or_stat_calculate = vs => function (subject, info) {
  const { orgVoteStatEstimates } = this.tables;

  const text = text_maker(vs);
  const all_rows = _.chain(orgVoteStatEstimates.voted_stat(main_col, false, false)[text])
    .sortBy(x => -x[main_col])
    .map(d => _.pick(d, "desc", 'dept', main_col))
    .value();

  const ret = {};
  ret.data = _.take(all_rows, 10);
  if (vs === 'voted') {
    //vote descriptions are of the form "<vote desc> - <vote num>"
    //lets strip out the hyphen and everything that follows
    ret.data.forEach(row => row.desc = row.desc.replace(/-.+$/, ""));
  }
  ret.data.push({
    desc: text_maker(`all_other_${vs}_items`),
    others: true,
    [main_col]: d3.sum(_.tail(all_rows, 10), d => d[main_col]),
  });

  return ret;
};


const row_cells = ({ name, rpb_link, voted_stat, amount }) => (
  <Fragment>
    { rpb_link ? 
      <td className="left-text_plain">
        <a href={rpb_link}>
          {name}
        </a>
      </td> :
      <td className="left-text_plain">
        {name}
      </td>
    }
    <td className="left-text_plain">
      {voted_stat}
    </td>
    <td className="right_number">
      <Format
        type={window.is_a11y_mode ? "compact1_written" : "compact1"}
        content={amount}
      />
    </td>
  </Fragment>
);

const TopTenTable = ({ rows, total_amt, complement_amt, isVoted }) => (
  <table
    className="table infobase-table table-striped border table-condensed table-blue"
    style={{ fontSize: '12px', lineHeight: 1 }}
  >
    <thead>
      <tr className="table-header">
        <th scope="col"><TM k="org" /></th>
        <th scope="col"><TM k={isVoted ? "voted" : "stat"} /></th>
        <th scope="col"><TM k="authorities" /></th>
      </tr>
    </thead>
    <tbody>
      {_.map(rows, obj =>
        <tr key={obj.name + obj.voted_stat}>
          {row_cells(obj)}
        </tr>
      )}
      <tr key="complement">
        {
          row_cells({
            name: "",
            voted_stat: text_maker(
              isVoted ?
                'all_other_voted_items' :
                'all_other_stat_items'
            ),
            amount: complement_amt,
          })
        }
      </tr>
      <tr key="total" className="total background-blue">
        {
          row_cells({
            name: text_maker('total'),
            voted_stat: '',
            amount: total_amt,
          })
        }
      </tr>
    </tbody>
  </table>
);


const declare_in_year_voted_breakdown_panel = () => declare_panel({
  panel_key: "in_year_voted_breakdown",
  levels: ["gov"],
  panel_config_func: (level, panel_key) => ({
    depends_on: ['orgVoteStatEstimates'],
    info_deps: ['orgVoteStatEstimates_gov_info'],
    calculate: planned_vote_or_stat_calculate("voted"),
    render: planned_vote_or_stat_render("voted"),
  }),
});
const declare_in_year_stat_breakdown_panel = () => declare_panel({
  panel_key: "in_year_stat_breakdown",
  levels: ["gov"],
  panel_config_func: (level, panel_key) => ({
    depends_on: ['orgVoteStatEstimates'],
    info_deps: ['orgVoteStatEstimates_gov_info'],
    calculate: planned_vote_or_stat_calculate("stat"),
    render: planned_vote_or_stat_render("stat"),
  }),
});

export {
  declare_in_year_voted_breakdown_panel,
  declare_in_year_stat_breakdown_panel,
};
