import { Services } from '../../../../src/internal';

import dotenv from 'dotenv'; 
dotenv.config();  // Load environment variables from .env file 

const s = new Services(process.env.ARCHIYOU_SERVICES_URL);

const r = await s.energy({
  location: {
    lng: 4.9041,
    lat: 52.3676
  },
  building_volume_m3: 300,
  building_floor_area_m2: 100,
  planes: [
    { 
      id: 'south',
      area_m2: 30,
      azimuth_deg: 180,
      tilt_deg: 90,
    }
  ]
})

console.log(r);
