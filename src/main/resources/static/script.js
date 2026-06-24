// VVM Pavers – Full Client & Admin Logic

const BACKEND_URL = "http://localhost:8081";
const ADMIN_PHONE = "8220287295";

// ── Bootstrap Modal instances ──────────────────────────────────────────────
let loginModalInstance;
let productModalInstance;
let customerPortalModalInstance;
let forgotPasswordModalInstance;
let resetPasswordModalInstance;
let productDetailModalInstance;
let completedProjectModalInstance;
let activeToast;

// ── Session helpers ────────────────────────────────────────────────────────
const AdminSession = {
    save: (token, username) => {
        sessionStorage.setItem("adminToken", token);
        sessionStorage.setItem("adminUsername", username);
        sessionStorage.setItem("isAdminLoggedIn", "true");
    },
    token: () => sessionStorage.getItem("adminToken"),
    username: () => sessionStorage.getItem("adminUsername"),
    isLoggedIn: () => sessionStorage.getItem("isAdminLoggedIn") === "true",
    clear: () => {
        sessionStorage.removeItem("adminToken");
        sessionStorage.removeItem("adminUsername");
        sessionStorage.removeItem("isAdminLoggedIn");
    }
};

const CustomerSession = {
    save: (token, name, email, phone) => {
        sessionStorage.setItem("custToken", token);
        sessionStorage.setItem("custName", name);
        sessionStorage.setItem("custEmail", email);
        sessionStorage.setItem("custPhone", phone);
        sessionStorage.setItem("isCustLoggedIn", "true");
    },
    token: () => sessionStorage.getItem("custToken"),
    name: () => sessionStorage.getItem("custName"),
    email: () => sessionStorage.getItem("custEmail"),
    phone: () => sessionStorage.getItem("custPhone"),
    isLoggedIn: () => sessionStorage.getItem("isCustLoggedIn") === "true",
    clear: () => {
        ["custToken","custName","custEmail","custPhone","isCustLoggedIn"].forEach(k => sessionStorage.removeItem(k));
    }
};

// ── DOMContentLoaded ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    // Init Bootstrap Modals
    loginModalInstance             = new bootstrap.Modal(document.getElementById('loginModal'));
    productModalInstance           = new bootstrap.Modal(document.getElementById('productModal'));
    customerPortalModalInstance    = new bootstrap.Modal(document.getElementById('customerPortalModal'));
    forgotPasswordModalInstance    = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    resetPasswordModalInstance     = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    productDetailModalInstance     = new bootstrap.Modal(document.getElementById('productDetailModal'));
    completedProjectModalInstance  = new bootstrap.Modal(document.getElementById('completedProjectModal'));

    // Toast
    const toastEl = document.getElementById('app-toast');
    if (toastEl) activeToast = new bootstrap.Toast(toastEl, { delay: 4000 });

    // Scroll navbar
    window.addEventListener("scroll", () => {
        document.getElementById("main-nav")?.classList.toggle("scrolled", window.scrollY > 50);
    });

    // Check URL for reset-password token
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("resetToken")) {
        const token = urlParams.get("resetToken");
        const role  = urlParams.get("role") || "customer";
        document.getElementById("reset-token").value = token;
        document.getElementById("reset-role").value  = role;
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        resetPasswordModalInstance.show();
    }

    // Restore session state
    checkLoginState();

    // Load public data
    loadProducts();
    loadCompletedProjects();

    // Form event listeners
    document.getElementById("contact-form")?.addEventListener("submit", handleInquirySubmit);
    document.getElementById("admin-login-form")?.addEventListener("submit", handleAdminLoginSubmit);
    document.getElementById("product-form")?.addEventListener("submit", handleProductSubmit);
    document.getElementById("customer-login-form")?.addEventListener("submit", handleCustomerLoginSubmit);
    document.getElementById("customer-register-form")?.addEventListener("submit", handleCustomerRegisterSubmit);
    document.getElementById("forgot-password-form")?.addEventListener("submit", handleForgotPasswordSubmit);
    document.getElementById("reset-password-form")?.addEventListener("submit", handleResetPasswordSubmit);
    document.getElementById("customer-profile-form")?.addEventListener("submit", handleCustomerProfileUpdate);
    document.getElementById("admin-profile-form")?.addEventListener("submit", handleAdminProfileUpdate);
    document.getElementById("detail-order-form")?.addEventListener("submit", handleDetailOrderSubmit);
    document.getElementById("completed-project-form")?.addEventListener("submit", handleCompletedProjectSubmit);

    // Photo upload handlers
    setupPhotoUpload();
    setupProjectPhotoUpload();

    // Tab load hooks (load data lazily on tab click)
    document.getElementById("orders-tab")?.addEventListener("click", () => {
        if (AdminSession.isLoggedIn()) loadAdminOrders();
    });
    document.getElementById("inquiries-tab")?.addEventListener("click", () => {
        if (AdminSession.isLoggedIn()) loadAdminInquiries();
    });
    document.getElementById("admin-projects-tab")?.addEventListener("click", () => {
        if (AdminSession.isLoggedIn()) loadAdminProjects();
    });
    document.getElementById("admin-customers-tab")?.addEventListener("click", () => {
        if (AdminSession.isLoggedIn()) loadRegisteredCustomers();
    });
    document.getElementById("admin-profile-tab")?.addEventListener("click", () => {
        if (AdminSession.isLoggedIn()) prefillAdminProfile();
    });
});

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(message, type = "success") {
    const toastBody = document.getElementById('toast-message');
    const toastEl   = document.getElementById('app-toast');
    if (!toastBody || !toastEl) return;
    toastBody.innerText = message;
    toastEl.className = "toast align-items-center text-white border-0";
    toastEl.classList.add(type === "success" ? "bg-success" : type === "error" ? "bg-danger" : "bg-dark");
    activeToast?.show();
}

