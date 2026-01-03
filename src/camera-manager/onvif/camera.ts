import { ActionsExecutor } from '../../card-controller/actions/types';
import { PTZAction, PTZActionPhase } from '../../config/schema/actions/custom/ptz';
import { CapabilitiesRaw, PTZCapabilities, PTZMovementType } from '../../types';
import { EntityCamera, EntityCameraInitializationOptions } from '../entity-camera';
import { getCameraEntityFromConfig } from '../utils/camera-entity-from-config';
import { getPTZCapabilitiesFromCameraConfig } from '../utils/ptz';

type ONVIFCameraInitializationOptions = EntityCameraInitializationOptions;

export class ONVIFCamera extends EntityCamera {
  protected async _initialize(
    _options: ONVIFCameraInitializationOptions,
  ): Promise<void> {
    // No special initialization needed for ONVIF cameras
  }

  protected async _getRawCapabilities(
    options: ONVIFCameraInitializationOptions,
  ): Promise<CapabilitiesRaw> {
    const configPTZ = getPTZCapabilitiesFromCameraConfig(this.getConfig());
    // ONVIF cameras support continuous PTZ movements
    const onvifPTZ: PTZCapabilities = {
      left: [PTZMovementType.Continuous],
      right: [PTZMovementType.Continuous],
      up: [PTZMovementType.Continuous],
      down: [PTZMovementType.Continuous],
      zoomIn: [PTZMovementType.Continuous],
      zoomOut: [PTZMovementType.Continuous],
    };

    const combinedPTZ: PTZCapabilities | null =
      configPTZ || onvifPTZ ? { ...onvifPTZ, ...configPTZ } : null;

    return {
      ...(await super._getRawCapabilities(options)),
      ...(combinedPTZ && { ptz: combinedPTZ }),
    };
  }

  public async executePTZAction(
    executor: ActionsExecutor,
    action: PTZAction,
    options?: {
      phase?: PTZActionPhase;
      preset?: string;
    },
  ): Promise<boolean> {
    if (await super.executePTZAction(executor, action, options)) {
      return true;
    }

    const cameraEntity = getCameraEntityFromConfig(this.getConfig());
    if (!cameraEntity) {
      return false;
    }

    // Handle stop phase - send stop command
    if (options?.phase === 'stop') {
      await executor.executeActions({
        actions: {
          action: 'perform-action',
          perform_action: 'onvif.ptz',
          data: {
            move_mode: 'Stop',
          },
          target: { entity_id: cameraEntity },
        },
      });
      return true;
    }

    // Handle presets (not implemented for ONVIF in this version)
    if (action === 'preset') {
      return false;
    }

    // Map PTZ actions to ONVIF format
    const onvifData: Record<string, unknown> = {
      move_mode: 'ContinuousMove',
    };

    // For continuous movement (press & hold), don't set duration - let it run until stop
    // For single clicks (no phase), use a short duration for a small movement
    if (!options?.phase) {
      onvifData.continuous_duration = 0.001;
    }

    if (action === 'up') {
      onvifData.tilt = 'UP';
    } else if (action === 'down') {
      onvifData.tilt = 'DOWN';
    } else if (action === 'left') {
      onvifData.pan = 'LEFT';
    } else if (action === 'right') {
      onvifData.pan = 'RIGHT';
    } else if (action === 'zoom_in' || action === 'zoom_out') {
      // ONVIF zoom support - using zoom parameter
      onvifData.zoom = action === 'zoom_in' ? 'ZOOM_IN' : 'ZOOM_OUT';
    } else {
      return false;
    }

    await executor.executeActions({
      actions: {
        action: 'perform-action',
        perform_action: 'onvif.ptz',
        data: onvifData,
        target: { entity_id: cameraEntity },
      },
    });
    return true;
  }
}

