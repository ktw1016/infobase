import common_charts_utils from './common_charts_utils';

export class Line {
  
  constructor(container,options){

    // data in the format of
    // ```javascript
    // data = { "series 1" : [y1,y2,y3],
    //         "series 2" : [y1,y2,y3]}
    // ticks = ["tick1","tick2"."tick3"]
    // ```

    common_charts_utils.setup_graph_instance(this,d3.select(container),options);

    var _graph_area = this.svg.append("g").attr("class","_graph_area");
    this.grid_line_area = _graph_area.append("g").attr("class","grid_lines");
    this.graph_area = _graph_area.append("g").attr("class","inner_graph_area");
  };

  render(options){
    this.options = _.extend(this.options,options);
    this.margin = this.options.margin || {
      top: 20,
      right: 20,
      bottom: 30,
      left: 80,
    };

    this.hide_gridlines = this.options.hide_gridlines === undefined ? false : this.options.hide_gridlines;
    this.add_xaxis = this.options.add_xaxis === undefined ? true : this.options.add_xaxis;
    this.add_yaxis = this.options.add_yaxis === undefined ? true : this.options.add_yaxis;
    this.axis_class = "axis " + (this.options.axis_class === undefined ? "" : this.options.axis_class );

    this.x_axis_line = this.options.x_axis_line === undefined ? true : this.options.x_axis_line;

    this.formaters = _.map(this.options.formaters); 
    this.formater = !_.isEmpty(this.formaters) ? this.formaters[0] : this.options.formater;

    // resize the svg if necessary
    this.svg
      .attrs({
        width: this.outside_width,
        height: this.outside_height,
      })
      .select("._graph_area")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    var width = this.outside_width - this.margin.left - this.margin.right;

    this.series = this.options.series;
    this.values = d3.values(this.series);
    this.series_labels = d3.keys(this.series);
    this.colors = this.options.colors;
    // restrict either the beginning or end of the ticks
    // if there are no associated values  
    this.all_ticks = this.options.ticks;
    this.ticks_formater = _.isFunction(this.options.ticks_formater) ? this.options.ticks_formater : _.identity;
    this.ticks = (
      _.filter(
        this.all_ticks, 
        (tick, i) => _.some( this.series, serie => !_.isUndefined(serie[i]) ) 
      )
    );

    this.x = d3.scalePoint()
      .domain(this.ticks)
      .range([0, width]);

    this.tick_width = this.x.step();

    this.extent = d3.extent( d3.merge(this.values) );

    // Historically, we always used a 10% padding above and below the max values on the y-axis
    // That flat rate is an issue when the scale of the values is much greater than the variation (get a bunch of flat lines)
    const calculate_delta_based_padding_factor = () => {
      const center = _.mean(this.extent);
      const average_delta = _.chain(this.values)
        .map( series => _.chain(series)
          .map( (value, ix) => ix+1 < series.length ? 
            Math.abs(series[ix+1] - value) : 
            false
          )
          .filter()
          .mean()
          .value()
        )
        .filter()
        .mean()
        .value();

      const delta_based_padding_factor = Math.abs(2*average_delta/center);

      return (!_.isNaN(delta_based_padding_factor) && delta_based_padding_factor < 0.1) ? 
        delta_based_padding_factor :
        0.1;
    };

    this.y_domain_padding = _.isNumber(this.options.y_domain_padding) ?
      this.options.y_domain_padding :
      calculate_delta_based_padding_factor();

    if (this.series_labels.length === 0){
      return;
    }

    if (this.options.stacked === true){
      this.clear_lines();
      this.render_stacked();
    } else {
      this.clear_stacks();
      this.render_lines();
    }

    this.render_common();

    return this;
  };
  clear_lines(){
    this.graph_area
      .selectAll("g.line")
      .transition()
      .duration(750)
      .attr("transform", "scale(0,1)")
      .remove();
  };
  clear_stacks(){
    this.graph_area
      .selectAll("g.serie")
      .transition()
      .duration(750)
      .attr("transform", "scale(0,1)")
      .remove();
  };
  render_stacked(){

    const height = this.outside_height - this.margin.top - this.margin.bottom;

    // remap the data to suitable format for the stacked
    // layout

    const keys = _.keys(this.series)

    const series = _.chain(this.series)
      .toPairs()
      .map( ([key, vals]) => 
        _.map( 
          vals, 
          (val,ix) => ({key: key, value: val, index: this.ticks[ix]}) 
        ) 
      )
      .flatten()
      .groupBy("index")
      .map(group => ({
        year: _.first(group).index,
        ..._.chain(group)
          .map( ({key, value}) => [ key, value ] )
          .fromPairs()
          .value(),
      }))
      .sortBy("index")
      .value()

    var stack_layout = d3.stack()
      .keys(keys);

    var stacks = stack_layout(series);

    // calculate the maximum value for any of the ticks to calibrate
    // the y scale value
    const max_value = d3.max(
      stacks, 
      (stack) => d3.max(stack, (d) => d[1] ) 
    );

    this.y = d3.scaleLinear()
      .domain([0, max_value])
      .range([height, 0]);

    var area = d3.area()
      .x( (d, i) => this.x(d.data.year) )
      .y0( d => this.y(d[0]) )
      .y1( d => this.y(d[1]) );

    var lines = this.graph_area
      .selectAll("g.serie")
      .data( _.map(stacks, stack => stack.key) );
                
    const lines_enter = lines
      .enter()
      .append('g')
      .attr("class", "serie");

    lines_enter
      .append("path")
      .attr("class", "area");

    lines.merge(lines_enter)
      .select('path.area')
      .attr("transform", "scale(0,1)") // scale transform's used for the entering animation
      .styles({
        "fill": key => this.colors(key),
        "fill-opacity": 0.6,
        "stroke-width": "1px",
        "stroke": key => this.colors(key),
      })
      .attr( "d", key => area( _.find(stacks, stack => stack.key === key) ) );

    this.graph_area
      .selectAll("path.area")
      .transition()
      .duration(750)
      .attr("transform", "scale(1,1)");

    lines.exit().remove();
  };

