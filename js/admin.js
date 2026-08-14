
var productsList = [];
var ordersList = [];


function loadAdminDashboard() {
  console.log("🚀 Loading Admin Dashboard Data...");
  loadOrdersData();
  loadProductsData();
  drawCategories();
  listenToRealtimeOrders();
}


function loadProductsData() {
  db.from('products').select('*').order('id', { ascending: false }).then(function(res) {
    if (res.error) {
      console.error("Error fetching products:", res.error);
      return;
    }
    productsList = res.data || [];
    if (document.getElementById('adminTableBody')) drawAdminTable();
    calculateStats();
  });
}


function loadOrdersData() {
  db.from('orders').select('*').order('id', { ascending: false }).then(function(res) {
    if (res.error) {
      console.error("Error fetching orders:", res.error);
      return;
    }
    ordersList = res.data || [];
    if (document.getElementById('ordersTableBody')) drawOrdersTable();
    if (document.getElementById('recentOrdersBody')) drawRecentOrders();
    calculateStats();
  });
}


function listenToRealtimeOrders() {
  db.channel('admin-live-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, function() {
      console.log("📦 New order activity detected!");
      loadOrdersData();
    })
    .subscribe();
}


 
function saveCategory() {
  var nameEl = document.getElementById('catName');
  var descEl = document.getElementById('catDesc');
  var imgEl = document.getElementById('catImg');

  var name = nameEl ? nameEl.value.trim() : "";
  var desc = descEl ? descEl.value.trim() : "";
  var img = imgEl ? imgEl.value.trim() : "";

  if (!name) return alert("Category Name zaroori hai!");

  db.from('categories').insert([{
    name: name,
    description: desc || ("Explore items in " + name),
    image: img || "📦"
  }]).then(function(res) {
    if (res.error) {
      alert("Error adding category: " + res.error.message);
    } else {
      alert("Category added successfully!");
      window.location.href = "categories.html";
    }
  });
}

 
function drawCategories() {
  var catListDiv = document.getElementById('categoryAdminList');
  if (!catListDiv) return;

  db.from('categories').select('*').order('id', { ascending: false }).then(function(res) {
    if (res.error) {
      console.error("Error loading categories:", res.error);
      catListDiv.innerHTML = '<span style="color:#f85149;">Error loading categories: ' + res.error.message + '</span>';
      return;
    }
    var categories = res.data || [];
    
    catListDiv.innerHTML = '';
    if (categories.length === 0) {
      catListDiv.innerHTML = '<span style="color:#8b949e;">No categories added yet. Click "+ Add New Category" above!</span>';
      return;
    }

    for (var i = 0; i < categories.length; i++) {
      var c = categories[i];
      var imgIcon = (c.image && c.image.startsWith('http')) 
        ? '<img src="' + c.image + '" class="cat-icon">' 
        : '<div class="cat-icon">' + (c.image || '📦') + '</div>';

      catListDiv.innerHTML += '<div class="cat-item">' +
        '<div class="cat-item-left">' +
          imgIcon +
          '<div>' +
            '<strong style="color:#fff; display:block;">' + c.name + '</strong>' +
            '<small style="color:#8b949e;">' + (c.description || '') + '</small>' +
          '</div>' +
        '</div>' +
        '<button class="delete-btn" onclick="deleteCategory(' + c.id + ')">Delete</button>' +
      '</div>';
    }
  });
}


function deleteCategory(id) {
  if (confirm("Are you sure you want to delete this category?")) {
    db.from('categories').delete().eq('id', id).then(function(res) {
      if (res.error) {
        alert("Failed to delete category: " + res.error.message);
      } else {
        drawCategories();
      }
    });
  }
}


function drawAdminTable() {
  var tbody = document.getElementById('adminTableBody');
  if (!tbody) return;
  tbody.innerHTML = "";

  if (productsList.length === 0) {
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#8b949e;'>No products found. Add your first product!</td></tr>";
    return;
  }

  for (var i = 0; i < productsList.length; i++) {
    var item = productsList[i];
    var imgUrl = (item.image && item.image.trim() !== "") ? item.image : DEFAULT_IMG;

    tbody.innerHTML += "<tr>" +
      "<td><img src='" + imgUrl + "' style='width:42px; height:42px; border-radius:6px; object-fit:cover;' onerror=\"this.src='" + DEFAULT_IMG + "'\"></td>" +
      "<td><b>" + item.title + "</b></td>" +
      "<td>" + (item.category || 'General') + "</td>" +
      "<td>$" + parseFloat(item.price || 0).toFixed(2) + "</td>" +
      "<td>" + (item.stock || 0) + "</td>" +
      "<td>" +
        "<a style='color:#58a6ff; cursor:pointer; font-weight:600; margin-right:15px;' onclick='editProduct(" + item.id + ")'>Edit</a>" +
        "<a style='color:#f85149; cursor:pointer; font-weight:600;' onclick='deleteProduct(" + item.id + ")'>Delete</a>" +
      "</td>" +
    "</tr>";
  }
}


