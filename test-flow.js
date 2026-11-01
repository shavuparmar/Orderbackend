const API = 'http://localhost:9000/api/v1';

async function req(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function test() {
  console.log('--- START E2E TEST ---');

  // 1. Admin Login
  let res = await req('/users/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrNumber: 'admin@korder.com', password: 'admin123' })
  });
  if (res.status !== 200) { console.error('Admin login failed'); return; }
  const adminToken = res.data.data.accessToken;
  const adminH = { 'Authorization': `Bearer ${adminToken}` };
  console.log('1. Admin Login: PASS');

  // 2. Create Customer
  const custEmail = `customer_${Date.now()}@korder.com`;
  res = await req('/users/create', {
    method: 'POST',
    headers: adminH,
    body: JSON.stringify({
      customerName: 'Test Customer',
      firstName: 'Cust',
      email: custEmail,
      customerNumber: `${Date.now()}`.slice(-10),
      password: 'password123',
      role: 'CUSTOMER'
    })
  });
  if (res.status !== 201) { console.error('Create customer failed:', res); return; }
  const custId = res.data.data._id;
  console.log('2. Create Customer: PASS');

  // 3. Create Staff
  const staffEmail = `staff_${Date.now()}@korder.com`;
  res = await req('/users/create', {
    method: 'POST',
    headers: adminH,
    body: JSON.stringify({
      customerName: 'Test Staff',
      firstName: 'Staff',
      email: staffEmail,
      customerNumber: `2${Date.now()}`.slice(-10),
      password: 'password123',
      role: 'STAFF'
    })
  });
  if (res.status !== 201) { console.error('Create staff failed:', res); return; }
  const staffId = res.data.data._id;
  console.log('3. Create Staff: PASS');

  // 4. Customer Login
  res = await req('/users/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrNumber: custEmail, password: 'password123' })
  });
  if (res.status !== 200) { console.error('Customer login failed:', res); return; }
  const custToken = res.data.data.accessToken;
  const custH = { 'Authorization': `Bearer ${custToken}` };
  console.log('4. Customer Login: PASS');

  // 5. Staff Login
  res = await req('/users/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrNumber: staffEmail, password: 'password123' })
  });
  if (res.status !== 200) { console.error('Staff login failed:', res); return; }
  const staffToken = res.data.data.accessToken;
  const staffH = { 'Authorization': `Bearer ${staffToken}` };
  console.log('5. Staff Login: PASS');

  // 6. Customer get products
  res = await req('/products', { headers: custH });
  if (res.status !== 200) { console.error('Get products failed:', res); return; }
  let product = res.data.data[0];
  if (!product) {
    // create a test product
    console.log('No products found, creating one...');
    res = await req('/products', {
      method: 'POST',
      headers: adminH,
      body: JSON.stringify({
        name: 'Test Product',
        price: 100,
        isActive: true
      })
    });
    product = res.data.data;
  }
  console.log('6. Customer Products: PASS');

  // 7. Customer Create Order
  res = await req('/orders', {
    method: 'POST',
    headers: custH,
    body: JSON.stringify({
      items: [{ productId: product._id, qty: 1 }],
      paymentMethod: 'CASH'
    })
  });
  if (res.status !== 201) { console.error('Create order failed:', res); return; }
  const orderId = res.data.data._id;
  console.log('7. Customer Create Order: PASS');

  // 8. Customer My Orders
  res = await req('/orders/my', { headers: custH });
  const orderList = Array.isArray(res.data.data) ? res.data.data : res.data.data?.data;
  if (res.status !== 200 || !Array.isArray(orderList) || orderList.length === 0) {
    console.error('Customer My Orders failed:', res); return;
  }
  console.log('8. Customer My Orders (/api/v1/orders/my): PASS');

  // 9. Customer Order Details
  res = await req(`/orders/${orderId}`, { headers: custH });
  if (res.status !== 200) { console.error('Customer Order Details failed:', res); return; }
  console.log('9. Customer Order Details: PASS');

  // 10. Staff list all orders
  res = await req('/orders', { headers: staffH });
  if (res.status !== 200) { console.error('Staff List Orders failed:', res); return; }
  console.log('10. Staff Order Access (/api/v1/orders): PASS');

  // 11. Customer -> Admin block
  res = await req('/users', { headers: custH });
  if (res.status === 403) {
    console.log('11. Customer -> Admin Block: PASS');
  } else {
    console.error('Customer -> Admin block failed:', res);
  }

  // 12. Customer -> Admin Order list block
  res = await req('/orders', { headers: custH });
  if (res.status === 403) {
    console.log('12. Customer Order Privacy Block (/api/v1/orders): PASS');
  } else {
    console.error('Customer Order Privacy block failed:', res);
  }

  // 13. Admin -> Payment Verification (Get user statement)
  res = await req(`/payments/user/${custId}`, { headers: adminH });
  if (res.status === 200) {
     console.log('13. Payment / Statement Access: PASS');
  } else {
     console.error('Admin Payment failed:', res);
  }

  // Cleanup
  await req(`/users/${custId}`, { method: 'DELETE', headers: adminH });
  await req(`/users/${staffId}`, { method: 'DELETE', headers: adminH });

  console.log('--- TEST COMPLETE ---');
}

test();
