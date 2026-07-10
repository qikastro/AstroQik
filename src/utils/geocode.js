/**
 * Geocoding utility using OpenStreetMap Nominatim (free, no API key required).
 * Resolves birth place string → lat/lng/timezone.
 */
export const geocodeBirthPlace = async (placeName) => {
  const encoded = encodeURIComponent(placeName);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AstroSphere/1.0 (astrosphere-app)',
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`);

  const results = await response.json();
  if (!results || results.length === 0) {
    throw new Error(`Could not find coordinates for: "${placeName}". Try a more specific name.`);
  }

  const place = results[0];
  const latitude     = parseFloat(place.lat);
  const longitude    = parseFloat(place.lon);
  const displayName  = place.display_name;
  const timezoneOffset = deriveTimezoneOffset(longitude, latitude);

  return { latitude, longitude, displayName, timezoneOffset };
};

/**
 * Approximate timezone offset (decimal hours from UTC) from coordinates.
 * Accurate for South/Southeast Asia. Falls back to longitude-based estimate.
 */
export const deriveTimezoneOffset = (lon, lat) => {
  if (lat >= 6   && lat <= 37   && lon >= 68  && lon <= 98)   return 5.5;  // India IST
  if (lat >= 5.8 && lat <= 9.9  && lon >= 79.5 && lon <= 81.9) return 5.5; // Sri Lanka
  if (lat >= 26  && lat <= 30.5 && lon >= 80  && lon <= 88.2)  return 5.75; // Nepal
  if (lat >= 20.7 && lat <= 26.6 && lon >= 88 && lon <= 92.7)  return 6.0;  // Bangladesh
  if (lat >= 23.7 && lat <= 37.1 && lon >= 60.9 && lon <= 77.2) return 5.0; // Pakistan
  if (lat >= 9.8  && lat <= 28.5 && lon >= 92.2 && lon <= 101.2) return 6.5; // Myanmar
  if (lat >= -5   && lat <= 6    && lon >= 95   && lon <= 141)  return 7.0;  // Indonesia (WIB)
  if (lat >= 1    && lat <= 7    && lon >= 100  && lon <= 120)  return 8.0;  // Malaysia / Singapore
  if (lat >= 20   && lat <= 47   && lon >= 122  && lon <= 145)  return 9.0;  // Japan / Korea
  if (lat >= 18   && lat <= 54   && lon >= 73   && lon <= 135)  return 8.0;  // China CST
  if (lat >= 51   && lat <= 72   && lon >= -11  && lon <= 35)   return 0.0;  // UK
  if (lat >= 35   && lat <= 72   && lon >= 0    && lon <= 35)   return 1.0;  // Central Europe
  if (lat >= 24   && lat <= 50   && lon >= -130 && lon <= -60)  return -5.0; // US East
  if (lat >= 24   && lat <= 50   && lon >= -130 && lon <= -90)  return -6.0; // US Central
  if (lat >= 24   && lat <= 50   && lon >= -130 && lon <= -115) return -7.0; // US Mountain
  if (lon >= -130 && lon <= -115 && lat >= 30   && lat <= 60)   return -8.0; // US Pacific
  // Fallback: nearest 0.5h
  return Math.round((lon / 15) * 2) / 2;
};
