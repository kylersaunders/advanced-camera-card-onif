import { StateWatcherSubscriptionInterface } from '../../card-controller/hass/state-watcher';
import { CameraConfig } from '../../config/schema/cameras';
import { EntityRegistryManager } from '../../ha/registry/entity/types';
import { HomeAssistant } from '../../ha/types';
import { Camera } from '../camera';
import { GenericCameraManagerEngine } from '../generic/engine-generic';
import { CameraEventCallback, CameraManagerCameraMetadata, Engine } from '../types';
import { ONVIFCamera } from './camera';

export class ONVIFCameraManagerEngine extends GenericCameraManagerEngine {
  protected _entityRegistryManager: EntityRegistryManager;

  constructor(
    entityRegistryManager: EntityRegistryManager,
    stateWatcher: StateWatcherSubscriptionInterface,
    eventCallback?: CameraEventCallback,
  ) {
    super(stateWatcher, eventCallback);
    this._entityRegistryManager = entityRegistryManager;
  }

  public getEngineType(): Engine {
    return Engine.ONVIF;
  }

  public async createCamera(
    hass: HomeAssistant,
    cameraConfig: CameraConfig,
  ): Promise<Camera> {
    const camera = new ONVIFCamera(cameraConfig, this, {
      eventCallback: this._eventCallback,
    });
    return await camera.initialize({
      entityRegistryManager: this._entityRegistryManager,
      hass,
      stateWatcher: this._stateWatcher,
    });
  }

  public getCameraMetadata(
    hass: HomeAssistant,
    cameraConfig: CameraConfig,
  ): CameraManagerCameraMetadata {
    return {
      ...super.getCameraMetadata(hass, cameraConfig),
      engineIcon: 'onvif',
    };
  }
}