// ── Modal helpers ──────────────────────────────────────────────────────────
function showLoginModal()          { loginModalInstance.show(); }
function showCustomerPortalModal() { customerPortalModalInstance.show(); }

function closeModal(id) {
    const map = {
        loginModal: loginModalInstance,
        productModal: productModalInstance,
        customerPortalModal: customerPortalModalInstance,
        forgotPasswordModal: forgotPasswordModalInstance,
        resetPasswordModal: resetPasswordModalInstance,
        productDetailModal: productDetailModalInstance,
        completedProjectModal: completedProjectModalInstance
    };
    map[id]?.hide();
}

function showAddProductModal() {
    document.getElementById("product-form").reset();
    document.getElementById("product-id").value = "";
    document.getElementById("productModalTitle").innerText = "Add New Paver";
    document.getElementById("image-preview-container").classList.add("d-none");
    productModalInstance.show();
}

function showAddProjectModal() {
    document.getElementById("completed-project-form").reset();
    document.getElementById("completed-project-id").value = "";
    document.getElementById("completedProjectModalTitle").innerText = "Add Completed Project";
    document.getElementById("project-image-preview-container")?.classList.add("d-none");
    completedProjectModalInstance.show();
}

// ── Login State ────────────────────────────────────────────────────────────
function checkLoginState() {
    const navAdminBtn     = document.getElementById("nav-admin-btn-container");
    const navLogoutBtn    = document.getElementById("nav-logout-btn-container");
    const navCustBtn      = document.getElementById("nav-customer-btn-container");
    const navCustDash     = document.getElementById("nav-customer-dashboard-container");
    const customerView    = document.getElementById("customer-view");
    const adminView       = document.getElementById("admin-view");
    const custDashView    = document.getElementById("customer-dashboard-view");

    if (AdminSession.isLoggedIn()) {
        navAdminBtn?.classList.add("d-none");
        navLogoutBtn?.classList.remove("d-none");
        navCustBtn?.classList.add("d-none");
        navCustDash?.classList.add("d-none");
        customerView?.classList.add("d-none");
        custDashView?.classList.add("d-none");
        adminView?.classList.remove("d-none");
        loadAdminData();
    } else if (CustomerSession.isLoggedIn()) {
        navCustBtn?.classList.add("d-none");
        navCustDash?.classList.remove("d-none");
        navAdminBtn?.classList.remove("d-none");
        navLogoutBtn?.classList.add("d-none");
        customerView?.classList.remove("d-none");
        adminView?.classList.add("d-none");
        custDashView?.classList.add("d-none");
        loadProducts();
        loadCompletedProjects();
    } else {
        navAdminBtn?.classList.remove("d-none");
        navLogoutBtn?.classList.add("d-none");
        navCustBtn?.classList.remove("d-none");
        navCustDash?.classList.add("d-none");
        customerView?.classList.remove("d-none");
        adminView?.classList.add("d-none");
        custDashView?.classList.add("d-none");
    }
}

// ── Toggle Customer Dashboard View ─────────────────────────────────────────
function toggleCustomerDashboard(show) {
    const custDashView = document.getElementById("customer-dashboard-view");
    const customerView = document.getElementById("customer-view");

    if (show) {
        customerView?.classList.add("d-none");
        custDashView?.classList.remove("d-none");
        loadCustomerDashboard();
    } else {
        custDashView?.classList.add("d-none");
        customerView?.classList.remove("d-none");
    }
}

// ── Load Products ──────────────────────────────────────────────────────────
function loadProducts() {
    const container = document.getElementById("product-container");
    if (!container) return;

    fetch(`${BACKEND_URL}/products`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(products => {
            container.innerHTML = "";
            if (!products.length) {
                container.innerHTML = `<div class="col-12 text-center py-5">
                    <i class="fa-solid fa-folder-open fa-3x text-secondary mb-3 d-block"></i>
                    <p class="text-secondary">No pavers available in the catalog currently.</p></div>`;
                return;
            }
            products.forEach(p => {
                const images = (p.imageUrl || "").split(",").map(s => s.trim()).filter(Boolean);
                const displayImg = images[0] || (p.id % 2 === 0 ? "image/pavers1.jpeg" : "image/pavers2.jpeg");
                const multiImgBadge = images.length > 1
                    ? `<span class="position-absolute top-0 start-0 m-2 badge" style="background:rgba(0,0,0,0.7);color:#ffb300;border:1px solid #ffb300;font-size:11px">
                            <i class="fa-solid fa-images me-1"></i>${images.length} Photos
                       </span>` : "";

                // Pre-fill customer name/phone if logged in
                const custName  = CustomerSession.isLoggedIn() ? CustomerSession.name()  : "";
                const custPhone = CustomerSession.isLoggedIn() ? CustomerSession.phone() : "";

                container.innerHTML += `
                <div class="col-lg-4 col-md-6">
                  <div class="product-card">
                    <div class="product-image-wrapper">
                      <span class="product-badge">${p.type}</span>
                      ${multiImgBadge}
                      <img src="${displayImg}" alt="${p.name}" loading="lazy">
                    </div>
                    <div class="product-body">
                      <h4 class="product-title">${p.name}</h4>
                      <div class="product-meta">
                        <span><i class="fa-solid fa-palette text-amber me-1"></i>${p.color}</span>
                      </div>
                      <div class="product-price-row">
                        <span class="price-value">₹${parseFloat(p.price).toFixed(2)}</span>
                        <span class="price-unit">per Sq Ft</span>
                      </div>
                      <div class="calc-panel">
                        <div class="calc-title">Live Cost Calculator</div>
                        <div class="calc-input-group">
                          <input type="number" class="calc-input" id="calc-input-${p.id}"
                            placeholder="Sq Ft" min="1" value="100"
                            oninput="calculatePrice(${p.id}, ${p.price})">
                          <div class="calc-result">
                            <span>Est. Price:</span>
                            <div class="calc-result-price" id="calc-result-${p.id}">
                              ₹${(p.price * 100).toLocaleString('en-IN',{maximumFractionDigits:2})}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="d-flex gap-2 mt-2">
                        <button class="btn btn-detail" onclick="openProductDetail(${p.id},'${escJs(p.name)}','${escJs(p.type)}','${escJs(p.color)}',${p.price},'${escJs(p.imageUrl||'')}')">
                          <i class="fa-solid fa-eye me-1"></i> View Details
                        </button>
                        <button class="btn btn-amber flex-grow-1" onclick="openProductDetail(${p.id},'${escJs(p.name)}','${escJs(p.type)}','${escJs(p.color)}',${p.price},'${escJs(p.imageUrl||'')}')">
                          <i class="fa-solid fa-cart-arrow-down me-1"></i> Order
                        </button>
                      </div>
                    </div>
                  </div>
                </div>`;
            });
        })
        .catch(() => {
            if (container) container.innerHTML = `<div class="col-12 text-center py-5">
                <i class="fa-solid fa-circle-exclamation fa-3x text-danger mb-3 d-block"></i>
                <p class="text-danger">Cannot connect to backend. Please ensure the server is running on port 8081.</p></div>`;
        });
}

// escape JS string for inline onclick attributes
function escJs(str) {
    return (str || "").replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/"/g,"\\\"");
}

