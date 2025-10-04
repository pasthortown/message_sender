import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./scheduler.component').then(m => m.SchedulerComponent),
    data: {
      title: $localize`Scheduler`
    }
  }
];

