require('dotenv').config({ path: '.env.local' });
const clientId = process.env.LINKEDIN_CLIENT_ID;
const redirectUri = encodeURIComponent("http://localhost:3000/api/linkedin/auth/callback");
const scope = encodeURIComponent("openid profile email w_member_social");
const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
console.log(linkedinUrl);
