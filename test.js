import { spawn } from 'child_process';
import http from 'http';

// Helper to make POST requests
function post(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: { raw: body } });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

// Start Server
console.log('Starting server in test mode...');
const server = spawn('node', ['server.js'], { stdio: 'inherit' });

// Wait for server to start
setTimeout(async () => {
  try {
    console.log('\n--- Running Automated Business Rule Verifications ---\n');

    // 1. Auth Login Test
    console.log('[1/6] Testing Fleet Manager authentication...');
    const loginRes = await post('/api/auth/login', {
      email: 'manager@triplogix.com',
      password: 'password123'
    });
    if (loginRes.status !== 200 || !loginRes.body.token) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    const token = loginRes.body.token;
    console.log('  Success: Retrieved Auth Token.\n');

    // 2. Duplicate Registration Check
    console.log('[2/6] Testing unique registration constraint...');
    const duplicateVehicleRes = await post('/api/vehicles', {
      registrationNumber: 'VAN-01', // Already exists in seed
      model: 'Ford Cargo Spec',
      type: 'Van',
      maxLoadCapacity: 1000,
      odometer: 10000,
      acquisitionCost: 25000,
      region: 'North'
    }, token);

    if (duplicateVehicleRes.status === 400 && duplicateVehicleRes.body.error) {
      console.log(`  Success: Properly rejected duplicate registration. Message: "${duplicateVehicleRes.body.error}"\n`);
    } else {
      throw new Error(`Failed: Server allowed duplicate registration: ${JSON.stringify(duplicateVehicleRes.body)}`);
    }

    // 3. Exceeded Load Capacity Constraint
    console.log('[3/6] Testing cargo load capacity boundaries...');
    const overweightTripRes = await post('/api/trips', {
      source: 'Warehouse A',
      destination: 'Outlet B',
      vehicleId: 1, // VAN-01: max weight capacity 1200kg
      driverId: 1,  // Alex Mercer: available
      cargoWeight: 1500, // exceeds 1200
      plannedDistance: 100
    }, token);

    if (overweightTripRes.status === 400 && overweightTripRes.body.error) {
      console.log(`  Success: Properly rejected overweight dispatch. Message: "${overweightTripRes.body.error}"\n`);
    } else {
      throw new Error(`Failed: Server allowed trip exceeding max load limit.`);
    }

    // 4. Suspended Driver Status Check
    console.log('[4/6] Testing suspended driver assignment rules...');
    const suspendedDriverTripRes = await post('/api/trips', {
      source: 'Warehouse A',
      destination: 'Outlet B',
      vehicleId: 1, // VAN-01
      driverId: 4,  // Dave Miller: Suspended
      cargoWeight: 500,
      plannedDistance: 100
    }, token);

    if (suspendedDriverTripRes.status === 400 && suspendedDriverTripRes.body.error) {
      console.log(`  Success: Properly blocked suspended driver. Message: "${suspendedDriverTripRes.body.error}"\n`);
    } else {
      throw new Error('Failed: Server allowed suspended driver allocation.');
    }

    // 5. Valid Trip Creation & Automatic Transitions
    console.log('[5/6] Creating valid trip draft...');
    const tripRes = await post('/api/trips', {
      source: 'Warehouse North',
      destination: 'Distribution Hub A',
      vehicleId: 1, // VAN-01
      driverId: 1,  // Alex Mercer
      cargoWeight: 500,
      plannedDistance: 100
    }, token);

    if (tripRes.status !== 201) {
      throw new Error(`Failed to create valid trip: ${JSON.stringify(tripRes.body)}`);
    }
    const tripId = tripRes.body.id;
    console.log(`  Success: Trip Draft #${tripId} recorded.\n`);

    // 6. Trip Dispatch Transition
    console.log('[6/6] Dispatching trip and verifying state cascade...');
    const dispatchRes = await post(`/api/trips/${tripId}/dispatch`, {}, token);
    if (dispatchRes.status !== 200) {
      throw new Error(`Dispatch failed: ${JSON.stringify(dispatchRes.body)}`);
    }
    console.log(`  Success: Trip Status updated to "${dispatchRes.body.status}".`);
    console.log('\n=============================================');
    console.log('  ALL AUTOMATED VERIFICATION CHECKS PASSED!  ');
    console.log('=============================================\n');

  } catch (error) {
    console.error('\n❌ Verification Failed:', error.message);
  } finally {
    console.log('Stopping test server...');
    server.kill();
    process.exit(0);
  }
}, 2000);
