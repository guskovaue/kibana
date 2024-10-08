/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { isDataViewSource, isEsqlSource } from '../../../common/data_sources';
import type { DataSourceProfileProviderParams } from '../profiles';

/**
 * Extracts the index pattern from the given ES|QL query or data view
 * @param options Options object
 * @returns The extracted index pattern or null
 */
export const extractIndexPatternFrom = ({
  dataSource,
  dataView,
  query,
}: Pick<DataSourceProfileProviderParams, 'dataSource' | 'dataView' | 'query'>) => {
  if (isEsqlSource(dataSource) && isOfAggregateQueryType(query)) {
    return getIndexPatternFromESQLQuery(query.esql);
  } else if (isDataViewSource(dataSource) && dataView) {
    return dataView.getIndexPattern();
  }

  return null;
};
