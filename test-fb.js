require('dotenv').config({ path: '.env.local' });
const clientId = process.env.FACEBOOK_CLIENT_ID;
const redirectUri = encodeURIComponent("http://localhost:3000/api/facebook/auth/callback");
const scopes = "pages_show_list,pages_manage_posts,pages_read_engagement";
const state = "testing";
const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scopes}`;
console.log(fbAuthUrl);
