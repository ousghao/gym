import { migrateWorkoutPlansToParsedArrays } from '../server/db-storage.ts';

(async () => {
  await migrateWorkoutPlansToParsedArrays();
  console.log('Migration complete!');
  process.exit(0);
})();