// ── Live Price Calculator ──────────────────────────────────────────────────
function calculatePrice(productId, rate) {
    const input  = document.getElementById(`calc-input-${productId}`);
    const result = document.getElementById(`calc-result-${productId}`);
    if (!input || !result) return;
    const val = parseFloat(input.value);
    result.innerText = (!isNaN(val) && val > 0)
        ? "₹" + (val * rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })
        : "₹0.00";
}

// ── Product Detail Modal ───────────────────────────────────────────────────
let _detailProduct = {};

function openProductDetail(id, name, type, color, price, imageUrlRaw) {
    _detailProduct = { id, name, type, color, price };

    // Fill text fields
    document.getElementById("detailModalTitle").innerHTML =
        `<i class="fa-solid fa-circle-info text-amber me-2"></i>${name}`;
    document.getElementById("detail-product-name").innerText = name;
    document.getElementById("detail-product-type").innerText = type;
    document.getElementById("detail-product-color").innerText = color;
    document.getElementById("detail-product-price").innerText = `₹${parseFloat(price).toFixed(2)} / Sq Ft`;

    // Build carousel
    const images = (imageUrlRaw || "").split(",").map(s => s.trim()).filter(Boolean);
    if (!images.length) images.push("image/pavers1.jpeg");

    const indicatorsContainer = document.getElementById("carousel-indicators-container");
    const innerContainer      = document.getElementById("carousel-inner-container");
    indicatorsContainer.innerHTML = "";
    innerContainer.innerHTML = "";

    images.forEach((src, i) => {
        indicatorsContainer.innerHTML += `
            <button type="button" data-bs-target="#detailProductCarousel" data-bs-slide-to="${i}"
                ${i === 0 ? 'class="active" aria-current="true"' : ''}
                aria-label="Slide ${i+1}"></button>`;
        innerContainer.innerHTML += `
            <div class="carousel-item ${i === 0 ? 'active' : ''}">
                <img src="${src}" class="detail-carousel-img" alt="${name} photo ${i+1}" loading="lazy">
            </div>`;
    });

    // Estimator
    const calcInput = document.getElementById("detail-calc-input");
    if (calcInput) { calcInput.value = 500; }
    calculateDetailPrice();

    // Pre-fill customer name/phone if logged in
    if (CustomerSession.isLoggedIn()) {
        document.getElementById("detail-customer-name").value  = CustomerSession.name();
        document.getElementById("detail-customer-phone").value = CustomerSession.phone();
    } else {
        document.getElementById("detail-customer-name").value  = "";
        document.getElementById("detail-customer-phone").value = "";
    }

    // Store product id/name/rate
    document.getElementById("detail-order-product-id").value   = id;
    document.getElementById("detail-order-product-name").value = name;
    document.getElementById("detail-order-rate").value         = price;
    document.getElementById("detail-whatsapp-order-btn")?.classList.add("d-none");

    productDetailModalInstance.show();
}

function calculateDetailPrice() {
    const rate  = _detailProduct.price || 0;
    const input = document.getElementById("detail-calc-input");
    const res   = document.getElementById("detail-calc-result");
    if (!input || !res) return;
    const val = parseFloat(input.value);
    const total = (!isNaN(val) && val > 0) ? val * rate : 0;
    res.innerText = "₹" + total.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    document.getElementById("detail-order-area").value  = val || 0;
    document.getElementById("detail-order-total").value = total;
}

// ── Detail Order Form Submit ───────────────────────────────────────────────
function handleDetailOrderSubmit(e) {
    e.preventDefault();

    const sqFt  = parseFloat(document.getElementById("detail-calc-input").value) || 0;
    const rate  = _detailProduct.price || 0;
    const total = sqFt * rate;

    const order = {
        customerName:  document.getElementById("detail-customer-name").value.trim(),
        customerPhone: document.getElementById("detail-customer-phone").value.trim(),
        productName:   _detailProduct.name,
        pricePerSqFt:  rate,
        areaSqFt:      sqFt,
        totalPrice:    total,
        orderStatus:   "PENDING"
    };

    // Link to customer account if logged in
    if (CustomerSession.isLoggedIn() && CustomerSession.token()) {
        // We'll pass customerId via header-check at order save
        // (backend will store order – customerId not in POST body for guest orders,
        //  customer orders are retrieved separately via /customer/orders)
    }

    const headers = { "Content-Type": "application/json" };
    if (CustomerSession.isLoggedIn() && CustomerSession.token()) {
        headers["Authorization"] = `Bearer ${CustomerSession.token()}`;
    }

    fetch(`${BACKEND_URL}/orders`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(order)
    })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(saved => {
        showToast("Order placed and saved successfully!");
        window.currentDetailOrder = { ...order, id: saved.id };
        document.getElementById("detail-whatsapp-order-btn")?.classList.remove("d-none");
    })
    .catch(() => showToast("Error placing order. Please retry.", "error"));
}

