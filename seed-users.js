const API = 'http://localhost:9000/api/v1';

async function req(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function run() {
  console.log('Logging in as admin...');
  let res = await req('/users/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrNumber: 'admin@korder.com', password: 'admin123' })
  });
  
  if (res.status !== 200) {
    console.error('Admin login failed:', res);
    return;
  }
  
  const adminToken = res.data.data.accessToken;
  const adminH = { 'Authorization': `Bearer ${adminToken}` };

  console.log('Creating Staff user...');
  res = await req('/users/create', {
    method: 'POST',
    headers: adminH,
    body: JSON.stringify({
      customerName: 'Demo Staff',
      firstName: 'Demo',
      email: 'staff@korder.com',
      customerNumber: '8888888888',
      password: 'staffpassword',
      role: 'STAFF'
    })
  });
  if (res.status === 201) console.log('Staff created');
  else console.log('Staff creation response:', res.status, res.data?.message);

  console.log('Creating Customer user...');
  res = await req('/users/create', {
    method: 'POST',
    headers: adminH,
    body: JSON.stringify({
      customerName: 'Demo Customer',
      firstName: 'Demo',
      email: 'customer@korder.com',
      customerNumber: '9999999999',
      password: 'customerpassword',
      role: 'CUSTOMER'
    })
  });
  if (res.status === 201) console.log('Customer created');
  else console.log('Customer creation response:', res.status, res.data?.message);
}

run();
