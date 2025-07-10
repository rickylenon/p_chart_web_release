const Service = require('node-windows').Service;
const path = require('path');

console.log('Uninstalling P-Chart Web Windows Service...');

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

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', function(){
  console.log('P-Chart Web service uninstalled successfully.');
  console.log('Service has been removed from Windows Services.');
});

svc.on('error', function(err){
  console.error('Service uninstall error:', err);
});

// Uninstall the service.
console.log('Stopping and uninstalling service...');
svc.uninstall(); 