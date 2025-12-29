import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.aiclient.risu',
  appName: 'Risuai',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
