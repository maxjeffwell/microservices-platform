import profilesRouter from './profiles.js';
import preferencesRouter from './preferences.js';
import permissionsRouter from './permissions.js';
import socialLinksRouter from './socialLinks.js';
import metadataRouter from './metadata.js';

export default function setupRoutes(app) {
  // Profile routes (includes search and list)
  app.use('/api/v1/profiles', profilesRouter);

  // Preferences routes (nested under profiles)
  app.use('/api/v1/profiles', preferencesRouter);

  // Permissions routes (nested under profiles)
  app.use('/api/v1/profiles', permissionsRouter);

  // Social links routes (nested under profiles)
  app.use('/api/v1/profiles', socialLinksRouter);

  // Product metadata routes (nested under profiles)
  app.use('/api/v1/profiles', metadataRouter);
}
