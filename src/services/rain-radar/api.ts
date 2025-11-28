import axios from 'axios';
import { format } from 'date-fns';

import { IMS_RADAR_BASE_URL, KFAR_SABA_LOCATION } from './constants';
import type { RadarImageOptions, RadarImageResponse } from './types';

/**
 * Get the latest rain radar image URL from IMS (Israel Meteorological Service)
 * Image format: IMSRadar4GIS_YYYYMMDDHHMM_0.png
 * Images are updated every ~5 minutes
 */
export async function getRadarImage(options: RadarImageOptions = {}): Promise<RadarImageResponse> {
  const location = options.location || KFAR_SABA_LOCATION.name;
  const timestamp = options.timestamp || new Date();

  // Round to nearest 5 minutes (IMS updates every 5 mins)
  const roundedTime = roundToNearest5Minutes(timestamp);
  const timeString = format(roundedTime, 'yyyyMMddHHmm');

  const imageUrl = `${IMS_RADAR_BASE_URL}/IMSRadar4GIS_${timeString}_0.png`;

  // Verify the image exists
  try {
    await axios.head(imageUrl);
  } catch (err) {
    throw new Error(`Radar image not available for timestamp ${timeString}`);
  }

  return {
    imageUrl,
    timestamp: roundedTime,
    location,
  };
}

/**
 * Get the latest available radar image by trying recent timestamps
 * IMS may have delays in publishing images, so we try the last few 5-minute intervals
 */
export async function getLatestRadarImage(location?: string): Promise<RadarImageResponse> {
  const now = new Date();
  const attempts = 6; // Try last 30 minutes (6 * 5 min intervals)

  for (let i = 0; i < attempts; i++) {
    const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
    try {
      return await getRadarImage({ location, timestamp });
    } catch (err) {
      // Try next timestamp
      continue;
    }
  }

  throw new Error('No recent radar images available from IMS');
}

/**
 * Round timestamp to nearest 5-minute interval
 */
function roundToNearest5Minutes(date: Date): Date {
  const ms = 1000 * 60 * 5; // 5 minutes in milliseconds
  return new Date(Math.floor(date.getTime() / ms) * ms);
}
