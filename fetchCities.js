import https from 'https';
import fs from 'fs';

const URL = 'https://raw.githubusercontent.com/eladnava/pikud-haoref-api/master/cities.json';

https.get(URL, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const rawCities = JSON.parse(data);
      if (!Array.isArray(rawCities)) throw new Error("Format is not array");

      const regions = new Set();
      const regionCities = {};
      const citiesList = [];

      rawCities.forEach(c => {
        if (!c.name || !c.zone || c.name === "בחר הכל" || c.value === "all") return;
        
        const zone = c.zone.trim();
        const city = c.name.trim();

        if (!zone || !city) return;

        regions.add(zone);
        if (!regionCities[zone]) regionCities[zone] = [];
        if (!regionCities[zone].includes(city)) {
          regionCities[zone].push(city);
        }
        if (!citiesList.includes(city)) {
          citiesList.push(city);
        }
      });

      const output = `// Auto-generated from Pikud HaOref official list
export const CITIES = ${JSON.stringify(citiesList.sort((a, b) => a.localeCompare(b, 'he')), null, 2)};

export const REGIONS = ${JSON.stringify(Array.from(regions), null, 2)};

export const REGION_CITIES: Record<string, string[]> = ${JSON.stringify(regionCities, null, 2)};
`;

      fs.writeFileSync('./src/lib/cities-data.ts', output, 'utf8');
      console.log('✅ Successfully generated src/lib/cities-data.ts with ' + citiesList.length + ' cities!');
    } catch (err) {
      console.error("Failed to parse JSON", err);
    }
  });
}).on("error", err => {
  console.log("Error: " + err.message);
});
