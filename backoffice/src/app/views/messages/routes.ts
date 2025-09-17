import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./messages.component').then(m => m.MessagesComponent),
    data: {
      title: $localize`Messages`
    }
  }
];

