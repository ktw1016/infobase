import express from 'express';
import body_parser from 'body-parser';
import expressGraphQL from 'express-graphql'; 
import compression from 'compression';
import cors from 'cors';
import depthLimit from 'graphql-depth-limit';

import {
  create_models,
  create_schema,
} from './models/index.js';
import { connect_db } from "./db_utils.js";
import {
  convert_GET_with_compressed_query_to_POST,
  log_query,
} from './server_utils.js'


create_models();
connect_db();

const schema = create_schema();
const app = express();

app.use( body_parser.json({ limit: '50mb' }) );
app.use( compression() );
app.use( cors() );

app.use("/", function (req, res, next) {
  res.header('cache-control', 'public, max-age=31536000');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, encoded-compressed-query');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    if ( req.method === "GET" && !_.isEmpty(req.headers['encoded-compressed-query']) ){
      convert_GET_with_compressed_query_to_POST(req); // mutates req, changes persist to subsequent middleware
    }

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
