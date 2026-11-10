import data from './campaign.json';
import type { Level } from '../core/model';
export const campaign = data as Level[];
export const districts = [
  { name: 'Morning Lane', color: '#86a58b', subtitle: 'Every journey starts with one small turn.' },
  { name: 'Market Square', color: '#c69364', subtitle: 'A little order in the morning bustle.' },
  { name: 'Garden Quarter', color: '#8aab73', subtitle: 'Take a breath. Find a way through.' },
  { name: 'Golden Terraces', color: '#c6a25c', subtitle: 'Good timing makes a good neighbour.' },
  { name: 'Blue Hour', color: '#869fc1', subtitle: 'One last delivery before the stars.' },
  { name: 'Lantern Heights', color: '#ac90af', subtitle: 'Bring the whole neighbourhood home.' },
];