  render_lines(){

    var that = this;
    var height = this.outside_height - this.margin.top - this.margin.bottom;
    
    const y_bottom = this.extent[0] > 0 ? 
      (1 - this.y_domain_padding) * this.extent[0] : 
      (1 + this.y_domain_padding) * this.extent[0];

    const y_top = this.extent[1] >= 0 ? 
      (1 + this.y_domain_padding) * this.extent[1] :
      0;

    const y_domain = [y_bottom, y_top];

    this.y = d3.scaleLinear()
      .domain(y_domain)
      .range([height, 0]);

    var lines = this.graph_area
      .selectAll("g.line")
      .data( d3.keys(this.series), d => d );

    const lines_enter = lines.enter()
      .append("g")
      .attr("class", "line")
      .attr("transform", "scale(0,1)"); // scale transform's used for the entering animation

    lines.merge(lines_enter)
      .each(function(d, i){
        // d = the series name
        // i = the index

        var g = d3.select(this);

        // pair the data with the ticks, any undefined
        // data values will cause the tick not to be marked
        var data =_.chain(that.all_ticks)
          .zip(that.series[d])
          .filter(function(_d){
            return !_.isUndefined(_d[1]);
          })
          .value();

        var xfunc = (_d) => that.x(_d[0]);
        var yfunc = (_d) => that.y(_d[1]);
      
        var line = d3.line() 
          .x(xfunc)
          .y(yfunc);

        var path = g.selectAll("path")
          .data([data]);

        const path_enter = path.enter()
          .append("path");

        path.merge(path_enter)
          .styles({
            "fill": "none",
            "stroke": that.colors(d),
            "stroke-opacity": 1,
            "stroke-width": "3px",
          })
          .attr("d", line);

        var dots = g.selectAll("circle.dots")
          .data(data);

        const dots_enter = dots
          .enter()
          .append("circle")
          .attr("class", "dots")
          .on("mouseover", that.dispatch.dataHover)
          .on("mouseout", that.dispatch.dataHoverOut);

        dots.merge(dots_enter)
          .attrs({
            "class": "dots",
            "cy": yfunc,
            "cx": xfunc,
            "r": "4",
          })
          .styles({
            "fill": that.colors(d),
            "fill-opacity": 0.8,
          });
      });

    this.graph_area
      .selectAll(".line")
      .transition()
      .duration(750)
      .attr("transform", "scale(1,1)");

    lines.exit()
      .transition()
      .duration(750)
      .attr("transform", "scale(0,1)")
      .remove();
  };

