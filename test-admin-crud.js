const BASE_URL = "http://localhost:9000/api/v1";

async function req(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${url} returned ${res.status}: ${data?.message || JSON.stringify(data)}`);
  }
  return data;
}

async function runTest() {
  console.log("--- START ADMIN CRUD & REQUEST WORKFLOW TEST ---");

  // 1. Admin login
  const adminRes = await req("/users/login", {
    method: "POST",
    body: JSON.stringify({ emailOrNumber: "admin@korder.com", password: "admin123" })
  });
  const adminToken = adminRes.data.accessToken;
  console.log("1. Admin Login: PASS");

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 2. Submit Public Customer Request
  const custMobile = "98" + Math.floor(10000000 + Math.random() * 90000000);
  const reqRes = await req("/users/public-request", {
    method: "POST",
    body: JSON.stringify({
      applicantName: "Ramesh Dairy Customer",
      mobileNumber: custMobile,
      email: `ramesh_${Date.now()}@example.com`,
      address: "Shop 12, Market Yard",
      requestType: "CUSTOMER_REGISTRATION",
      description: "Daily 2 crates buffalo milk delivery requirement",
    })
  });
  const custRequestId = reqRes.data.requestId;
  console.log("2. Public Customer Request Submission: PASS, ID:", custRequestId);

  // 3. Submit Public Staff Request
  const staffMobile = "97" + Math.floor(10000000 + Math.random() * 90000000);
  const staffReqRes = await req("/users/public-request", {
    method: "POST",
    body: JSON.stringify({
      applicantName: "Suresh Delivery Staff",
      mobileNumber: staffMobile,
      email: `suresh_${Date.now()}@example.com`,
      address: "Keshav Nagar, Pune",
      department: "Logistics",
      requestType: "STAFF_REGISTRATION",
      description: "Experienced morning milk route delivery driver",
    })
  });
  const staffRequestId = staffReqRes.data.requestId;
  console.log("3. Public Staff Request Submission: PASS, ID:", staffRequestId);

  // 4. Admin List Requests & Stats
  const listRes = await req("/admin/requests", { headers: adminHeaders });
  const { items, stats } = listRes.data;
  if (!items || !stats || stats.total === undefined) throw new Error("Stats not returned in requests list");
  console.log(`4. Admin List Requests: PASS (Total: ${stats.total}, Pending: ${stats.pending})`);

  // 5. Admin Approve Customer Request
  const approveCustRes = await req(`/admin/requests/${custRequestId}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({
      action: "APPROVE",
      reviewNote: "Verified customer location and deposit.",
      initialPassword: "Customer@123"
    })
  });
  const createdCust = approveCustRes.data.account;
  if (!createdCust || createdCust.role !== "CUSTOMER") throw new Error("Customer account not created properly on approval");
  console.log("5. Admin Approve Customer Request -> Account Created: PASS, User ID:", createdCust._id);

  // 6. Verify Customer Login with newly approved credentials
  const custLoginRes = await req("/users/login", {
    method: "POST",
    body: JSON.stringify({ emailOrNumber: custMobile, password: "Customer@123" })
  });
  if (!custLoginRes.data.accessToken) throw new Error("New customer cannot login");
  console.log("6. Newly Created Customer Login: PASS");

  // 7. Admin Reset Customer Password
  await req(`/users/${createdCust._id}/password`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ newPassword: "NewSecretPassword@123" })
  });
  console.log("7. Admin Direct Reset Password: PASS");

  // 8. Verify Customer Login with NEW password
  const custNewLoginRes = await req("/users/login", {
    method: "POST",
    body: JSON.stringify({ emailOrNumber: custMobile, password: "NewSecretPassword@123" })
  });
  if (!custNewLoginRes.data.accessToken) throw new Error("Customer cannot login with reset password");
  console.log("8. Customer Login with Reset Password: PASS");

  // 9. Admin Update Customer Details
  const updateRes = await req(`/users/${createdCust._id}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ customerName: "Ramesh Dairy Updated", isActive: true })
  });
  if (updateRes.data.customerName !== "Ramesh Dairy Updated") throw new Error("Update user name failed");
  console.log("9. Admin Update User Details: PASS");

  // 10. Admin Delete User
  await req(`/users/${createdCust._id}`, {
    method: "DELETE",
    headers: adminHeaders
  });
  console.log("10. Admin Delete User: PASS");

  // 11. Cleanup test requests
  await req(`/admin/requests/${custRequestId}`, { method: "DELETE", headers: adminHeaders });
  await req(`/admin/requests/${staffRequestId}`, { method: "DELETE", headers: adminHeaders });
  console.log("11. Request Cleanup: PASS");

  console.log("--- ALL BACKEND CRUD & WORKFLOW TESTS PASSED 100% ---");
}

runTest().catch((err) => {
  console.error("TEST FAILED:", err.message);
  process.exit(1);
});
