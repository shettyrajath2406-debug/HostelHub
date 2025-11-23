async function login(username, password) {
  const response = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  if (response.ok) {
    sessionStorage.setItem('hostelhub_token', data.token);
    sessionStorage.setItem('hostelhub_role', data.role);
    sessionStorage.setItem('hostelhub_user', JSON.stringify({ username }));
    window.location.href = 'dashboard.html'; // or wherever your dashboard page is
  } else {
    alert(data.error || 'Login failed');
  }
}
async function fetchComplaints() {
  const token = sessionStorage.getItem('hostelhub_token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }
  const response = await fetch('http://localhost:5000/api/complaints', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    alert('Failed to load complaints');
    return;
  }
  const complaints = await response.json();
  complaintsList.innerHTML = '';
  if (complaints.length === 0) {
    complaintsList.innerHTML = '<p>No complaints raised yet.</p>';
    return;
  }
  complaints.forEach(c => {
    let statusClass = "open";
    if (c.status === "In Progress") statusClass = "in-progress";
    else if (c.status === "Resolved") statusClass = "resolved";
    const div = document.createElement('div');
    div.classList.add('complaint-item');
    div.innerHTML = `
      <div><strong>Title:</strong> ${c.title}</div>
      <div><strong>Description:</strong> ${c.description}</div>
      <div><strong>Status:</strong> <span class="status ${statusClass}">${c.status}</span></div>
    `;
    complaintsList.appendChild(div);
  });
}
complaintForm.addEventListener("submit", async event => {
  event.preventDefault();
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  if (!title || !description) return alert("Please fill out all fields.");

  const token = sessionStorage.getItem('hostelhub_token');
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  const response = await fetch('http://localhost:5000/api/complaints', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ title, description })
  });

  if (response.ok) {
    alert('Complaint submitted successfully.');
    complaintForm.reset();
    fetchComplaints();
  } else {
    const errorData = await response.json();
    alert(errorData.error || 'Failed to submit complaint.');
  }
});
