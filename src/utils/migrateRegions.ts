import { get, ref, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";

const regionMap: Record<string, string> = {
  "עוטף עזה": "עוטף עזה",
  "נגב מערבי": "מערב הנגב",
  "דרום - הנגב": "דרום הנגב",
  "נגב מזרחי והערבה": "ערבה",
  "שפלה ומישור החוף הדרומי": "השפלה",
  "גוש דן": "דן",
  "מרכז - תל אביב": "דן",
  "שרון": "שרון",
  "שומרון": "שומרון",
  "ירושלים והסביבה": "ירושלים",
  "יהודה": "יהודה",
  "חיפה והקריות": "המפרץ",
  "עמק יזרעאל והעמקים": "העמקים",
  "גליל עליון וגולן": "גליל עליון",
  "גליל תחתון ומערבי": "גליל תחתון",
};

export const runRegionMigration = async () => {
  console.log("Starting region migration...");
  
  try {
    // 1. Migrate Bets
    const betsSnap = await get(ref(db, "bets"));
    if (betsSnap.exists()) {
      const bets = betsSnap.val();
      for (const [betId, bet] of Object.entries<any>(bets)) {
        if (bet.scope === "region" && regionMap[bet.location]) {
          const newRegion = regionMap[bet.location];
          if (newRegion !== bet.location) {
             console.log(`Migrating bet ${betId} from ${bet.location} to ${newRegion}`);
             await set(ref(db, `bets/${betId}/location`), newRegion);
          }
        }
      }
    }

    // 2. Migrate Alert Stats Regions
    const statsSnap = await get(ref(db, "alert_stats/regions"));
    if (statsSnap.exists()) {
      const regionsStats = statsSnap.val();
      const updatedRegions: Record<string, number> = {};
      
      for (const [oldRegion, count] of Object.entries<number>(regionsStats)) {
        const readableOldRegion = oldRegion.replace(/_/g, " ");
        
        let newRegionName = readableOldRegion;
        if (regionMap[readableOldRegion]) {
          newRegionName = regionMap[readableOldRegion];
        } else {
          // If it matches exactly a new official 30 regions, keep it
          // Else just ignore or keep it
        }

        const safeNewRegion = newRegionName.replace(/[.#$[\]]/g, "_");
        updatedRegions[safeNewRegion] = (updatedRegions[safeNewRegion] || 0) + count;
      }

      // We overwrite the alert_stats/regions with the migrated ones completely
      console.log("Migrated alert_stats/regions: ", updatedRegions);
      await set(ref(db, "alert_stats/regions"), updatedRegions);
    }
    
    console.log("Migration completed successfully!");
    
    // Flag this device so we only run it once locally
    localStorage.setItem("regions_migrated_v1", "true");
    return true;

  } catch (err) {
    console.error("Migration failed: ", err);
    return false;
  }
};