function sendOrderToWhatsAppFromDetail() {
    const ord = window.currentDetailOrder;
    if (!ord) return;
    const msg = encodeURIComponent(`Hello VVM Pavers! I've placed an order:

*Order ID:* VVM-ORD-${ord.id}
*Paver Model:* ${ord.productName}
*Area:* ${ord.areaSqFt} Sq Ft
*Unit Price:* ₹${ord.pricePerSqFt}/Sq Ft
*Total Cost:* ₹${ord.totalPrice.toLocaleString('en-IN')}

*Name:* ${ord.customerName}
*Phone:* ${ord.customerPhone}

Please confirm and advise delivery timeline. Thank you!`);
    productDetailModalInstance.hide();
    document.getElementById("detail-order-form")?.reset();
    window.open(`https://wa.me/91${ADMIN_PHONE}?text=${msg}`, "_blank");
}

// ── Completed Projects Gallery ─────────────────────────────────────────────
function loadCompletedProjects() {
    const container = document.getElementById("project-gallery-container");
    if (!container) return;

    fetch(`${BACKEND_URL}/projects`)
        .then(r => r.json())
        .then(projects => {
            container.innerHTML = "";
            if (!projects.length) {
                container.innerHTML = `<div class="col-12 gallery-empty">
                    <i class="fa-solid fa-image d-block text-center"></i>
                    <p class="mt-3">Our completed projects gallery will be available soon. Stay tuned!</p>
                </div>`;
                return;
            }
            projects.forEach(proj => {
                const imgSrc = proj.imageUrl || "image/pavers1.jpeg";
                container.innerHTML += `
                <div class="col-lg-4 col-md-6">
                  <div class="project-card" onclick="openLightbox('${escJs(imgSrc)}','${escJs(proj.title)}','${escJs(proj.description||'')}')">
                    <button class="project-view-btn" title="View Full Image">
                      <i class="fa-solid fa-expand"></i>
                    </button>
                    <img src="${imgSrc}" alt="${proj.title}" loading="lazy">
                    <div class="project-card-overlay">
                      <h5>${proj.title}</h5>
                      <p>${proj.description || "Premium paving project"}</p>
                    </div>
                  </div>
                </div>`;
            });
        })
        .catch(() => {
            if (container) container.innerHTML = `<div class="col-12 gallery-empty">
                <i class="fa-solid fa-exclamation-triangle d-block text-center text-secondary"></i>
                <p class="mt-3 text-secondary">Gallery currently unavailable.</p>
            </div>`;
        });
}

// ── Project Lightbox ───────────────────────────────────────────────────────
function openLightbox(imgSrc, title, desc) {
    let lb = document.getElementById("project-lightbox");
    if (!lb) {
        lb = document.createElement("div");
        lb.id = "project-lightbox";
        lb.innerHTML = `
            <button class="lightbox-close" onclick="closeLightbox()"><i class="fa-solid fa-xmark"></i></button>
            <img id="lb-img" src="" alt="">
            <h4 id="lb-title"></h4>
            <p id="lb-desc"></p>`;
        document.body.appendChild(lb);
        lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });
    }
    document.getElementById("lb-img").src   = imgSrc;
    document.getElementById("lb-title").innerText = title;
    document.getElementById("lb-desc").innerText  = desc || "";
    lb.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeLightbox() {
    document.getElementById("project-lightbox")?.classList.remove("active");
    document.body.style.overflow = "";
}

// ── Contact / Inquiry Form ─────────────────────────────────────────────────
function handleInquirySubmit(e) {
    e.preventDefault();
    const inquiry = {
        name:    document.getElementById("name").value,
        phone:   document.getElementById("phone").value,
        message: document.getElementById("message").value
    };
    fetch(`${BACKEND_URL}/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inquiry)
    })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(() => {
        showToast("Inquiry submitted successfully! We'll contact you soon.");
        document.getElementById("contact-form").reset();
    })
    .catch(() => showToast("Failed to submit inquiry. Please retry.", "error"));
}

// ── Admin Login ────────────────────────────────────────────────────────────
function handleAdminLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById("admin-username").value.trim();
    const password = document.getElementById("admin-password").value.trim();

    fetch(`${BACKEND_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(r => { if (!r.ok) throw new Error("Invalid credentials"); return r.json(); })
    .then(data => {
        if (data.error) throw new Error(data.error);
        AdminSession.save(data.token, data.username || username);
        loginModalInstance.hide();
        document.getElementById("admin-login-form").reset();
        showToast(`Welcome back, ${AdminSession.username()}! Admin dashboard loaded.`);
        checkLoginState();
    })
    .catch(err => showToast(err.message || "Invalid admin credentials.", "error"));
}

// ── Admin Logout ───────────────────────────────────────────────────────────
function handleLogout() {
    const token = AdminSession.token();
    if (token) {
        fetch(`${BACKEND_URL}/admin/logout`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        }).catch(() => {});
    }
    AdminSession.clear();
    showToast("Logged out of admin portal.");
    checkLoginState();
    loadProducts();
    loadCompletedProjects();
}

// ── Customer Registration ──────────────────────────────────────────────────
function handleCustomerRegisterSubmit(e) {
    e.preventDefault();
    const customer = {
        name:     document.getElementById("cust-reg-name").value.trim(),
        email:    document.getElementById("cust-reg-email").value.trim(),
        phone:    document.getElementById("cust-reg-phone").value.trim(),
        password: document.getElementById("cust-reg-password").value.trim()
    };

    if (customer.password.length < 6) {
        showToast("Password must be at least 6 characters.", "error");
        return;
    }

    fetch(`${BACKEND_URL}/customer/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer)
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        showToast(`Account created! Welcome, ${customer.name}. Please log in.`);
        document.getElementById("customer-register-form").reset();
        // Switch to login tab
        document.getElementById("cust-login-tab")?.click();
    })
    .catch(err => showToast(err.message || "Registration failed. Email may already be in use.", "error"));
}

// ── Customer Login ─────────────────────────────────────────────────────────
function handleCustomerLoginSubmit(e) {
    e.preventDefault();
    const email    = document.getElementById("cust-login-email").value.trim();
    const password = document.getElementById("cust-login-password").value.trim();

    fetch(`${BACKEND_URL}/customer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        CustomerSession.save(data.token, data.name, data.email, data.phone);
        customerPortalModalInstance.hide();
        document.getElementById("customer-login-form").reset();
        showToast(`Welcome back, ${CustomerSession.name()}! You're now logged in.`);
        checkLoginState();
    })
    .catch(err => showToast(err.message || "Login failed. Check your email and password.", "error"));
}

