import { ApplicationConfig } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, Routes, withComponentInputBinding } from '@angular/router';
import { AuthPageComponent } from './auth-page/auth-page';
import { AddToCartComponent } from './add-to-cart/add-to-cart';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth' },
  { path: 'auth', component: AuthPageComponent },
  { path: 'cart', component: AddToCartComponent },
  { path: '**', redirectTo: 'auth' },
];

export const config: ApplicationConfig = {
  providers: [
    provideClientHydration(),
    provideRouter(routes, withComponentInputBinding()),
  ],
};
