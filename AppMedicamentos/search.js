const https = require('https');
const options = {
  hostname: 'html.duckduckgo.com',
  path: '/html/?q=expo+start+tunnel+Cannot+read+properties+of+undefined+reading+body',
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data.substring(0, 500));
  });
});
