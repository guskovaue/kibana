/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';
import { math, MathArguments } from './math';
import { Datatable, DatatableColumn, DatatableColumnType, getType } from '../../expression_types';

export type MathColumnArguments = MathArguments & {
  id: string;
  name?: string;
  castColumns?: string[];
  copyMetaFrom?: string | null;
};

export type ExpressionFunctionMathColumn = ExpressionFunctionDefinition<
  'mathColumn',
  Datatable,
  MathColumnArguments,
  Promise<Datatable>
>;

export const mathColumn: ExpressionFunctionMathColumn = {
  name: 'mathColumn',
  type: 'datatable',
  inputTypes: ['datatable'],
  help: i18n.translate('expressions.functions.mathColumnHelpText', {
    defaultMessage:
      'Adds a column by evaluating {tinymath} on each row. ' +
      'This function is optimized for math and performs better than using a math expression in {mapColumnFn}.',
    values: {
      mapColumnFn: '`mapColumn`',
      tinymath: '`TinyMath`',
    },
  }),
  args: {
    ...math.args,
    id: {
      types: ['string'],
      help: i18n.translate('expressions.functions.mathColumn.args.idHelpText', {
        defaultMessage: 'id of the resulting column. Must be unique.',
      }),
      required: true,
    },
    name: {
      types: ['string'],
      aliases: ['_', 'column'],
      help: i18n.translate('expressions.functions.mathColumn.args.nameHelpText', {
        defaultMessage: 'The name of the resulting column. Names are not required to be unique.',
      }),
      required: true,
    },
    castColumns: {
      types: ['string'],
      multi: true,
      help: i18n.translate('expressions.functions.mathColumn.args.castColumnsHelpText', {
        defaultMessage: 'The ids of columns to cast to numbers before applying the formula',
      }),
      required: false,
    },
    copyMetaFrom: {
      types: ['string', 'null'],
      help: i18n.translate('expressions.functions.mathColumn.args.copyMetaFromHelpText', {
        defaultMessage:
          "If set, the meta object from the specified column id is copied over to the specified target column. If the column doesn't exist it silently fails.",
      }),
      required: false,
      default: null,
    },
  },
  fn: async (input, args, context) => {
    const columns = [...input.columns];
    const existingColumnIndex = columns.findIndex(({ id }) => {
      return id === args.id;
    });
    if (existingColumnIndex > -1) {
      throw new Error(
        i18n.translate('expressions.functions.mathColumn.uniqueIdError', {
          defaultMessage: 'ID must be unique',
        })
      );
    }

    const newRows = await Promise.all(
      input.rows.map(async (row) => {
        let preparedRow = row;
        if (args.castColumns) {
          preparedRow = { ...row };
          args.castColumns.forEach((columnId) => {
            switch (typeof row[columnId]) {
              case 'string':
                const parsedAsDate = Number(new Date(preparedRow[columnId]));
                if (!isNaN(parsedAsDate)) {
                  preparedRow[columnId] = parsedAsDate;
                  return;
                } else {
                  preparedRow[columnId] = Number(preparedRow[columnId]);
                  return;
                }
              case 'boolean':
                preparedRow[columnId] = Number(preparedRow[columnId]);
                return;
            }
          });
        }
        const result = await math.fn(
          {
            ...input,
            columns: input.columns,
            rows: [preparedRow],
          },
          {
            expression: args.expression,
            onError: args.onError,
          },
          context
        );

        if (Array.isArray(result)) {
          if (result.length === 1) {
            return { ...row, [args.id]: result[0] };
          }
          throw new Error(
            i18n.translate('expressions.functions.mathColumn.arrayValueError', {
              defaultMessage: 'Cannot perform math on array values at {name}',
              values: { name: args.name },
            })
          );
        }

        return { ...row, [args.id]: result };
      })
    );
    let type: DatatableColumnType = 'null';
    if (newRows.length) {
      for (const row of newRows) {
        const rowType = getType(row[args.id]) as DatatableColumnType;
        if (rowType !== 'null') {
          type = rowType;
          break;
        }
      }
    }
    const newColumn: DatatableColumn = {
      id: args.id,
      name: args.name ?? args.id,
      meta: { type, params: { id: type } },
    };
    if (args.copyMetaFrom) {
      const metaSourceFrom = columns.find(({ id }) => id === args.copyMetaFrom);
      newColumn.meta = { ...newColumn.meta, ...(metaSourceFrom?.meta || {}) };
    }

    columns.push(newColumn);

    return {
      ...input,
      columns,
      rows: newRows,
    } as Datatable;
  },
};