// ── Customer Logout ────────────────────────────────────────────────────────
function handleCustomerLogout() {
    const token = CustomerSession.token();
    if (token) {
        fetch(`${BACKEND_URL}/customer/logout`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        }).catch(() => {});
    }
    CustomerSession.clear();
    showToast("You have been logged out.");
    checkLoginState();
    loadProducts();
    loadCompletedProjects();
}

// ── Forgot Password ────────────────────────────────────────────────────────
function toggleForgotPassword(role) {
    // Close parent modal, open forgot password modal
    if (role === "admin") {
        loginModalInstance.hide();
    } else {
        customerPortalModalInstance.hide();
    }
    document.getElementById("forgot-role").value = role;
    document.getElementById("simulated-link-container")?.classList.add("d-none");
    document.getElementById("forgot-password-form").reset();
    document.getElementById("forgot-role").value = role;
    setTimeout(() => forgotPasswordModalInstance.show(), 300);
}

function handleForgotPasswordSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value.trim();
    const role  = document.getElementById("forgot-role").value || "customer";
    const url   = role === "admin" ? `${BACKEND_URL}/admin/forgot-password` : `${BACKEND_URL}/customer/forgot-password`;

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        const container = document.getElementById("simulated-link-container");
        const linkEl    = document.getElementById("simulated-reset-link");
        if (container && linkEl && data.resetLink) {
            container.classList.remove("d-none");
            // Build clickable reset link with role and token embedded in URL
            const resetUrl = `${window.location.origin}${window.location.pathname}?resetToken=${encodeURIComponent(data.resetLink)}&role=${role}`;
            linkEl.href        = resetUrl;
            linkEl.innerText   = resetUrl;
        }
        showToast("Recovery link generated! Click the link below to reset your password.");
    })
    .catch(err => showToast(err.message || "Email not found in system.", "error"));
}

// ── Reset Password ─────────────────────────────────────────────────────────
function handleResetPasswordSubmit(e) {
    e.preventDefault();
    const token       = document.getElementById("reset-token").value.trim();
    const newPassword = document.getElementById("reset-new-password").value.trim();
    const role        = document.getElementById("reset-role").value || "customer";

    if (newPassword.length < 6) {
        showToast("Password must be at least 6 characters.", "error");
        return;
    }

    const url = role === "admin" ? `${BACKEND_URL}/admin/reset-password` : `${BACKEND_URL}/customer/reset-password`;

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        resetPasswordModalInstance.hide();
        document.getElementById("reset-password-form").reset();
        showToast("Password updated successfully! Please log in with your new password.");
    })
    .catch(err => showToast(err.message || "Password reset failed. Token may have expired.", "error"));
}

// ── Customer Dashboard ─────────────────────────────────────────────────────
function loadCustomerDashboard() {
    // Populate profile form
    document.getElementById("customer-welcome-name").innerText = `Welcome Back, ${CustomerSession.name()}`;
    document.getElementById("profile-name").value  = CustomerSession.name();
    document.getElementById("profile-email").value = CustomerSession.email();
    document.getElementById("profile-phone").value = CustomerSession.phone();
    document.getElementById("profile-password").value = "";

    // Load order history
    loadCustomerOrders();
}

