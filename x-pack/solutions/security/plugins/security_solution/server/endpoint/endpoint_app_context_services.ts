/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  ElasticsearchClient,
  HttpServiceSetup,
  KibanaRequest,
  LoggerFactory,
  SavedObjectsServiceStart,
  SecurityServiceStart,
} from '@kbn/core/server';
import type { ExceptionListClient, ListsServerExtensionRegistrar } from '@kbn/lists-plugin/server';
import type { CasesClient, CasesServerStart } from '@kbn/cases-plugin/server';
import type {
  FleetFromHostFileClientInterface,
  FleetStartContract,
  MessageSigningServiceInterface,
} from '@kbn/fleet-plugin/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { FleetActionsClientInterface } from '@kbn/fleet-plugin/server/services/actions/types';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { Space } from '@kbn/spaces-plugin/common';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { ReferenceDataClientInterface } from './lib/reference_data';
import { ReferenceDataClient } from './lib/reference_data';
import type { TelemetryConfigProvider } from '../../common/telemetry_config/telemetry_config_provider';
import { SavedObjectsClientFactory } from './services/saved_objects';
import type { ResponseActionsClient } from './services';
import { getResponseActionsClient, NormalizedExternalConnectorClient } from './services';
import {
  getAgentPolicyCreateCallback,
  getAgentPolicyPostUpdateCallback,
  getAgentPolicyUpdateCallback,
  getPackagePolicyCreateCallback,
  getPackagePolicyDeleteCallback,
  getPackagePolicyPostCreateCallback,
  getPackagePolicyPostUpdateCallback,
  getPackagePolicyUpdateCallback,
} from '../fleet_integration/fleet_integration';
import type { ManifestManager } from './services/artifacts';
import type { ConfigType } from '../config';
import type { IRequestContextFactory } from '../request_context_factory';
import type { LicenseService } from '../../common/license';
import { EndpointMetadataService } from './services/metadata';
import {
  EndpointAppContentServicesNotSetUpError,
  EndpointAppContentServicesNotStartedError,
} from './errors';
import type {
  EndpointFleetServicesFactoryInterface,
  EndpointInternalFleetServicesInterface,
} from './services/fleet/endpoint_fleet_services_factory';
import { EndpointFleetServicesFactory } from './services/fleet/endpoint_fleet_services_factory';
import { registerListsPluginEndpointExtensionPoints } from '../lists_integration';
import type { EndpointAuthz } from '../../common/endpoint/types/authz';
import { calculateEndpointAuthz } from '../../common/endpoint/service/authz';
import type { FeatureUsageService } from './services/feature_usage/service';
import type { ExperimentalFeatures } from '../../common/experimental_features';
import type { ProductFeaturesService } from '../lib/product_features_service/product_features_service';
import type { ResponseActionAgentType } from '../../common/endpoint/service/response_actions/constants';

export interface EndpointAppContextServiceSetupContract {
  securitySolutionRequestContextFactory: IRequestContextFactory;
  cloud: CloudSetup;
  loggerFactory: LoggerFactory;
  telemetry: AnalyticsServiceSetup;
  httpServiceSetup: HttpServiceSetup;
}

export interface EndpointAppContextServiceStartContract {
  fleetStartServices: FleetStartContract;
  manifestManager: ManifestManager;
  security: SecurityServiceStart;
  alerting: AlertingServerStart;
  config: ConfigType;
  registerListsServerExtension?: ListsServerExtensionRegistrar;
  licenseService: LicenseService;
  exceptionListsClient: ExceptionListClient | undefined;
  cases: CasesServerStart | undefined;
  featureUsageService: FeatureUsageService;
  experimentalFeatures: ExperimentalFeatures;
  /** An internal ES client */
  esClient: ElasticsearchClient;
  productFeaturesService: ProductFeaturesService;
  savedObjectsServiceStart: SavedObjectsServiceStart;
  connectorActions: ActionsPluginStartContract;
  telemetryConfigProvider: TelemetryConfigProvider;
  spacesService: SpacesServiceStart | undefined;
}

/**
 * A singleton that holds shared services that are initialized during the start up phase
 * of the plugin lifecycle. And stop during the stop phase, if needed.
 */
export class EndpointAppContextService {
  private setupDependencies: EndpointAppContextServiceSetupContract | null = null;
  private startDependencies: EndpointAppContextServiceStartContract | null = null;
  private fleetServicesFactory: EndpointFleetServicesFactoryInterface | null = null;
  private savedObjectsFactoryService: SavedObjectsClientFactory | null = null;

  public security: SecurityServiceStart | undefined;

