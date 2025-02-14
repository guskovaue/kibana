/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface Tag {
  id?: string;
  name: string;
  description: string;
  color: string;
  managed: boolean;
}

export type TableRowAction = 'delete' | 'edit';

export type RowActions = {
  [action in TableRowAction]?: {
    enabled: boolean;
    reason?: string;
  };
};

export interface TableItemsRowActions {
  [id: string]: RowActions | undefined;
}

export interface SearchQueryError {
  message: string;
  name: string;
  queryText: string;
  containsForbiddenChars: boolean;
}
