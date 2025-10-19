import { ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const config: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideHttpClient(withFetch()), 
  ],
};
