import { ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.config';

export const config: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
  ],
};
