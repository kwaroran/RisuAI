import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.aiclient.risu',
  appName: 'RisuAI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
