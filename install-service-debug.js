const Service = require('node-windows').Service;
const path = require('path');

console.log('Installing P-Chart Web as Windows Service...');
console.log('Current directory:', __dirname);
console.log('Script path:', path.join(__dirname, 'server-wrapper.js'));

// Create a new service object
const svc = new Service({
  name: 'pchart_service',
  description: 'P-Chart Web Production Management Application',
  script: path.join(__dirname, 'server-wrapper.js'),
  nodeOptions: [
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "PORT",
      value: "3000"
    },
    {
      name: "HOSTNAME", 
      value: "0.0.0.0"
    }
  ],
  workingDirectory: __dirname,
  allowServiceLogon: true
});

// Add timeout for installation
const installTimeout = setTimeout(() => {
  console.error('Service installation timed out after 30 seconds');
  process.exit(1);
}, 30000);

// Listen for the "install" event
svc.on('install', function(){
  clearTimeout(installTimeout);
  console.log('P-Chart Web service installed successfully!');
  console.log('Service Name:', svc.name);
  console.log('Starting service...');
  
  // Set timeout for start
  const startTimeout = setTimeout(() => {
    console.error('Service start timed out after 15 seconds');
    process.exit(1);
  }, 15000);
  
  svc.start();
});

svc.on('start', function(){
  clearTimeout(installTimeout);
  console.log('P-Chart Web service started successfully!');
  console.log('Application available at: http://localhost:3000');
  process.exit(0);
});

svc.on('error', function(err){
  clearTimeout(installTimeout);
  console.error('Service error:', err);
  process.exit(1);
});

svc.on('invalidinstallation', function(){
  clearTimeout(installTimeout);
  console.error('Invalid installation detected');
  process.exit(1);
});

// Install the service
console.log('Installing service...');
console.log('This may take a moment...');
svc.install(); 