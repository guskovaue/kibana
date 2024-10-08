/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SharePluginStart, SharePluginSetup } from '@kbn/share-plugin/public';
import { Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import { HelloLocator, HelloLocatorDefinition } from './locator';

interface SetupDeps {
  share: SharePluginSetup;
}

interface StartDeps {
  share: SharePluginStart;
}

export interface LocatorExamplesSetup {
  locator: HelloLocator;
}

export class LocatorExamplesPlugin
  implements Plugin<LocatorExamplesSetup, void, SetupDeps, StartDeps>
{
  public setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
    const locator = plugins.share.url.locators.create(new HelloLocatorDefinition());

    core.application.register({
      id: 'locatorExamples',
      title: 'Access links examples',
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./app');
        return renderApp(
          {
            appBasePath: params.appBasePath,
          },
          params
        );
      },
    });

    return {
      locator,
    };
  }

  public start() {}

  public stop() {}
}