function loadCustomerOrders() {
    const tableBody = document.getElementById("customer-orders-table-body");
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-amber" role="status"></div> Loading orders...</td></tr>`;

    fetch(`${BACKEND_URL}/customer/orders`, {
        headers: { "Authorization": `Bearer ${CustomerSession.token()}` }
    })
    .then(r => r.json())
    .then(orders => {
        tableBody.innerHTML = "";
        if (!orders || !orders.length) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">
                <i class="fa-solid fa-box-open fa-2x mb-2 d-block opacity-50"></i>
                No orders placed yet. Browse our catalog and place your first order!</td></tr>`;
            return;
        }
        orders.sort((a, b) => b.id - a.id).forEach(o => {
            let badge = `<span class="badge-pending">Pending</span>`;
            if (o.orderStatus === "COMPLETED") badge = `<span class="badge-completed">Completed</span>`;
            if (o.orderStatus === "CANCELLED") badge = `<span class="badge-cancelled">Cancelled</span>`;

            let dateStr = "N/A";
            if (o.orderDate) {
                const dt = new Date(o.orderDate);
                dateStr = dt.toLocaleDateString('en-IN') + " " + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            }
            tableBody.innerHTML += `
            <tr>
              <td class="text-secondary fw-bold">#VVM-${o.id}</td>
              <td style="font-size:12px">${dateStr}</td>
              <td class="fw-bold">${o.productName}</td>
              <td>${o.areaSqFt} Sq Ft</td>
              <td class="text-amber fw-bold">₹${parseFloat(o.totalPrice).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
              <td>${badge}</td>
              <td>
                <a href="https://wa.me/91${ADMIN_PHONE}?text=${encodeURIComponent(`Hello VVM Pavers, I want to check on Order #VVM-${o.id} for ${o.productName}.`)}"
                   target="_blank" class="btn-wa-sm"><i class="fa-brands fa-whatsapp me-1"></i>Contact</a>
              </td>
            </tr>`;
        });
    })
    .catch(() => {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">
            Failed to load order history.</td></tr>`;
    });
}

// ── Customer Profile Update ────────────────────────────────────────────────
function handleCustomerProfileUpdate(e) {
    e.preventDefault();
    const name     = document.getElementById("profile-name").value.trim();
    const phone    = document.getElementById("profile-phone").value.trim();
    const password = document.getElementById("profile-password").value.trim();

    const payload = { name, phone };
    if (password) {
        if (password.length < 6) { showToast("New password must be at least 6 characters.", "error"); return; }
        payload.password = password;
    }

    fetch(`${BACKEND_URL}/customer/update-profile`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CustomerSession.token()}`
        },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        // Update session cache
        CustomerSession.save(CustomerSession.token(), name, CustomerSession.email(), phone);
        document.getElementById("customer-welcome-name").innerText = `Welcome Back, ${name}`;
        showToast("Profile updated successfully!");
        document.getElementById("profile-password").value = "";
    })
    .catch(err => showToast(err.message || "Profile update failed.", "error"));
}

// ── ADMIN DASHBOARD DATA LOADERS ───────────────────────────────────────────
function loadAdminData() {
    loadAdminProducts();
    loadAdminOrders();
    loadAdminInquiries();
    loadAdminProjects();
    loadRegisteredCustomers();
}

// ── Admin Products Table ───────────────────────────────────────────────────
function loadAdminProducts() {
    const tableBody = document.getElementById("admin-product-table-body");
    if (!tableBody) return;

    fetch(`${BACKEND_URL}/products`)
        .then(r => r.json())
        .then(products => {
            tableBody.innerHTML = "";
            if (!products.length) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No pavers in the catalog.</td></tr>`;
                return;
            }
            products.forEach(p => {
                const images = (p.imageUrl || "").split(",").map(s => s.trim()).filter(Boolean);
                const imgSrc = images[0] || (p.id % 2 === 0 ? "image/pavers1.jpeg" : "image/pavers2.jpeg");
                tableBody.innerHTML += `
                <tr>
                  <td><img src="${imgSrc}" class="rounded" style="width:60px;height:45px;object-fit:cover"></td>
                  <td class="fw-bold">${p.name}${images.length>1 ? `<small class="text-amber ms-1">(${images.length} photos)</small>` : ""}</td>
                  <td>${p.type}</td>
                  <td>${p.color}</td>
                  <td class="text-amber fw-bold">₹${parseFloat(p.price).toFixed(2)}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-amber me-1"
                      onclick="editProduct(${p.id},'${escJs(p.name)}','${escJs(p.type)}','${escJs(p.color)}',${p.price},'${escJs(p.imageUrl||'')}')">
                      <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-light text-danger border-danger" onclick="deleteProduct(${p.id})">
                      <i class="fa-solid fa-trash"></i> Delete
                    </button>
                  </td>
                </tr>`;
            });
        });
}

// ── Admin Orders Table ─────────────────────────────────────────────────────
function loadAdminOrders() {
    const tableBody = document.getElementById("admin-orders-table-body");
    if (!tableBody) return;

    fetch(`${BACKEND_URL}/orders`, {
        headers: { "Authorization": `Bearer ${AdminSession.token()}` }
    })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(orders => {
        tableBody.innerHTML = "";
        if (!orders.length) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No customer orders yet.</td></tr>`;
            return;
        }
        orders.sort((a, b) => b.id - a.id).forEach(o => {
            let badge = `<span class="badge-pending">Pending</span>`;
            if (o.orderStatus === "COMPLETED") badge = `<span class="badge-completed">Completed</span>`;
            if (o.orderStatus === "CANCELLED") badge = `<span class="badge-cancelled">Cancelled</span>`;

            let dateStr = "N/A";
            if (o.orderDate) {
                const dt = new Date(o.orderDate);
                dateStr = dt.toLocaleDateString('en-IN') + " " + dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
            }
            tableBody.innerHTML += `
            <tr>
              <td class="text-secondary fw-bold">#VVM-${o.id}</td>
              <td style="font-size:13px">${dateStr}</td>
              <td>
                <div class="fw-bold">${o.customerName}</div>
                <small class="text-secondary"><i class="fa-solid fa-phone text-amber me-1"></i>${o.customerPhone}</small>
              </td>
              <td>${o.productName}</td>
              <td>${o.areaSqFt} Sq Ft</td>
              <td class="text-amber fw-bold">₹${parseFloat(o.totalPrice).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
              <td>${badge}</td>
              <td>
                <div class="dropdown">
                  <button class="btn btn-sm btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown">Manage</button>
                  <ul class="dropdown-menu dropdown-menu-dark">
                    <li><a class="dropdown-item" href="#" onclick="updateOrderStatus(${o.id},'COMPLETED')">
                        <i class="fa-solid fa-check text-success me-2"></i>Mark Completed</a></li>
                    <li><a class="dropdown-item" href="#" onclick="updateOrderStatus(${o.id},'CANCELLED')">
                        <i class="fa-solid fa-xmark text-danger me-2"></i>Cancel Order</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="https://wa.me/91${o.customerPhone}?text=${encodeURIComponent(`Hello ${o.customerName}, from VVM Pavers regarding your order #VVM-${o.id}...`)}" target="_blank">
                        <i class="fa-brands fa-whatsapp text-success me-2"></i>WhatsApp</a></li>
                  </ul>
                </div>
              </td>
            </tr>`;
        });
    })
    .catch(() => {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load orders.</td></tr>`;
    });
}

// ── Update Order Status ────────────────────────────────────────────────────
function updateOrderStatus(orderId, status) {
    fetch(`${BACKEND_URL}/orders/${orderId}/status?status=${status}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${AdminSession.token()}` }
    })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(() => { showToast(`Order #VVM-${orderId} marked as ${status}!`); loadAdminOrders(); })
    .catch(() => showToast("Failed to update order status.", "error"));
}

