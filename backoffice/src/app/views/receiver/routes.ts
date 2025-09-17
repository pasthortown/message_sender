import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./receiver.component').then(m => m.ReceiverComponent),
    data: {
      title: $localize`Receiver`
    }
  }
];

