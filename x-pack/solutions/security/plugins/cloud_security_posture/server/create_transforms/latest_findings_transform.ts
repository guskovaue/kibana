/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  LATEST_FINDINGS_RETENTION_POLICY,
  FINDINGS_INDEX_PATTERN,
  DEPRECATED_CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN,
} from '@kbn/cloud-security-posture-common';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../common/constants';

const LATEST_FINDINGS_TRANSFORM_V830 = 'cloud_security_posture.findings_latest-default-0.0.1';
const LATEST_FINDINGS_TRANSFORM_V840 = 'cloud_security_posture.findings_latest-default-8.4.0';
const LATEST_FINDINGS_TRANSFORM_V880 = 'cloud_security_posture.findings_latest-default-8.8.0';

export const CURRENT_FINDINGS_TRANSFORM_VERSION =
  'cloud_security_posture.findings_latest-default-8.15.0';

export const DEPRECATED_FINDINGS_TRANSFORMS_VERSION = [
  LATEST_FINDINGS_TRANSFORM_V830,
  LATEST_FINDINGS_TRANSFORM_V840,
  LATEST_FINDINGS_TRANSFORM_V880,
];

export const latestFindingsTransform: TransformPutTransformRequest = {
  transform_id: CURRENT_FINDINGS_TRANSFORM_VERSION,
  description: 'Defines findings transformation to view only the latest finding per resource',
  source: {
    index: FINDINGS_INDEX_PATTERN,
  },
  dest: {
    index: DEPRECATED_CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN,
  },
  frequency: '5m',
  sync: {
    time: {
      field: 'event.ingested',
      delay: '60s',
    },
  },
  retention_policy: {
    time: {
      field: '@timestamp',
      max_age: LATEST_FINDINGS_RETENTION_POLICY,
    },
  },
  latest: {
    sort: '@timestamp',
    unique_key: ['resource.id', 'rule.id'],
  },
  settings: { unattended: true },
  _meta: {
    package: {
      name: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
    },
    managed_by: 'cloud_security_posture',
    managed: true,
  },
};
