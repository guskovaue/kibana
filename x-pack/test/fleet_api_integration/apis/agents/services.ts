/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import { format as formatUrl } from 'url';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export function getEsClientForAPIKey({ getService }: FtrProviderContext, esApiKey: string) {
  const config = getService('config');
  const url = formatUrl({ ...config.get('servers.elasticsearch'), auth: false });
  return new Client({
    nodes: [url],
    auth: {
      apiKey: esApiKey,
    },
    requestTimeout: config.get('timeouts.esRequestTimeout'),
    Connection: HttpConnection,
  });
}