// ── Admin Inquiries Table ──────────────────────────────────────────────────
function loadAdminInquiries() {
    const tableBody = document.getElementById("admin-inquiries-table-body");
    if (!tableBody) return;

    fetch(`${BACKEND_URL}/inquiries`, {
        headers: { "Authorization": `Bearer ${AdminSession.token()}` }
    })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(inquiries => {
        tableBody.innerHTML = "";
        if (!inquiries.length) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No inquiries submitted yet.</td></tr>`;
            return;
        }
        inquiries.reverse().forEach(i => {
            tableBody.innerHTML += `
            <tr>
              <td class="fw-bold">${i.name}</td>
              <td><a href="tel:${i.phone}" class="text-amber text-decoration-none"><i class="fa-solid fa-phone me-1"></i>${i.phone}</a></td>
              <td class="text-secondary" style="max-width:300px">${i.message}</td>
              <td>
                <a href="https://wa.me/91${i.phone}?text=${encodeURIComponent(`Hello ${i.name}, thank you for reaching out to VVM Pavers. We'd love to help you!`)}"
                   target="_blank" class="btn btn-sm btn-outline-amber">
                  <i class="fa-brands fa-whatsapp me-1"></i>WhatsApp
                </a>
              </td>
            </tr>`;
        });
    })
    .catch(() => {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Failed to load inquiries.</td></tr>`;
    });
}

// ── Admin Completed Projects ───────────────────────────────────────────────
function loadAdminProjects() {
    const tableBody = document.getElementById("admin-projects-table-body");
    if (!tableBody) return;

    fetch(`${BACKEND_URL}/projects`)
        .then(r => r.json())
        .then(projects => {
            tableBody.innerHTML = "";
            if (!projects.length) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No projects added yet. Click "Add Project Photo" to add your first showcase.</td></tr>`;
                return;
            }
            projects.forEach(proj => {
                const imgSrc = proj.imageUrl || "image/pavers1.jpeg";
                tableBody.innerHTML += `
                <tr>
                  <td><img src="${imgSrc}" class="admin-project-thumb" alt="${proj.title}"></td>
                  <td class="fw-bold">${proj.title}</td>
                  <td class="text-secondary" style="max-width:250px;font-size:13px">${proj.description || "—"}</td>
                  <td style="font-size:13px">${proj.completionDate || "—"}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-amber me-1"
                      onclick="editProject(${proj.id},'${escJs(proj.title)}','${escJs(proj.description||'')}','${escJs(imgSrc)}')">
                      <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-light text-danger border-danger" onclick="deleteProject(${proj.id})">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>`;
            });
        })
        .catch(() => {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load projects.</td></tr>`;
        });
}

function editProject(id, title, description, imageUrl) {
    document.getElementById("completed-project-id").value          = id;
    document.getElementById("completed-project-title").value       = title;
    document.getElementById("completed-project-description").value = description;
    document.getElementById("completed-project-image-url").value   = imageUrl;
    document.getElementById("completedProjectModalTitle").innerText = "Edit Completed Project";
    const prev = document.getElementById("project-image-preview");
    const cont = document.getElementById("project-image-preview-container");
    if (prev && cont && imageUrl) {
        prev.src = imageUrl;
        cont.classList.remove("d-none");
    }
    completedProjectModalInstance.show();
}

function deleteProject(id) {
    if (!confirm("Remove this project from the gallery?")) return;
    fetch(`${BACKEND_URL}/projects/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${AdminSession.token()}` }
    })
    .then(r => { if (!r.ok) throw new Error(); })
    .then(() => { showToast("Project removed from gallery."); loadAdminProjects(); loadCompletedProjects(); })
    .catch(() => showToast("Failed to delete project.", "error"));
}

function handleCompletedProjectSubmit(e) {
    e.preventDefault();
    const id          = document.getElementById("completed-project-id").value;
    const project = {
        title:       document.getElementById("completed-project-title").value.trim(),
        description: document.getElementById("completed-project-description").value.trim(),
        imageUrl:    document.getElementById("completed-project-image-url").value.trim()
    };

    const isEdit = id !== "";
    const url    = isEdit ? `${BACKEND_URL}/projects/${id}` : `${BACKEND_URL}/projects`;
    const method = isEdit ? "PUT" : "POST";

    fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AdminSession.token()}`
        },
        body: JSON.stringify(project)
    })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(() => {
        showToast(isEdit ? "Project updated successfully!" : "Project added to gallery!");
        completedProjectModalInstance.hide();
        document.getElementById("completed-project-form").reset();
        document.getElementById("project-image-preview-container")?.classList.add("d-none");
        loadAdminProjects();
        loadCompletedProjects();
    })
    .catch(() => showToast("Failed to save project.", "error"));
}

// ── Registered Customers ───────────────────────────────────────────────────
function loadRegisteredCustomers() {
    const tableBody = document.getElementById("admin-customers-table-body");
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-amber"></div> Loading customers...</td></tr>`;

    fetch(`${BACKEND_URL}/admin/customers`, {
        headers: { "Authorization": `Bearer ${AdminSession.token()}` }
    })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(customers => {
        tableBody.innerHTML = "";
        if (!customers.length) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">
                <i class="fa-solid fa-users-slash fa-2x mb-2 d-block opacity-40"></i>
                No registered customers yet.</td></tr>`;
            return;
        }
        customers.forEach(c => {
            const initial = (c.name || "?").charAt(0).toUpperCase();
            let dateStr = "N/A";
            if (c.registrationDate) {
                const dt = new Date(c.registrationDate);
                dateStr = dt.toLocaleDateString('en-IN');
            }
            tableBody.innerHTML += `
            <tr>
              <td class="text-secondary fw-bold">#${c.id}</td>
              <td>
                <div class="customer-name-cell">
                  <span class="customer-avatar-sm">${initial}</span>
                  <span class="fw-bold">${c.name}</span>
                </div>
              </td>
              <td><small>${c.email}</small></td>
              <td>
                <a href="tel:${c.phone}" class="text-amber text-decoration-none">
                  <i class="fa-solid fa-phone me-1"></i>${c.phone}
                </a>
              </td>
              <td style="font-size:13px">${dateStr}</td>
              <td>
                <a href="https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hello ${c.name}, this is VVM Pavers! We're reaching out to assist you.`)}"
                   target="_blank" class="btn btn-sm btn-outline-amber">
                  <i class="fa-brands fa-whatsapp me-1"></i>WhatsApp
                </a>
              </td>
            </tr>`;
        });
    })
    .catch(() => {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load customers.</td></tr>`;
    });
}