function drawOrdersTable() {
  var tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;
  tbody.innerHTML = "";

  if (ordersList.length === 0) {
    tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:20px; color:#8b949e;'>No orders received yet.</td></tr>";
    return;
  }

  for (var i = 0; i < ordersList.length; i++) {
    var o = ordersList[i];
    tbody.innerHTML += "<tr>" +
      "<td><b>#" + o.id + "</b></td>" +
      "<td><b>" + (o.customer_name || 'Guest') + "</b><br><small style='color:#8b949e;'>" + (o.customer_email || 'N/A') + "</small></td>" +
      "<td>" + (o.customer_phone || 'N/A') + "<br><small style='color:#8b949e;'>" + (o.shipping_address || 'No address provided') + "</small></td>" +
      "<td>" + (o.product_title || 'Multiple Items') + "</td>" +
      "<td>" + (o.payment_method || 'COD') + "</td>" +
      "<td><b>$" + parseFloat(o.amount || 0).toFixed(2) + "</b></td>" +
      "<td><span style='padding:4px 10px; border-radius:12px; font-size:0.8rem; font-weight:bold; background:#1e293b; color:#38bdf8;'>" + (o.status || 'Pending') + "</span></td>" +
      "<td>" +
        "<select onchange='updateOrderStatus(" + o.id + ", this.value)' style='padding:4px 8px; background:#0d1117; color:#fff; border:1px solid #30363d; border-radius:6px; cursor:pointer;'>" +
          "<option value='Pending' " + (o.status=='Pending'?'selected':'') + ">Pending</option>" +
          "<option value='Shipped' " + (o.status=='Shipped'?'selected':'') + ">Shipped</option>" +
          "<option value='Delivered' " + (o.status=='Delivered'?'selected':'') + ">Delivered</option>" +
          "<option value='Cancelled' " + (o.status=='Cancelled'?'selected':'') + ">Cancelled</option>" +
        "</select>" +
      "</td>" +
    "</tr>";
  }
}


function drawRecentOrders() {
  var tbody = document.getElementById('recentOrdersBody');
  if (!tbody) return;
  tbody.innerHTML = "";

  if (ordersList.length === 0) {
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px; color:#8b949e;'>No recent orders available.</td></tr>";
    return;
  }

  var limit = Math.min(ordersList.length, 5);
  for (var i = 0; i < limit; i++) {
    var o = ordersList[i];
    tbody.innerHTML += "<tr>" +
      "<td><b>#" + o.id + "</b></td>" +
      "<td>" + (o.customer_name || 'Customer') + "</td>" +
      "<td>" + (o.product_title || 'Product') + "</td>" +
      "<td><b>$" + parseFloat(o.amount || 0).toFixed(2) + "</b></td>" +
      "<td><span style='padding:4px 8px; border-radius:10px; font-size:0.75rem; background:#1e293b; color:#38bdf8;'>" + (o.status || 'Pending') + "</span></td>" +
    "</tr>";
  }
}


function updateOrderStatus(orderId, newStatus) {
  db.from('orders').update({ status: newStatus }).eq('id', orderId).then(function(res) {
    if (res.error) alert("Failed to update status: " + res.error.message);
    else loadOrdersData();
  });
}


function calculateStats() {
  var totalRevenue = 0;
  var pendingCount = 0;

  for (var i = 0; i < ordersList.length; i++) {
    if (ordersList[i].status !== 'Cancelled') {
      totalRevenue += parseFloat(ordersList[i].amount || 0);
    }
    if (ordersList[i].status === 'Pending') {
      pendingCount++;
    }
  }

  if (document.getElementById('statRevenue')) document.getElementById('statRevenue').innerText = "$" + totalRevenue.toFixed(2);
  if (document.getElementById('statOrders')) document.getElementById('statOrders').innerText = ordersList.length;
  if (document.getElementById('statPending')) document.getElementById('statPending').innerText = pendingCount;
  if (document.getElementById('statProducts')) document.getElementById('statProducts').innerText = productsList.length;
}