/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Lifecycle } from '@hapi/hapi';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { JsonArray, JsonValue } from '@kbn/utility-types';
import type { RouteConfig, RouteMethod, RouteSecurity } from '@kbn/core/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { VisTypeTimeseriesSetup } from '@kbn/vis-type-timeseries-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import type { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import type { LogsSharedPluginSetup, LogsSharedPluginStart } from '@kbn/logs-shared-plugin/server';
import type { VersionedRouteConfig } from '@kbn/core-http-server';
import type { MetricsDataPluginSetup } from '@kbn/metrics-data-access-plugin/server';
import type {
  ProfilingDataAccessPluginSetup,
  ProfilingDataAccessPluginStart,
} from '@kbn/profiling-data-access-plugin/server';
import type {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
} from '@kbn/apm-data-access-plugin/server';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import type { ServerlessPluginStart } from '@kbn/serverless/server';

export interface InfraServerPluginSetupDeps {
  alerting: AlertingServerSetup;
  data: DataPluginSetup;
  home: HomeServerPluginSetup;
  features: FeaturesPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  observability: ObservabilityPluginSetup;
  share: SharePluginSetup;
  spaces: SpacesPluginSetup;
  usageCollection: UsageCollectionSetup;
  visTypeTimeseries: VisTypeTimeseriesSetup;
  ml?: MlPluginSetup;
  logsShared: LogsSharedPluginSetup;
  metricsDataAccess: MetricsDataPluginSetup;
  profilingDataAccess?: ProfilingDataAccessPluginSetup;
  apmDataAccess: ApmDataAccessPluginSetup;
  serverless?: ServerlessPluginStart;
}

export interface InfraServerPluginStartDeps {
  data: DataPluginStart;
  dataViews: DataViewsPluginStart;
  logsShared: LogsSharedPluginStart;
  profilingDataAccess?: ProfilingDataAccessPluginStart;
  ruleRegistry: RuleRegistryPluginStartContract;
  apmDataAccess: ApmDataAccessPluginStart;
  logsDataAccess: LogsDataAccessPluginStart;
}

export interface CallWithRequestParams extends estypes.RequestBase {
  max_concurrent_shard_requests?: number;
  name?: string;
  index?: string | string[];
  ignore_unavailable?: boolean;
  allow_no_indices?: boolean;
  size?: number;
  terminate_after?: number;
  fields?: estypes.Fields;
  path?: string;
  query?: string | object;
  track_total_hits?: boolean | number;
  body?: any;
}

export type InfraResponse = Lifecycle.ReturnValue;

export interface InfraFrameworkPluginOptions {
  register: any;
  options: any;
}

export interface InfraDatabaseResponse {
  took: number;
  timeout: boolean;
}

export interface InfraDatabaseSearchResponse<Hit = {}, Aggregations = undefined>
  extends InfraDatabaseResponse {
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  timed_out: boolean;
  aggregations?: Aggregations;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: Hit[];
  };
}

export interface InfraDatabaseMultiResponse<Hit, Aggregation> extends InfraDatabaseResponse {
  responses: Array<InfraDatabaseSearchResponse<Hit, Aggregation>>;
}

export interface InfraDatabaseGetIndicesAliasResponse {
  [indexName: string]: {
    aliases: {
      [aliasName: string]: any;
    };
  };
}

export interface InfraDatabaseGetIndicesResponse {
  [indexName: string]: {
    aliases: {
      [aliasName: string]: any;
    };
    mappings: {
      _meta: object;
      dynamic_templates: any[];
      date_detection: boolean;
      properties: {
        [fieldName: string]: any;
      };
    };
    settings: { index: object };
  };
}

export type SearchHit = estypes.SearchHit;

export interface SortedSearchHit extends SearchHit {
  sort: any[];
  _source: {
    [field: string]: JsonValue;
  };
  fields: {
    [field: string]: JsonArray;
  };
}

export type InfraDateRangeAggregationBucket<NestedAggregation extends object = {}> = {
  from?: number;
  to?: number;
  doc_count: number;
  key: string;
} & NestedAggregation;

export interface InfraDateRangeAggregationResponse<NestedAggregation extends object = {}> {
  buckets: Array<InfraDateRangeAggregationBucket<NestedAggregation>>;
}

export interface InfraTopHitsAggregationResponse {
  hits: {
    hits: [];
  };
}

export interface InfraMetadataAggregationBucket {
  key: string;
}

export interface InfraMetadataAggregationResponse {
  buckets: InfraMetadataAggregationBucket[];
}

export interface InfraFieldsResponse {
  [name: string]: InfraFieldDef;
}

export interface InfraFieldDetails {
  searchable: boolean;
  aggregatable: boolean;
  type: string;
}

export interface InfraFieldDef {
  [type: string]: InfraFieldDetails;
}

export type InfraRouteConfig<Params, Query, Body, Method extends RouteMethod> = {
  method: RouteMethod;
} & Omit<RouteConfig<Params, Query, Body, Method>, 'security'> & { security?: RouteSecurity };

export type InfraVersionedRouteConfig<Method extends RouteMethod> = {
  method: RouteMethod;
} & Omit<VersionedRouteConfig<Method>, 'security'> & { security?: RouteSecurity };