// ── Admin Profile Update ───────────────────────────────────────────────────
function prefillAdminProfile() {
    document.getElementById("admin-profile-username").value = AdminSession.username() || "";
    document.getElementById("admin-profile-email").value    = "";
    document.getElementById("admin-profile-password").value = "";
}

function handleAdminProfileUpdate(e) {
    e.preventDefault();
    const username = document.getElementById("admin-profile-username").value.trim();
    const email    = document.getElementById("admin-profile-email").value.trim();
    const password = document.getElementById("admin-profile-password").value.trim();

    if (password && password.length < 6) {
        showToast("Password must be at least 6 characters.", "error");
        return;
    }

    const payload = { username, email };
    if (password) payload.password = password;

    fetch(`${BACKEND_URL}/admin/update-profile`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AdminSession.token()}`
        },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        sessionStorage.setItem("adminUsername", username);
        showToast("Admin credentials updated successfully!");
        document.getElementById("admin-profile-password").value = "";
    })
    .catch(err => showToast(err.message || "Failed to update admin profile.", "error"));
}

// ── Product CRUD ───────────────────────────────────────────────────────────
function editProduct(id, name, type, color, price, imageUrl) {
    document.getElementById("product-id").value         = id;
    document.getElementById("product-name").value       = name;
    document.getElementById("product-type").value       = type;
    document.getElementById("product-color").value      = color;
    document.getElementById("product-price").value      = price;
    document.getElementById("product-image-url").value  = imageUrl;
    document.getElementById("productModalTitle").innerText = "Modify Paver Details";

    const prev = document.getElementById("image-preview");
    const cont = document.getElementById("image-preview-container");
    if (imageUrl && prev && cont) {
        const firstImg = imageUrl.split(",")[0].trim();
        prev.src = firstImg;
        cont.classList.remove("d-none");
    } else {
        cont?.classList.add("d-none");
    }
    productModalInstance.show();
}

function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("product-id").value;
    const product = {
        name:     document.getElementById("product-name").value.trim(),
        type:     document.getElementById("product-type").value.trim(),
        color:    document.getElementById("product-color").value.trim(),
        price:    parseFloat(document.getElementById("product-price").value),
        imageUrl: document.getElementById("product-image-url").value.trim()
    };

    const isEdit = id !== "";
    const url    = isEdit ? `${BACKEND_URL}/products/${id}` : `${BACKEND_URL}/products`;
    const method = isEdit ? "PUT" : "POST";

    fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AdminSession.token()}`
        },
        body: JSON.stringify(product)
    })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(() => {
        showToast(isEdit ? "Paver details updated!" : "New paver added to catalog!");
        productModalInstance.hide();
        document.getElementById("product-form").reset();
        loadAdminProducts();
        loadProducts();
    })
    .catch(() => showToast("Error saving paver product.", "error"));
}

function deleteProduct(id) {
    if (!confirm("Remove this paver from the catalog? This action cannot be undone.")) return;
    fetch(`${BACKEND_URL}/products/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${AdminSession.token()}` }
    })
    .then(r => { if (!r.ok) throw new Error(); })
    .then(() => { showToast("Product deleted."); loadAdminProducts(); loadProducts(); })
    .catch(() => showToast("Error deleting product.", "error"));
}

// ── Photo Upload Helpers ───────────────────────────────────────────────────
function setupPhotoUpload() {
    const fileInput       = document.getElementById("product-image-file");
    const urlInput        = document.getElementById("product-image-url");
    const previewImg      = document.getElementById("image-preview");
    const previewContainer = document.getElementById("image-preview-container");
    if (!fileInput) return;

    fileInput.addEventListener("change", e => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showToast("Only image files are supported.", "error");
            fileInput.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = evt => {
            previewImg.src = evt.target.result;
            previewContainer.classList.remove("d-none");
            urlInput.value = evt.target.result;
        };
        reader.readAsDataURL(file);
    });

    urlInput?.addEventListener("input", () => {
        const val = urlInput.value.split(",")[0].trim();
        if (val) { previewImg.src = val; previewContainer.classList.remove("d-none"); }
        else { previewContainer.classList.add("d-none"); }
    });
}

function setupProjectPhotoUpload() {
    const fileInput        = document.getElementById("completed-project-image-file");
    const urlInput         = document.getElementById("completed-project-image-url");
    const previewImg       = document.getElementById("project-image-preview");
    const previewContainer = document.getElementById("project-image-preview-container");
    if (!fileInput) return;

    fileInput.addEventListener("change", e => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showToast("Only image files are supported.", "error");
            fileInput.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = evt => {
            if (previewImg) previewImg.src = evt.target.result;
            previewContainer?.classList.remove("d-none");
            if (urlInput) urlInput.value = evt.target.result;
        };
        reader.readAsDataURL(file);
    });

    urlInput?.addEventListener("input", () => {
        const val = urlInput.value.trim();
        if (val && previewImg) {
            previewImg.src = val;
            previewContainer?.classList.remove("d-none");
        } else {
            previewContainer?.classList.add("d-none");
        }
    });
}