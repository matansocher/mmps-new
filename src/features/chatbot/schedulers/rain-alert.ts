import type TelegramBot from 'node-telegram-bot-api';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getLatestRadarImage, KFAR_SABA_LOCATION } from '@services/rain-radar';
import { getTodayHourlyForecast } from '@services/weather-api';

const logger = new Logger('RainAlertScheduler');

const notifiedHours = new Set<string>();

const RAIN_PROBABILITY_THRESHOLD = 50; // Alert when rain probability exceeds 50%
const HOURS_AHEAD_TO_CHECK = 4; // Check next 4 hours

export async function rainAlert(bot: TelegramBot): Promise<void> {
  try {
    const location = KFAR_SABA_LOCATION.name;
    const forecast = await getTodayHourlyForecast(location);

    const now = new Date();
    const currentHour = now.getHours();

    const upcomingRain = forecast.hourly.filter((hour) => {
      const hourNumber = hour.hour;
      const isUpcoming = hourNumber >= currentHour && hourNumber < currentHour + HOURS_AHEAD_TO_CHECK;
      const hasSignificantRain = hour.chanceOfRain >= RAIN_PROBABILITY_THRESHOLD;

      return isUpcoming && hasSignificantRain;
    });

    if (upcomingRain.length === 0) {
      logger.debug(`No rain expected in the next ${HOURS_AHEAD_TO_CHECK} hours for ${location}`);
      return;
    }

    for (const rainHour of upcomingRain) {
      const hourKey = `${forecast.date}-${rainHour.hour}`;

      if (notifiedHours.has(hourKey)) {
        continue;
      }

      try {
        const radarData = await getLatestRadarImage(location);

        const message = formatRainAlertMessage(location, rainHour, forecast.date);

        await bot.sendMessage(MY_USER_ID, message, { parse_mode: 'Markdown' });

        await bot.sendPhoto(MY_USER_ID, radarData.imageUrl, {
          caption: `Rain radar for ${location} - Updated: ${radarData.timestamp.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })}`,
        });

        notifiedHours.add(hourKey);

        logger.log(`Sent rain alert for ${location} - ${rainHour.chanceOfRain}% chance at ${rainHour.hour}:00`);
      } catch (err) {
        logger.error(`Failed to send rain alert for hour ${rainHour.hour}: ${err.message}`);
      }
    }

    if (notifiedHours.size > 500) {
      const keysArray = Array.from(notifiedHours);
      const toKeep = keysArray.slice(-300);
      notifiedHours.clear();
      toKeep.forEach((key) => notifiedHours.add(key));
      logger.debug(`Cleaned up notified hours tracking, now tracking ${notifiedHours.size} entries`);
    }

    logger.log(`Successfully processed rain alerts for ${upcomingRain.length} hour(s)`);
  } catch (err) {
    logger.error(`Failed to check rain forecast: ${err.message}`);
  }
}

function formatRainAlertMessage(location: string, rainHour: any, date: string): string {
  const emoji = getRainEmoji(rainHour.chanceOfRain);

  let message = `${emoji} *RAIN ALERT - ${location}*\n\n`;
  message += `📅 Date: ${date}\n`;
  message += `⏰ Time: ${rainHour.hour}:00\n`;
  message += `💧 Rain Probability: *${rainHour.chanceOfRain}%*\n`;
  message += `🌡️ Temperature: ${rainHour.temperature}°C (feels like ${rainHour.feelsLike}°C)\n`;
  message += `🌤️ Condition: ${rainHour.condition}\n`;
  message += `💨 Wind: ${rainHour.windSpeed} km/h\n`;
  message += `💦 Humidity: ${rainHour.humidity}%\n\n`;
  message += `Rain is expected in Kfar Saba. Check the radar image below to see the cloud patterns.`;

  return message;
}

function getRainEmoji(probability: number): string {
  if (probability >= 80) return '🌧️';
  if (probability >= 60) return '🌦️';
  return '☁️';
}
