// ==========================
// AUTH
// ==========================

async function register() {
    const username = document.getElementById("regUser").value;
    const password = document.getElementById("regPass").value;

    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    alert(data.success || data.error);
}

async function login() {
    const username = document.getElementById("loginUser").value;
    const password = document.getElementById("loginPass").value;

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
        if (data.role === "admin") {
            window.location.href = "/admin.html";
        } else {
            window.location.href = "/dashboard.html";
        }
    } else {
        alert(data.error);
    }
}

// ==========================
// EMPLOYEE ACTIONS
// ==========================

async function addEmployee() {

    const username = document.getElementById("addUser").value;
    const password = document.getElementById("addPass").value;
    const role = document.getElementById("addRole").value;

    const res = await fetch("/api/admin/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role })
    });

    const data = await res.json();
    alert(data.success || data.error);

    loadUsers();
}

async function deleteEmployee(id) {

    const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    });

    const data = await res.json();
    alert(data.success || data.error);

    loadUsers();
}

// ==========================
// LOAD EMPLOYEES
// ==========================

async function loadUsers() {

    const res = await fetch("/api/admin/users");
    const users = await res.json();

    const list = document.getElementById("userList");
    if (!list) return;

    list.innerHTML = "";

    users.forEach(user => {

        const li = document.createElement("li");
        li.textContent = `${user.username} (${user.role}) `;

        const btn = document.createElement("button");
        btn.textContent = "❌";
        btn.onclick = () => deleteEmployee(user.id);

        li.appendChild(btn);
        list.appendChild(li);
    });
}

// Charger automatiquement si page admin
if (window.location.pathname.includes("admin")) {
    loadUsers();
}
