import { 
  mix,
  staticStoreMixin,
  PluralSingular, 
  SubjectMixin,
  CanHaveAPIData,
} from './storeMixins.js';
import { trivial_text_maker } from '../models/text.js';

const static_subject_store = () => mix().with(staticStoreMixin, PluralSingular, SubjectMixin);
const static_subject_store_with_API_data = () => mix().with(staticStoreMixin, PluralSingular, SubjectMixin, CanHaveAPIData);


const gov_name = ( 
  window.lang === 'en' ? 
  "Government" : 
  "Gouvernement" 
);


const Gov = {
  constructor: {
    type_name: 'gov',
  },
  id: 'gov',
  guid: 'gov_gov',
  is(comparator){
    if (_.isString( comparator)){
      return this.level === comparator;
    }
    return this.constructor === comparator;
  },
  level: 'gov',
  get has_planned_spending(){ return true;},
  lookup(){ return this; },
  name: gov_name,
  // the following name-like fields are for compatibility with old APIs and to ensure it's searchable in org-searches
  description: gov_name,
  title: gov_name,
  legal_name: gov_name,
  fancy_name: gov_name,
};


const Ministry = class Ministry extends static_subject_store(){
  static get type_name() { return 'ministry'; }
  static get singular(){ return trivial_text_maker("ministry"); }
  static get plural(){ return trivial_text_maker("ministries");}

  static create_and_register(id,name){
    const inst = new Ministry(id,name);
    this.register(id, inst);
    return inst;
  }
  constructor(id,name){
    super();
    this.id = id;
    this.name = name;
    this.description = "";
    this.orgs = [];
  }
};

const Dept = class Dept extends static_subject_store_with_API_data(){
  static lookup(org_id){
    return super.lookup(
      _.isNaN(+org_id) ?
      org_id :
      +org_id
    );
  }
  static get type_name() { return 'dept'; }
  static get singular(){ return trivial_text_maker("org"); }
  static get plural(){ return trivial_text_maker("orgs");}
  static depts_with_data(){ 
    //lazy initialized
    if(!this._depts_with_data){ 
      this._depts_with_data = _.filter(
        this.get_all(),
        dept => !_.isEmpty(dept.table_ids)
      );
    }
    return this._depts_with_data;
  }
  static depts_without_data(){ 
    //lazy initialized
    if(!this._depts_without_data){ 
      this._depts_without_data = _.filter(
        this.get_all(),
        dept => _.isEmpty(dept.table_ids)
      );
    }
    return this._depts_without_data;
  }
  static create_and_register(def){
    const inst = new Dept(def);
    this.register(inst.id,inst);
    if(!_.isEmpty(inst.dept_code)){
      this.register(inst.dept_code,inst);
    }
    return inst;
  }
  constructor(def){
    super();
    Object.assign(
      this, 
      {
        name: def.legal_name,
        id: def.unique_id,
        minister_objs: [],
        table_ids: [],
        crsos: [],
      },
      def
    );
  }
  get is_first_wave(){ // delete on drr17 exit
    return this.dp_status === 'fw';
  }

  get programs(){
    return _.chain(this.crsos)
      .map('programs')
      .flatten()
      .compact()
      .value();
  }
  // TODO: pipeline will change to set programs has_planned_spending to 0/1 (based on whether they have a stamped DP, and CRs and depts will roll this up (using _.some()))
  // wait on has_planned_spending and dp_status cleanup until then
  get has_planned_spending(){
    return !(
      _.includes([
        "CSEC", 
        "CSIS",
        "FCAC",
        "IJC",
        "GG",
      ],this.dept_code) ||
      _.includes([ 
        "Crown Corporations", 
        "Sociétés d'État", 
        "Parliamentary Entities",
        "Entités Parlementaires",
      ],this.inst_form)
    );
  }
  get is_rpp_org(){
    return this.dp_status !== false;
  }
  get dp_status(){ 
    const val = this._dp_status;
    if(val === 1){ 
      return "fw";
    } else if(val === 0){
      return "sw";
    } else {
      return false;
    }
  }
  get fancy_name(){
    return this.applied_title || this.name;
  }
  get old_name(){
    return this.old_applied_title;
  }
  get tables(){
    return this.table_ids; 
  }
  get min(){
    return this.ministry.name;
  }
  get minister(){
    return _.map(this.ministers, 'name');
  }
  get type(){ // not a great variable name, but too hard to fix all the instances that could exist
    return this.inst_form.name;
  }
  get auditor(){
    return this.auditor_str;
  }
  get is_dead(){
    return _.nonEmpty(this.end_yr) || this.status !== trivial_text_maker("active");
  }
  /*
    POPULATION GROUPS:

    fps (schedule I, faa_hr in (IV,V)
      cpa (schedule I, faa_hr IV)
        min_depts (schedule I)
        cpa_other_portion (schedule IV)
      separate_agencies (faa_hr V)
    na (schedule not I, faa_hr NULL)

  */
  get pop_group_gp_key(){
    const { schedule, faa_hr } = this;
    if(schedule==="I" || _.includes(["IV","V"], faa_hr) ){
      return "fps";
    } else {
      return "na";
    }
  }
  get pop_group_parent_key(){
    const { schedule, faa_hr } = this;
    if(this.pop_group_gp_key === 'fps'){
      if(schedule==="I" || faa_hr==="IV"){
        return "cpa";
      } else {
        return "separate_agencies"; 
      }
    }
  }
  get granular_pop_group_key(){
    const { schedule } = this;
    if(this.pop_group_parent_key === "cpa"){
      if(schedule === "I"){
        return "cpa_min_depts";
      } else {
        return "cpa_other_portion";
      }
    }
  }
};

