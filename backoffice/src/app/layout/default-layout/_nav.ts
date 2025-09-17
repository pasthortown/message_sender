import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cil-speedometer' },
  },
  {
    title: true,
    name: 'Programación de Mensajes'
  },
  {
    name: 'Mensajes',
    url: '/messages',
    iconComponent: { name: 'cil-envelope-closed' },
  },
  {
    name: 'Grupos',
    url: '/receiver',
    iconComponent: { name: 'cil-people' },
  },
  {
    name: 'Agenda',
    url: '/scheduler',
    iconComponent: { name: 'cil-calendar' },
  },
  {
    title: true,
    name: 'Administración'
  },
  {
    name: 'Cuentas de Usuarios',
    url: '/users',
    iconComponent: { name: 'cil-user' },
  },
];
