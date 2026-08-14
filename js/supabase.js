
var SUPABASE_URL = 'https://nwnslrnfupveuyhrwutu.supabase.co';
var SUPABASE_KEY = 'sb_publishable_fnzv3qWAyDg60BTa4T0GaA_cMtraFpY';
var db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var ADMIN_EMAIL = "admin@gmail.com"; 
var DEFAULT_IMG = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80";

var USER_STORE_LOGIN_URL = "https://tech-core-shop.netlify.app/login.html";


function handleAdminLogout() {
  db.auth.signOut().then(function() {
    alert("Logged out successfully!");
    window.location.href = USER_STORE_LOGIN_URL;
  }).catch(function(err) {
    console.warn("Logout error:", err);
    window.location.href = USER_STORE_LOGIN_URL;
  });
}


function verifyAdminSession() {
 
  if (window.location.hash && window.location.hash.includes('access_token')) {
    var params = new URLSearchParams(window.location.hash.replace('#', '?'));
    var access_token = params.get('access_token');
    var refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      db.auth.setSession({
        access_token: access_token,
        refresh_token: refresh_token
      }).then(function(res) {
      
        window.history.replaceState(null, null, window.location.pathname);
        validateCurrentAdmin(res.data ? res.data.session : null);
      }).catch(function() {
        window.location.href = USER_STORE_LOGIN_URL;
      });
      return;
    }
  }


  db.auth.getSession().then(function(res) {
    validateCurrentAdmin(res.data ? res.data.session : null);
  }).catch(function(err) {
    console.error("Session error:", err);
    window.location.href = USER_STORE_LOGIN_URL;
  });
}

function validateCurrentAdmin(session) {
  if (!session || !session.user) {
    window.location.href = USER_STORE_LOGIN_URL;
    return;
  }

  var userEmail = session.user.email ? session.user.email.toLowerCase() : "";
  if (userEmail !== ADMIN_EMAIL.toLowerCase()) {
    alert("Unauthorized Access!");
    db.auth.signOut();
    window.location.href = USER_STORE_LOGIN_URL;
    return;
  }

  var emailSpan = document.getElementById('userEmailText');
  if (emailSpan) {
    emailSpan.innerText = userEmail;
  }
}