  render_common(){
    var height = this.outside_height - this.margin.top - this.margin.bottom;
    var width = this.outside_width - this.margin.left - this.margin.right;
    
    // add the title
    if (this.options.title){
      this.svg.select("text.title").remove();
      this.svg.append("text")
        .attrs({
          "class": "title",
          "x": this.margin.left + width/2,
          "y": 12,
        })
        .styles({
          "text-anchor": "middle",
          "font-size": "12px",
          "font-weight": "500",
        })
        .text(this.title);
    }
    
    if (this.add_xaxis){

      var xAxis = d3.axisBottom()
        .scale(this.x)
        .tickSizeOuter(0)
        .tickPadding(5);

      
      var xaxis_node = this.graph_area.select(".x.axis");

      if (!xaxis_node.node()){
        xaxis_node = this.graph_area
          .append("g");
      }

      const xaxis_y_position = this.extent[0] < 0 && this.extent[1] > 0 ?
        this.y(0) :
        height;

      xaxis_node
        .attr("class", "x " + this.axis_class)
        .attr("transform", "translate(0," + xaxis_y_position+ ")");

      xaxis_node.call(xAxis);

      this.html
        .selectAll(".tick")
        .remove();

      let ticks = this.html.selectAll("div.tick")
        .data(this.ticks)

      let ticks_enter = ticks
        .enter()
        .append("div")
        .attr("class","tick")

      ticks.merge(ticks_enter)
        .styles({
          "position": "absolute",
          "overflow-x": "hidden",
          "text-align": "center",
          "top": height+this.margin.top+10+"px",
          "width": this.tick_width+"px",
          "left": d => this.x(d)-this.tick_width/2+this.margin.left+"px",
        })
        .html(this.ticks_formater);
      
      if (!this.x_axis_line){
        this.graph_area.select(".x.axis path").remove();
      }

      if (!this.options.hide_gridlines){
        common_charts_utils.add_grid_lines("vertical", this.grid_line_area, xAxis, height);
      }
    }

    if (this.add_yaxis) {

      this.graph_area.select(".y.axis").remove();

      const formater_gives_unique_ticks = (formater) => _.chain( this.y.ticks(5) )
        .map(formater)
        .uniq()
        .value().length === this.y.ticks(5).length;
      const pick_best_formater_option = () => {
        if ( _.isEmpty(this.formaters) ){
          return this.formater;
        } else {
          const good_formaters = _.filter(this.formaters, formater_gives_unique_ticks);
          if ( !_.isEmpty(good_formaters) ){
            return good_formaters[0];
          } else {
            return this.formater;
          }
        }
      };

      var yAxis = d3.axisLeft()
        .scale(this.y)
        .ticks(5)
        .tickSizeOuter(0)
        .tickFormat( pick_best_formater_option() );

      var yaxis_node = this.graph_area.select(".y.axis");

      if (!yaxis_node.node()){
        yaxis_node = this.graph_area
          .append("g")
          .attr("class", "y " + this.axis_class);
      }

      yaxis_node.call(yAxis)
        .append("text")
        .attr("class","axis-label")
        .attr("fill", "#000")
        .attr("x", 0)
        .attr("y", -5)
        .text(this.options.y_axis || '');
    }

    if (!this.options.hide_gridlines){
      common_charts_utils.add_grid_lines("horizontal", this.grid_line_area, yAxis, width);
    }
    
    this.dispatch.call("renderEnd",this);
  };
};
