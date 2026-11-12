const { createClient } = require('@supabase/supabase-js');
const http = require('http');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testFetch() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'myzkool.official@gmail.com',
    password: 'R@shid12'
  });

  if (authErr || !authData?.session?.access_token) {
    console.error('Login error:', authErr);
    return;
  }

  const token = authData.session.access_token;
  console.log('Got token for:', authData.user.email);

  const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/master-admin/dashboard/metrics?period=30d',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('HTTP Status:', res.statusCode);
      try {
        const json = JSON.parse(data);
        console.log('Success:', json.success);
        console.log('KPIs:', JSON.stringify(json.data?.kpis, null, 2));
        console.log('Plan Distribution:', JSON.stringify(json.data?.planDistribution, null, 2));
        console.log('System Health:', JSON.stringify(json.data?.systemHealth, null, 2));
        console.log('Recent Activities:', JSON.stringify(json.data?.recentActivities, null, 2));
      } catch (e) {
        console.log('Raw body:', data.slice(0, 500));
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });

  req.end();
}

testFetch();
