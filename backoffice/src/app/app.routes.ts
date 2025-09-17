import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout').then(m => m.DefaultLayoutComponent),
    data: {
      title: 'Home'
    },
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./views/dashboard/routes').then((m) => m.routes)
      },
      {
        path: 'blank',
        loadChildren: () => import('./views/blank/routes').then((m) => m.routes)
      },
      {
        path: 'messages',
        loadChildren: () => import('./views/messages/routes').then((m) => m.routes)
      },
      {
        path: 'scheduler',
        loadChildren: () => import('./views/scheduler/routes').then((m) => m.routes)
      },
      {
        path: 'users',
        loadChildren: () => import('./views/users/routes').then((m) => m.routes)
      },
      {
        path: 'receiver',
        loadChildren: () => import('./views/receiver/routes').then((m) => m.routes)
      }
    ]
  },
  {
    path: '404',
    loadComponent: () => import('./views/pages/page404/page404.component').then(m => m.Page404Component),
    data: {
      title: 'Page 404'
    }
  },
  {
    path: '500',
    loadComponent: () => import('./views/pages/page500/page500.component').then(m => m.Page500Component),
    data: {
      title: 'Page 500'
    }
  },
  {
    path: 'login',
    loadComponent: () => import('./views/pages/login/login.component').then(m => m.LoginComponent),
    data: {
      title: 'Login Page'
    }
  },
  { path: '**', redirectTo: 'dashboard' }
];
