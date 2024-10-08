/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { PLUGIN_ID, PLUGIN_NAME } from '../common/constants';
import { PageSimpleStringStream } from './containers/app/pages/page_simple_string_stream';
import { PageReducerStream } from './containers/app/pages/page_reducer_stream';
import { PageReduxStream } from './containers/app/pages/page_redux_stream';
import { ReduxStreamProvider } from './containers/app/pages/page_redux_stream/store';

interface RouteSectionDef {
  title: string;
  id: string;
  items: RouteDef[];
}

interface RouteDef {
  title: string;
  id: string;
  component: React.ReactNode;
}

export const routes: RouteSectionDef[] = [
  {
    title: PLUGIN_NAME,
    id: PLUGIN_ID,
    items: [
      {
        title: 'Simple string stream',
        id: 'simple-string-stream',
        component: <PageSimpleStringStream />,
      },
      {
        title: 'NDJSON useReducer stream',
        id: 'ndjson-usereducer-stream',
        component: <PageReducerStream />,
      },
      {
        title: 'NDJSON Redux Toolkit stream',
        id: 'ndjson-redux-toolkit-stream',
        component: (
          <ReduxStreamProvider>
            <PageReduxStream />
          </ReduxStreamProvider>
        ),
      },
    ],
  },
];