const CRSO = class CRSO extends static_subject_store_with_API_data(){
  static get singular(){ return trivial_text_maker("");}
  static get plural(){ return trivial_text_maker(""); }
  static get type_name() { return 'crso'; }
  static get_from_id(crso_id){
    return this.lookup(crso_id);
  }
  static create_and_register(def){
    const inst = new CRSO(def);
    this.register(inst.id, inst);
    return inst;
  }
  constructor(attrs){
    super();
    Object.assign(
      this,
      { 
        programs: [], 
      }, 
      attrs
    );
  }
  singular(){ 
    if(this.is_cr){
      return trivial_text_maker("core_resp");
    } else {
      return trivial_text_maker("strategic_outcome");
    }
  }
  plural(){ 
    if(this.is_cr){
      return trivial_text_maker("core_resps");
    } else {
      return trivial_text_maker("strategic_outcomes");
    }
  }
  get fancy_name(){
    return this.name;
  }
  get has_planned_spending(){ 
    return _.some(this.programs, program => program.has_planned_spending);
  }
  get is_cr(){
    return this.is_drf;
  }
  get is_first_wave(){ // delete on drr17 exit
    return this.dept.is_first_wave;
  }
  get is_dead(){
    return !this.is_active;
  }
};

const Program = class Program extends static_subject_store_with_API_data(){
  static get type_name(){ return 'program'; }
  static get singular(){ return trivial_text_maker("program"); }
  static get plural(){ return trivial_text_maker("programs"); }
  static unique_id(dept, activity_code) { //dept can be an object, a dept_code or a dept unique_id.
    const dc = _.isObject(dept) ? dept.dept_code : Dept.lookup(dept).dept_code;
    return `${dc}-${activity_code}`;
  }
  static get_from_activity_code(dept_code , activity_code){
    return this.lookup(this.unique_id(dept_code,activity_code));
  }
  static create_and_register(def){
    const inst = new Program(def);
    this.register(inst.id, inst);
    return inst;
  }
  constructor(attrs){
    super();
    Object.assign(
      this,
      { 
        tags: [], 
      },
      attrs
    );
    this.id = this.constructor.unique_id(this.dept,this.activity_code);
  }
  get tags_by_scheme(){
    return _.groupBy(this.tags,tag => tag.root.id);
  }
  get has_planned_spending(){
    return this.dept.has_planned_spending;
  }
  get link_to_infographic(){
    return `#orgs/program/${this.id}/infograph`;
  }
  get fancy_name(){
    return this.name;
  }
  get is_first_wave(){ // delete on drr17 exit
    return this.crso.is_cr;
  }
  get is_dead(){
    return !this.is_active;
  }
};


//Currently doesnt do anything, not even link to other departments
const Minister = class Minister extends static_subject_store(){
  static get type_name() { return 'minister'; }
  static get singular(){ return trivial_text_maker("minister"); }
  static get plural(){ return trivial_text_maker("minister");}

  static create_and_register(id,name){
    const inst = new Minister(id,name);
    this.register(inst.id, inst);
    return inst;
  }
  constructor(id,name){
    super();
    this.id = id;
    this.name = name;
    this.description = "";
  }
};

const InstForm = class InstForm extends static_subject_store(){
  static grandparent_forms(){
    return _.filter(
      this.get_all(), 
      obj => _.isEmpty(obj.parent_forms)
    );
  }
  static parent_forms(){
    return _.filter(
      this.get_all(), 
      obj => (
        obj.parent_form && 
        _.nonEmpty(obj.children_forms)
      )
    );
  }
  static leaf_forms(){
    return _.filter(
      this.get_all(), 
      obj => _.isEmpty(obj.children_forms) 
    );
  }
  static create_and_register(id,name){
    const inst = new InstForm(id,name);
    this.register(inst.id, inst);
    return inst;
  }
  constructor(id,name){
    super();
    Object.assign(this, {
      id,
      name,
      //Below will be populated by the creator
      parent_form: null, 
      children_forms: [],
      orgs: [],
    });
  }
  singular(){
    throw "TODO";
  }
  plural(){
    throw "TODO";
  }
};


export { Gov, Dept, CRSO, Program, InstForm, Ministry, Minister };