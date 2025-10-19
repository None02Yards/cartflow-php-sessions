// src/main.server.ts
import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { config } from './app/app.config.server';
import 'zone.js/node';
export default function bootstrap(context: BootstrapContext) {
  //  pass the context when bootstrapping on the server
  return bootstrapApplication(AppComponent, config, context);
}
