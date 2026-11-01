const API = 'http://localhost:9000/api/v1';

async function test() {
  console.log('1. Admin Login');
  let res = await fetch(`${API}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrNumber: 'admin@korder.com', password: 'admin123' })
  });
  let data = await res.json();
  if (!res.ok) {
    console.error('Admin login failed:', data);
    return;
  }
  const adminToken = data.data.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };
  console.log('Admin login SUCCESS');

  console.log('2. Create Staff');
  const staffEmail = `staff_${Date.now()}@korder.com`;
  res = await fetch(`${API}/users/create`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      customerName: 'Test Staff',
      firstName: 'Test',
      email: staffEmail,
      customerNumber: `${Date.now()}`.slice(-10),
      password: 'password123',
      role: 'STAFF'
    })
  });
  data = await res.json();
  if (!res.ok) {
    console.error('Create staff failed:', data);
    return;
  }
  const staffId = data.data._id;
  console.log('Create staff SUCCESS. Role is:', data.data.role);

  console.log('3. Staff Login');
  res = await fetch(`${API}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrNumber: staffEmail, password: 'password123' })
  });
  data = await res.json();
  if (!res.ok) {
    console.error('Staff login failed:', data);
    return;
  }
  const staffToken = data.data.accessToken;
  const staffAuthHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${staffToken}`
  };
  console.log('Staff login SUCCESS. Role is:', data.data.user.role);

  console.log('4. Verify Staff cannot access Admin-only API (e.g. Delete User)');
  res = await fetch(`${API}/users/${staffId}`, {
    method: 'DELETE',
    headers: staffAuthHeaders
  });
  data = await res.json();
  if (res.status === 403) {
    console.log('Staff correctly denied access to admin delete API. SUCCESS');
  } else {
    console.error('Staff was not denied access! Status:', res.status, data);
  }

  // Cleanup: delete user
  console.log('5. Cleanup created user (using admin token)');
  await fetch(`${API}/users/${staffId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  console.log('Test COMPLETE');
}

test();
