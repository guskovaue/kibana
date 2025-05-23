/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { EventOutcome } from '../../../../common/event_outcome';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { SERVICE_NODE_NAME_MISSING } from '../../../../common/service_nodes';
import type { Coordinate } from '../../../../typings/timeseries';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  getBackwardCompatibleDocumentTypeFilter,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { calculateThroughputWithRange } from '../../../lib/helpers/calculate_throughput';
import { getBucketSizeForAggregatedTransactions } from '../../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../../lib/helpers/latency_aggregation_type';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

interface ServiceInstanceTransactionPrimaryStatistics {
  serviceNodeName: string;
  errorRate: number;
  latency: number;
  throughput: number;
}

interface ServiceInstanceTransactionComparisonStatistics {
  serviceNodeName: string;
  errorRate: Coordinate[];
  latency: Coordinate[];
  throughput: Coordinate[];
}

type ServiceInstanceTransactionStatistics<T> = T extends true
  ? ServiceInstanceTransactionComparisonStatistics
  : ServiceInstanceTransactionPrimaryStatistics;

export async function getServiceInstancesTransactionStatistics<T extends true | false>({
  environment,
  kuery,
  latencyAggregationType,
  apmEventClient,
  transactionType,
  serviceName,
  size,
  searchAggregatedTransactions,
  start,
  end,
  serviceNodeIds,
  numBuckets,
  includeTimeseries,
  offset,
}: {
  latencyAggregationType: LatencyAggregationType;
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionType: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  includeTimeseries: T;
  serviceNodeIds?: string[];
  environment: string;
  kuery: string;
  size?: number;
  numBuckets?: number;
  offset?: string;
}): Promise<Array<ServiceInstanceTransactionStatistics<T>>> {
  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const { intervalString, bucketSize } = getBucketSizeForAggregatedTransactions({
    start: startWithOffset,
    end: endWithOffset,
    numBuckets,
    searchAggregatedTransactions,
  });

  const field = getDurationFieldForTransactions(searchAggregatedTransactions);

  const subAggs = {
    ...getLatencyAggregation(latencyAggregationType, field),
    failures: {
      filter: {
        term: {
          [EVENT_OUTCOME]: EventOutcome.failure,
        },
      },
    },
  };

  const query = {
    bool: {
      filter: [
        { term: { [SERVICE_NAME]: serviceName } },
        { term: { [TRANSACTION_TYPE]: transactionType } },
        ...getBackwardCompatibleDocumentTypeFilter(searchAggregatedTransactions),
        ...rangeQuery(startWithOffset, endWithOffset),
        ...environmentQuery(environment),
        ...kqlQuery(kuery),
        ...getBackwardCompatibleDocumentTypeFilter(searchAggregatedTransactions),
        ...(serviceNodeIds?.length ? [{ terms: { [SERVICE_NODE_NAME]: serviceNodeIds } }] : []),
      ],
    },
  };

  const aggs = {
    [SERVICE_NODE_NAME]: {
      terms: {
        field: SERVICE_NODE_NAME,
        missing: SERVICE_NODE_NAME_MISSING,
        ...(size ? { size } : {}),
        ...(serviceNodeIds?.length ? { include: serviceNodeIds } : {}),
      },
      aggs: includeTimeseries
        ? {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: { min: startWithOffset, max: endWithOffset },
              },
              aggs: subAggs,
            },
          }
        : subAggs,
    },
  };

  const response = await apmEventClient.search('get_service_instances_transaction_statistics', {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    size: 0,
    track_total_hits: false,
    query,
    aggs,
  });

  const bucketSizeInMinutes = bucketSize / 60;

  return (
    (response.aggregations?.[SERVICE_NODE_NAME].buckets.map((serviceNodeBucket) => {
      const { doc_count: count, key } = serviceNodeBucket;
      const serviceNodeName = String(key);

      // Timeseries is returned when includeTimeseries is true
      if ('timeseries' in serviceNodeBucket) {
        const { timeseries } = serviceNodeBucket;
        return {
          serviceNodeName,
          errorRate: timeseries.buckets.map((dateBucket) => ({
            x: dateBucket.key,
            y: dateBucket.failures.doc_count / dateBucket.doc_count,
          })),
          throughput: timeseries.buckets.map((dateBucket) => ({
            x: dateBucket.key,
            y: dateBucket.doc_count / bucketSizeInMinutes,
          })),
          latency: timeseries.buckets.map((dateBucket) => ({
            x: dateBucket.key,
            y: getLatencyValue({
              aggregation: dateBucket.latency,
              latencyAggregationType,
            }),
          })),
        };
      } else {
        const { failures, latency } = serviceNodeBucket;
        return {
          serviceNodeName,
          errorRate: failures.doc_count / count,
          latency: getLatencyValue({
            aggregation: latency,
            latencyAggregationType,
          }),
          throughput: calculateThroughputWithRange({
            start: startWithOffset,
            end: endWithOffset,
            value: count,
          }),
        };
      }
    }) as Array<ServiceInstanceTransactionStatistics<T>>) || []
  );
}
