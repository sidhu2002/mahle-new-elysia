export const AWS_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  },
  athena: {
    outputLocation: process.env.ATHENA_OUTPUT_LOCATION || '',
    workGroup: process.env.ATHENA_WORKGROUP || 'primary'
  }
} 