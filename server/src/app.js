import express from 'express';
import body_parser from 'body-parser';
import expressGraphQL from 'express-graphql'; 
import compression from 'compression';
import depthLimit from 'graphql-depth-limit';

import {
  create_models,
  create_schema,
} from './models/index.js';
import { connect_db } from "./db.js";
import { connect } from 'net';

const log_query = (req) => {
  const request_content = (!_.isEmpty(req.body) && req.body) || (!_.isEmpty(req.query) && req.query);
  request_content && 
    console.log( /* eslint-disable-line no-console */
      `query: ${
        request_content.query
      }${
        !_.isEmpty(request_content.variables) ? 
          `\nvariables: ${JSON.stringify(request_content.variables)}` : 
          ''
      }`
    );
};


create_models();
connect_db();
const schema = create_schema();
const app = express();

app.use( body_parser.json({ limit: '50mb' }) );
app.use( compression() );

app.use("/", function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    !global.IS_DEV_SERVER && log_query(req);
    next();
  }
});



app.use(
  '/',
  expressGraphQL( () => ({
    graphiql: true,
    schema: schema,
    context: {},
    validationRules: [ depthLimit(15) ],
  }))
);

module.exports = app;

