/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginServiceFactory } from '../create';
import { StorybookParams } from '../plugin_services.story';
import { PresentationCapabilitiesService } from './types';

type CapabilitiesServiceFactory = PluginServiceFactory<
  PresentationCapabilitiesService,
  StorybookParams
>;

export const capabilitiesServiceFactory: CapabilitiesServiceFactory = ({
  canAccessDashboards,
  canCreateNewDashboards,
  canSaveVisualizations,
  canSetAdvancedSettings,
}) => {
  const check = (value: boolean = true) => value;
  return {
    canAccessDashboards: () => check(canAccessDashboards),
    canCreateNewDashboards: () => check(canCreateNewDashboards),
    canSaveVisualizations: () => check(canSaveVisualizations),
    canSetAdvancedSettings: () => check(canSetAdvancedSettings),
  };
};
