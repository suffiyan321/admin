var DEFAULT_IMG = "https://via.placeholder.com/150";
var productsList = [];
var ordersList = [];

function loadAdminDashboard() {
  loadProductsData();
  loadOrdersData();
  drawCategories();
  listenToRealtimeOrders();
}

function loadProductsData() {
  if (typeof db === 'undefined') return;

  db.from('products').select('*').order('id', { ascending: false }).then(function(res) {
    if (res.error) {
      alert("Error loading products: " + res.error.message);
      return;
    }
    productsList = res.data || [];
    if (document.getElementById('adminTableBody')) drawAdminTable();
    calculateStats();
  });
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
        "<a style='color:#58a6ff; cursor:pointer; font-weight:600; margin-right:15px;' onclick='editProduct(\"" + item.id + "\")'>Edit</a>" +
        "<a style='color:#f85149; cursor:pointer; font-weight:600;' onclick='deleteProduct(\"" + item.id + "\")'>Delete</a>" +
      "</td>" +
    "</tr>";
  }
}

window.deleteProduct = function(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  db.from('products').delete().eq('id', id).then(function(res) {
    if (res.error) {
      alert("Delete failed: " + res.error.message);
    } else {
      alert("Product deleted successfully!");
      loadProductsData();
    }
  });
};

window.editProduct = function(id) {
  var product = productsList.find(function(p) { return p.id == id; });
  if (!product) {
    alert("Product not found!");
    return;
  }

  var newTitle = prompt("Update Product Title:", product.title);
  if (newTitle === null) return;

  var newPrice = prompt("Update Product Price ($):", product.price);
  if (newPrice === null) return;

  var newStock = prompt("Update Product Stock:", product.stock);
  if (newStock === null) return;

  var newCategory = prompt("Update Category:", product.category || "General");
  if (newCategory === null) return;

  var newImage = prompt("Update Image URL:", product.image || "");
  if (newImage === null) return;

  db.from('products').update({
    title: newTitle.trim(),
    price: parseFloat(newPrice) || 0,
    stock: parseInt(newStock) || 0,
    category: newCategory.trim(),
    image: newImage.trim()
  }).eq('id', id).then(function(res) {
    if (res.error) {
      alert("Update failed: " + res.error.message);
    } else {
      alert("Product updated successfully!");
      loadProductsData();
    }
  });
};

function loadOrdersData() {
  if (typeof db === 'undefined') return;
  db.from('orders').select('*').order('id', { ascending: false }).then(function(res) {
    if (res.error) return;
    ordersList = res.data || [];
    if (document.getElementById('ordersTableBody')) drawOrdersTable();
    if (document.getElementById('recentOrdersBody')) drawRecentOrders();
    calculateStats();
  });
}

function listenToRealtimeOrders() {
  if (typeof db === 'undefined') return;
  db.channel('admin-live-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, function() {
      loadOrdersData();
    })
    .subscribe();
}

function drawCategories() {
  var catListDiv = document.getElementById('categoryAdminList');
  if (!catListDiv || typeof db === 'undefined') return;

  db.from('categories').select('*').order('id', { ascending: false }).then(function(res) {
    if (res.error) return;
    var categories = res.data || [];
    catListDiv.innerHTML = '';

    for (var i = 0; i < categories.length; i++) {
      var c = categories[i];
      catListDiv.innerHTML += '<div class="cat-item"><span>' + c.name + '</span><button onclick="deleteCategory(\'' + c.id + '\')">Delete</button></div>';
    }
  });
}

function deleteCategory(id) {
  if (confirm("Delete category?")) {
    db.from('categories').delete().eq('id', id).then(function() {
      drawCategories();
    });
  }
}

function calculateStats() {
  var totalRevenue = 0;
  var pendingCount = 0;

  for (var i = 0; i < ordersList.length; i++) {
    if (ordersList[i].status !== 'Cancelled') totalRevenue += parseFloat(ordersList[i].amount || 0);
    if (ordersList[i].status === 'Pending') pendingCount++;
  }

  if (document.getElementById('statRevenue')) document.getElementById('statRevenue').innerText = "$" + totalRevenue.toFixed(2);
  if (document.getElementById('statOrders')) document.getElementById('statOrders').innerText = ordersList.length;
  if (document.getElementById('statPending')) document.getElementById('statPending').innerText = pendingCount;
  if (document.getElementById('statProducts')) document.getElementById('statProducts').innerText = productsList.length;
}