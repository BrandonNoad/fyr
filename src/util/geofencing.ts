import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { z } from 'zod';
import _differenceBy from 'lodash/differenceBy';

import {
  REGION_IDENTIFIER_PREFIX,
  RADIUS,
  GEOFENCING_TASK_NAME,
} from '~/constants';

const beaconSchema = z.object({
  id: z.number(),
  accountId: z.number(),
  nodeId: z.string(),
  query: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export type Beacon = z.infer<typeof beaconSchema>;

// A node may have multiple beacons, so append the beacon id.
const beaconToRegionIdentifier = (beacon: Beacon) =>
  `${REGION_IDENTIFIER_PREFIX}${beacon.nodeId}/${beacon.id}`;

export const startGeofencing = async (beacons: Beacon[]) => {
  // Here is the type definition of a Tana node id:
  // const idType = z
  //   .string()
  //   .min(7)
  //   .max(16)
  //   .regex(/^[A-Za-z0-9_-]+$/)
  const locationRegions = beacons.map((beacon) => ({
    identifier: beaconToRegionIdentifier(beacon),
    latitude: beacon.latitude,
    longitude: beacon.longitude,
    radius: RADIUS,
  }));

  // On iOS, there is a limit of 20 regions that can be simultaneously monitored.
  if (locationRegions.length > 20) {
    console.log('WARNING: Too many regions!');
  }

  // If you want to add or remove regions from already running geofencing task, you can just call
  // `startGeofencingAsync` again with the new array of regions.
  await Location.startGeofencingAsync(
    GEOFENCING_TASK_NAME,
    locationRegions.slice(0, 20)
  );
};

export const stopGeofencing = async () => {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    GEOFENCING_TASK_NAME
  );

  if (isRegistered) {
    await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
  }
};

export const fetchBeacons = async ({
  apiKey,
  isGeofencingEnabled,
  prevData,
}: {
  apiKey: string;
  isGeofencingEnabled: boolean;
  prevData: Beacon[];
}) => {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_FYR_API_BASE_URL}/fyr/api/beacons.json`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();

  if (data.length === 0) {
    await stopGeofencing();
    return [];
  }

  const beacons = z.array(beaconSchema).parse(data);

  if (
    isGeofencingEnabled &&
    (beacons.length !== prevData.length ||
      _differenceBy(beacons, prevData, 'id').length > 0)
  ) {
    await startGeofencing(beacons);
  }

  return beacons;
};
