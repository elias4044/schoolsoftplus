document.addEventListener("DOMContentLoaded", async () => {
    const subjectId = new URLSearchParams(window.location.search).get("id");
    const cookieArray = JSON.parse(sessionStorage.getItem("cookies"));

    if (!cookieArray || !cookieArray.length) {
        console.error("No cookies stored");
        window.location.href = "/login.html";
        return;
    }
    const cookies = cookieArray.join("; ");

    // Fetch subject data
    const res = await fetch(`/api/main?id=${subjectId}`, {
        headers: { "api": "subjectData", cookies }
    });
    const data = await res.json();

    if (!data.success) {
        document.querySelector(".tab-content").innerHTML =
            `<p style="color:red;">Failed to load subject data.</p>`;
        return;
    }

    // Update subject title
    document.getElementById("subject-name").textContent = data.subject.subject;

    // Update page title
    document.title = `${data.subject.subject} | Schoolsoft+`;

    function getEntityLink(entity) {
        if (entity.entityType === "PLANNING") return `/subjects/assignment?id=${entity.id}&type=planning`;
        return `/subjects/assignment?id=${entity.id}&type=assignment`;
    }

    // ----------------------
    // Populate Overview (as widgets)
    // ----------------------
    const overviewPane = document.getElementById("overview-pane");
    overviewPane.innerHTML = "";

    if (data.overview.examinations.length === 0 && data.overview.submissions.length === 0) {
        overviewPane.innerHTML = `<p>No overview data available.</p>`;
    } else {
        if (data.overview.examinations.length > 0) {
            overviewPane.innerHTML += `
                <div class="widget">
                    <h3>Examinations</h3>
                    ${data.overview.examinations.map(exam => `
                        <a href="/subjects/assignment?id=${exam.id}" class="subject-card-link">
                            <div class="subject-card">
                                <div class="left">
                                    <div class="title">${exam.title}</div>
                                    <div class="subtitle">${exam.subTitle}</div>
                                </div>
                                <div class="status">${exam.read ? "✓ Read" : "New"}</div>
                            </div>
                        </a>
                    `).join("")}
                </div>`;
        }

        if (data.overview.submissions.length > 0) {
            overviewPane.innerHTML += `
                <div class="widget">
                    <h3>Submissions</h3>
                    ${data.overview.submissions.map(sub => `
                        <a href="/subjects/assignment?id=${sub.id}" class="subject-card-link">
                            <div class="subject-card">
                                <div class="left">
                                    <div class="title">${sub.title}</div>
                                    <div class="subtitle">${sub.subTitle}</div>
                                </div>
                                <div class="status">${sub.read ? "✓ Read" : "New"}</div>
                            </div>
                        </a>
                    `).join("")}
                </div>`;
        }
    }

    // ----------------------
    // Populate Assignments (and sort by date)
    // ----------------------
    const assignmentsPane = document.getElementById("assignments-pane");
    assignmentsPane.innerHTML = "";

    if (data.assignments.length === 0) {
        assignmentsPane.innerHTML = `<p>No assignments available.</p>`;
    } else {
        // Sort BEFORE inserting them
        const sortedAssignments = [...data.assignments].sort((a, b) => {
            // Ongoing first
            if (a.status === "ONGOING" && b.status !== "ONGOING") return -1;
            if (a.status !== "ONGOING" && b.status === "ONGOING") return 1;

            // Then by date (latest first)
            return new Date(b.endDate) - new Date(a.endDate);
        });



        sortedAssignments.forEach(assignment => {
            assignmentsPane.innerHTML += `
            <a href="${getEntityLink(assignment)}" class="subject-card-link">
                <div class="subject-card">
                    <div class="left">
                        <div class="title">${assignment.title}</div>
                        <div class="subtitle">${assignment.type} — due ${assignment.endDate}</div>
                    </div>
                    <div class="status">${assignment.status}</div>
                </div>
            </a>
        `;
        });
    }
});

// Tab Switching
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
        document.getElementById(`${tab.dataset.tab}-pane`).classList.add("active");
    });
});
