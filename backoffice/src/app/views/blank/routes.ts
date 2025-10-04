import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./blank.component').then(m => m.BlankComponent),
    data: {
      title: $localize`Blank`
    }
  }
];

