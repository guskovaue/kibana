/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  StreamGetResponse,
  WiredStreamGetResponse,
  findInheritedLifecycle,
  getInheritedFieldsFromAncestors,
  isGroupStreamDefinition,
  isUnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { IScopedClusterClient } from '@kbn/core/server';
import { partition } from 'lodash';
import { AssetClient } from '../../../lib/streams/assets/asset_client';
import { StreamsClient } from '../../../lib/streams/client';
import {
  getDataStreamLifecycle,
  getUnmanagedElasticsearchAssets,
} from '../../../lib/streams/stream_crud';
import { DashboardLink } from '../../../../common/assets';
import { ASSET_TYPE } from '../../../lib/streams/assets/fields';

export async function readStream({
  name,
  assetClient,
  streamsClient,
  scopedClusterClient,
}: {
  name: string;
  assetClient: AssetClient;
  streamsClient: StreamsClient;
  scopedClusterClient: IScopedClusterClient;
}): Promise<StreamGetResponse> {
  const [streamDefinition, dashboardsAndQueries] = await Promise.all([
    streamsClient.getStream(name),
    await assetClient.getAssetLinks(name, ['dashboard', 'query']),
  ]);

  const [dashboardLinks, queryLinks] = partition(
    dashboardsAndQueries,
    (asset): asset is DashboardLink => asset[ASSET_TYPE] === 'dashboard'
  );

  const dashboards = dashboardLinks.map((dashboard) => dashboard['asset.id']);
  const queries = queryLinks.map((query) => {
    return query.query;
  });

  if (isGroupStreamDefinition(streamDefinition)) {
    return {
      stream: streamDefinition,
      dashboards,
      queries,
    };
  }

  // These queries are only relavant for IngestStreams
  const [ancestors, dataStream] = await Promise.all([
    streamsClient.getAncestors(name),
    streamsClient.getDataStream(name).catch((e) => {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    }),
  ]);

  if (isUnwiredStreamDefinition(streamDefinition)) {
    return {
      stream: streamDefinition,
      elasticsearch_assets: dataStream
        ? await getUnmanagedElasticsearchAssets({
            dataStream,
            scopedClusterClient,
          })
        : undefined,
      data_stream_exists: !!dataStream,
      effective_lifecycle: getDataStreamLifecycle(dataStream),
      dashboards,
      queries,
      inherited_fields: {},
    };
  }

  const body: WiredStreamGetResponse = {
    stream: streamDefinition,
    dashboards,
    queries,
    effective_lifecycle: findInheritedLifecycle(streamDefinition, ancestors),
    inherited_fields: getInheritedFieldsFromAncestors(ancestors),
  };

  return body;
}
