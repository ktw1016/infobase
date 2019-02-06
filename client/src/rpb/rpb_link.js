
import { Subject } from '../models/subject.js';
import JSURL from 'jsurl';

const base_url = "#rpb/";
const rpb_link = (naive_state, useRouterFormat) => _.chain(naive_state)
  .pipe(obj => {
    const { table, subject, columns } = obj;

    return {...obj, 
      table: ( 
        table && table.is_table ?
          table.id :
          table
      ),
      subject: (
        subject && subject.level ?
          subject.guid : 
          subject
      ),
      columns: (
        _.first(columns) && _.first(columns).nick ? 
          _.map(columns, 'nick') :
          columns
      ),
    };
  })
  .pick([
    'columns',
    'subject',
    'mode',
    'dimension',
    'table',
    'preferDeptBreakout',
    'preferTable',
    'sort_col',
    'descending',
    'filter',
  ])
  .pipe(obj => JSURL.stringify(obj))
  .pipe( str => base_url+str )
  .pipe(str => useRouterFormat ? str.replace("#","/") : str )
  .value();

const get_appropriate_rpb_subject = subject => {
  let appropriate_subject = subject;
  if( _.includes(["program","crso"], subject.level) ){ //rpb is useless at the crso/program level
    appropriate_subject = subject.dept;
  } else if( subject.is('tag') ){
    appropriate_subject = Subject.Gov;
  }
  return appropriate_subject;
}

export {
  rpb_link, 
  get_appropriate_rpb_subject,
};