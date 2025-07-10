const Service = require('node-windows').Service;
const path = require('path');

console.log('Installing P-Chart Web as Windows Service...');

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

// Listen for the "install" event, which indicates the process is available as a service.
svc.on('install', function(){
  console.log('P-Chart Web service installed successfully!');
  console.log('Starting service...');
  svc.start();
});

svc.on('start', function(){
  console.log('P-Chart Web service started successfully!');
  console.log('Application available at: http://localhost:3000');
});

svc.on('error', function(err){
  console.error('Service error:', err);
});

// Install the service
console.log('Installing service...');
svc.install(); 