/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { useState } from 'react';
import { EuiText, EuiButton, EuiLoadingSpinner, EuiCallOut } from '@elastic/eui';
import { type IHttpFetchError, isHttpFetchError } from '@kbn/core-http-browser';
import { Services } from './services';

interface Props {
  fetchRandomNumber: Services['fetchRandomNumber'];
}

export function RandomNumberRouteExample({ fetchRandomNumber }: Props) {
  const [error, setError] = useState<IHttpFetchError | undefined>(undefined);
  const [randomNumber, setRandomNumber] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const doFetch = useCallback(async () => {
    if (isFetching) return;
    setIsFetching(true);
    const response = await fetchRandomNumber();

    if (isHttpFetchError(response)) {
      setError(response);
    } else {
      setRandomNumber(response);
    }

    setIsFetching(false);
  }, [isFetching, fetchRandomNumber]);

  return (
    <React.Fragment>
      <EuiText>
        <h2>GET example</h2>
        <p>
          This examples uses a simple GET route that takes no parameters or body in the request and
          returns a single number.
        </p>
        <EuiButton
          data-test-subj="routingExampleFetchRandomNumber"
          disabled={isFetching}
          onClick={() => doFetch()}
        >
          {isFetching ? <EuiLoadingSpinner /> : 'Generate a random number'}
        </EuiButton>

        {error !== undefined ? (
          <EuiCallOut color="danger" iconType="warning">
            {JSON.stringify(error)}
          </EuiCallOut>
        ) : null}
        {randomNumber > -1 ? (
          <h2>
            Random number is <div data-test-subj="routingExampleRandomNumber">{randomNumber}</div>
          </h2>
        ) : null}
      </EuiText>
    </React.Fragment>
  );
}