  public setup(dependencies: EndpointAppContextServiceSetupContract) {
    this.setupDependencies = dependencies;
  }

  public start(dependencies: EndpointAppContextServiceStartContract) {
    if (!this.setupDependencies) {
      throw new EndpointAppContentServicesNotSetUpError();
    }

    const savedObjectsFactory = new SavedObjectsClientFactory(
      dependencies.savedObjectsServiceStart,
      this.setupDependencies.httpServiceSetup
    );

    this.startDependencies = dependencies;
    this.security = dependencies.security;
    this.savedObjectsFactoryService = savedObjectsFactory;
    this.fleetServicesFactory = new EndpointFleetServicesFactory(
      dependencies.fleetStartServices,
      savedObjectsFactory,
      this.createLogger('endpointFleetServices')
    );

    this.registerFleetExtensions();
    this.registerListsExtensions();
  }

  public stop() {
    this.startDependencies = null;
    this.savedObjectsFactoryService = null;
  }

  private registerListsExtensions() {
    if (this.startDependencies?.registerListsServerExtension) {
      registerListsPluginEndpointExtensionPoints(
        this.startDependencies?.registerListsServerExtension,
        this
      );
    }
  }

  private registerFleetExtensions() {
    if (!this.setupDependencies) {
      throw new EndpointAppContentServicesNotSetUpError();
    }
    if (!this.startDependencies) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    const {
      fleetStartServices: { registerExternalCallback: registerFleetCallback },
      manifestManager,
      alerting,
      licenseService,
      telemetryConfigProvider,
      productFeaturesService,
    } = this.startDependencies;
    const logger = this.createLogger('endpointFleetExtension');

    registerFleetCallback(
      'agentPolicyCreate',
      getAgentPolicyCreateCallback(logger, productFeaturesService)
    );
    registerFleetCallback(
      'agentPolicyUpdate',
      getAgentPolicyUpdateCallback(logger, productFeaturesService)
    );

    registerFleetCallback('agentPolicyPostUpdate', getAgentPolicyPostUpdateCallback(this));

    registerFleetCallback(
      'packagePolicyCreate',
      getPackagePolicyCreateCallback(
        logger,
        manifestManager,
        this.setupDependencies.securitySolutionRequestContextFactory,
        alerting,
        licenseService,
        this.setupDependencies.cloud,
        productFeaturesService,
        telemetryConfigProvider
      )
    );

    registerFleetCallback('packagePolicyPostCreate', getPackagePolicyPostCreateCallback(this));

    registerFleetCallback(
      'packagePolicyUpdate',
      getPackagePolicyUpdateCallback(this, this.setupDependencies.cloud, productFeaturesService)
    );

    registerFleetCallback('packagePolicyPostUpdate', getPackagePolicyPostUpdateCallback(this));

    registerFleetCallback('packagePolicyPostDelete', getPackagePolicyDeleteCallback(this));
  }

  /**
   * Property providing access to saved objects client factory
   */
  public get savedObjects(): SavedObjectsClientFactory {
    if (!this.savedObjectsFactoryService) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.savedObjectsFactoryService;
  }

  /**
   * Is kibana running in serverless mode
   */
  public isServerless(): boolean {
    if (!this.setupDependencies) {
      throw new EndpointAppContentServicesNotSetUpError();
    }

    // TODO:PT check what this returns when running locally with kibana in serverless emulation

    return Boolean(this.setupDependencies.cloud.isServerlessEnabled);
  }

  public getInternalEsClient(): ElasticsearchClient {
    if (!this.startDependencies?.esClient) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.esClient;
  }

  private getFleetAuthzService(): FleetStartContract['authz'] {
    if (!this.startDependencies?.fleetStartServices) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.fleetStartServices.authz;
  }

  public createLogger(...contextParts: string[]) {
    if (!this.setupDependencies?.loggerFactory) {
      throw new EndpointAppContentServicesNotSetUpError();
    }

    return this.setupDependencies.loggerFactory.get(...contextParts);
  }

  public async getEndpointAuthz(request: KibanaRequest): Promise<EndpointAuthz> {
    if (!this.startDependencies?.productFeaturesService) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    const fleetAuthz = await this.getFleetAuthzService().fromRequest(request);
    const userRoles = this.security?.authc.getCurrentUser(request)?.roles ?? [];
    return calculateEndpointAuthz(
      this.getLicenseService(),
      fleetAuthz,
      userRoles,
      this.startDependencies.productFeaturesService
    );
  }

