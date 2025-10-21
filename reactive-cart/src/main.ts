import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppComponent } from './app/app';
import { config as clientConfig } from './app/app.config';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withFetch()),
    ...(clientConfig?.providers ?? []),
  ],
}).catch(err => console.error(err));
