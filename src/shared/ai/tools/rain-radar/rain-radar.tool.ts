import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getLatestRadarImage } from '@services/rain-radar';

const schema = z.object({
  location: z.string().optional().describe('The city or location to get rain radar for (default: Kfar Saba)'),
});

async function runner({ location }: z.infer<typeof schema>) {
  const radarData = await getLatestRadarImage(location);

  return {
    imageUrl: radarData.imageUrl,
    location: radarData.location,
    timestamp: radarData.timestamp.toISOString(),
    message: `Rain radar image for ${radarData.location}. Image shows precipitation and cloud coverage over Israel. Updated at ${radarData.timestamp.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })}.`,
  };
}

export const rainRadarTool = tool(runner, {
  name: 'rain_radar',
  description: 'Get the latest rain radar image from Israel Meteorological Service showing precipitation and clouds over Israel. Useful when user asks about rain radar, rain clouds, or wants to see current precipitation patterns.',
  schema,
});