  public getEndpointMetadataService(spaceId: string = DEFAULT_SPACE_ID): EndpointMetadataService {
    if (this.startDependencies == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    const spaceIdValue = this.experimentalFeatures.endpointManagementSpaceAwarenessEnabled
      ? spaceId
      : DEFAULT_SPACE_ID;

    return new EndpointMetadataService(
      this.startDependencies.esClient,
      this.savedObjects.createInternalScopedSoClient({ readonly: false, spaceId: spaceIdValue }),
      this.getInternalFleetServices(spaceIdValue),
      this.createLogger('endpointMetadata')
    );
  }

  /**
   * SpaceId should be defined if wanting go get back an inernal client that is scoped to a given space id
   * @param spaceId
   * @param unscoped
   */
  public getInternalFleetServices(
    spaceId?: string,
    unscoped: boolean = false
  ): EndpointInternalFleetServicesInterface {
    if (this.fleetServicesFactory === null) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.fleetServicesFactory.asInternalUser(
      this.experimentalFeatures.endpointManagementSpaceAwarenessEnabled ? spaceId : undefined,
      unscoped
    );
  }

  public getManifestManager(): ManifestManager | undefined {
    return this.startDependencies?.manifestManager;
  }

  public getLicenseService(): LicenseService {
    if (this.startDependencies == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    return this.startDependencies.licenseService;
  }

  public async getCasesClient(req: KibanaRequest): Promise<CasesClient> {
    if (this.startDependencies?.cases == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    return this.startDependencies.cases.getCasesClientWithRequest(req);
  }

  public getFeatureUsageService(): FeatureUsageService {
    if (this.startDependencies == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    return this.startDependencies.featureUsageService;
  }

  public get experimentalFeatures(): ExperimentalFeatures {
    if (this.startDependencies == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.experimentalFeatures;
  }

  public getExceptionListsClient(): ExceptionListClient {
    if (!this.startDependencies?.exceptionListsClient) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.exceptionListsClient;
  }

  public getMessageSigningService(): MessageSigningServiceInterface {
    if (!this.startDependencies?.fleetStartServices.messageSigningService) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies?.fleetStartServices.messageSigningService;
  }

  public getInternalResponseActionsClient({
    agentType = 'endpoint',
    username = 'elastic',
    taskId,
    taskType,
    spaceId,
  }: {
    spaceId: string;
    agentType?: ResponseActionAgentType;
    username?: string;
    /** Used with background task and needed for `UnsecuredActionsClient`  */
    taskId?: string;
    /** Used with background task and needed for `UnsecuredActionsClient`  */
    taskType?: string;
  }): ResponseActionsClient {
    if (!this.startDependencies?.esClient) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return getResponseActionsClient(agentType, {
      endpointService: this,
      esClient: this.startDependencies.esClient,
      username,
      spaceId,
      isAutomated: true,
      connectorActions: new NormalizedExternalConnectorClient(
        this.startDependencies.connectorActions.getUnsecuredActionsClient(),
        this.createLogger('responseActions'),
        {
          spaceId,
          relatedSavedObjects:
            taskId && taskType
              ? [
                  {
                    id: taskId,
                    type: taskType,
                  },
                ]
              : undefined,
        }
      ),
    });
  }

  public async getFleetToHostFilesClient() {
    if (!this.startDependencies?.fleetStartServices) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.fleetStartServices.createFilesClient.toHost(
      'endpoint',
      this.startDependencies.config.maxUploadResponseActionFileBytes
    );
  }

  public async getFleetFromHostFilesClient(): Promise<FleetFromHostFileClientInterface> {
    if (!this.startDependencies?.fleetStartServices) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.fleetStartServices.createFilesClient.fromHost('endpoint');
  }

  public async getFleetActionsClient(): Promise<FleetActionsClientInterface> {
    if (!this.startDependencies?.fleetStartServices) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.fleetStartServices.createFleetActionsClient('endpoint');
  }

  public getTelemetryService(): AnalyticsServiceSetup {
    if (!this.setupDependencies?.telemetry) {
      throw new EndpointAppContentServicesNotSetUpError();
    }
    return this.setupDependencies.telemetry;
  }

  public getActiveSpace(httpRequest: KibanaRequest): Promise<Space> {
    if (!this.startDependencies?.spacesService) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.spacesService.getActiveSpace(httpRequest);
  }

  public getReferenceDataClient(): ReferenceDataClientInterface {
    if (!this.startDependencies?.savedObjectsServiceStart) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return new ReferenceDataClient(
      this.savedObjects.createInternalScopedSoClient({ readonly: false }),
      this.createLogger('ReferenceDataClient')
    );
  }
}
