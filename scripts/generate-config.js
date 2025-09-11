const fs = require('fs');

console.log('🔥 Generating Firebase config...');

const config = `// Auto-generated Firebase configuration
export const firebaseConfig = {
    apiKey: "${process.env.VITE_FIREBASE_API_KEY}",
    authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN}",
    projectId: "${process.env.VITE_FIREBASE_PROJECT_ID}",
    storageBucket: "${process.env.VITE_FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${process.env.VITE_FIREBASE_APP_ID}"
};

console.log('✅ Firebase config generated successfully');
`;

try {
    fs.writeFileSync('scripts/config.js', config);
    console.log('✅ Config file written to scripts/config.js');
} catch (error) {
    console.error('❌ Error writing config file:', error);
    process.exit(1);
}
