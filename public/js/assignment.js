document.addEventListener("DOMContentLoaded", async () => {
    const loader = document.querySelector(".loader-container");
    const content = document.querySelector(".full-width.content");
    const params = new URLSearchParams(window.location.search);
    const assignmentId = params.get("id");
    const assignmentType = params.get("type");

    if (!assignmentId) {
        loader.innerHTML = `<p style="color: var(--error-text);">No assignment ID provided.</p>`;
        return;
    }

    const cookieArray = JSON.parse(sessionStorage.getItem("cookies"));
    if (!cookieArray || !cookieArray.length) {
        console.error("No cookies stored");
        window.location.href = "/login.html";
        return;
    }
    const cookies = cookieArray.join("; ");

    try {
        document.querySelector(".loader-text").textContent = "Loading assignment...";

        const res = await fetch(`/api/main?id=${assignmentId}&type=${assignmentType}`, {
            method: "GET",
            headers: { "Content-Type": "application/json", cookies, api: "assignment" },
        });

        if (res.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        if (!res.ok) throw new Error("Failed to fetch assignment");

        const resJSON = await res.json();
        const { data: assignment, type } = resJSON;

        loader.remove();

        // Update page title
        document.title = `${assignment.title} | Schoolsoft+`;

        const sections = [];

        function makeExpandableCard(icon, title, innerHTML) {
            return `
                <div class="card">
                    <span class="material-symbols-rounded">${icon}</span>
                    <h4 class="card-title">${title}</h4>
                    <div class="card-content">${innerHTML}</div>
                    <button class="expand-btn">Show More</button>
                </div>
            `;
        }

        // Assessment with animated progress bars
        if (assignment.assessment?.assessmentPartialMoments?.length) {
            const assessmentItems = assignment.assessment.assessmentPartialMoments
                .map(a => {
                    const percentage = Math.round((a.points / a.max) * 100);
                    const color = percentage >= 75 ? "var(--success)" : percentage >= 50 ? "var(--warning)" : "var(--danger)";
                    return `
                        <li class="assessment-item">
                            <div class="assessment-info">
                                <span class="score-name">${a.name}</span>
                                <span class="score-value">${a.points}/${a.max}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="--progress:${percentage}%; background:${color};"></div>
                            </div>
                        </li>`;
                }).join("");

            const extraInfo = `
        <ul class="assessment-list">${assessmentItems}</ul>
        ${assignment.assessment.review ? `<p><strong>Review:</strong> ${assignment.assessment.review}</p>` : ""}
        ${assignment.assessment.teacherComment ? `<p><strong>Teacher Comment:</strong> ${assignment.assessment.teacherComment}</p>` : ""}
    `;
            sections.push(makeExpandableCard("check_circle", "Your Results", extraInfo));
        }


        if (assignment.gradeCriteria?.length) {
            const gradeItems = assignment.gradeCriteria
                .map(c => `<li><strong>${c.gradeStep}:</strong> ${c.text}</li>`).join("");
            sections.push(makeExpandableCard("rule", "Grade Criteria", `<ul>${gradeItems}</ul>`));
        }

        if (assignment.centralContent?.length) {
            const centralItems = assignment.centralContent.map(cc => {
                let parts = "";
                if (cc.parts?.length) {
                    parts = "<ul>" + cc.parts.map(p => `<li>Year ${p.year}: ${p.description}</li>`).join("") + "</ul>";
                }
                return `<li>${cc.description}${parts}</li>`;
            }).join("");
            sections.push(makeExpandableCard("integration_instructions", "Central Content", `<ul>${centralItems}</ul>`));
        }

        if (assignment.subjectDescription?.length) {
            const descItems = assignment.subjectDescription.map(d => `<li>${d.description}</li>`).join("");
            sections.push(makeExpandableCard("description", "Subject Description", `<ul>${descItems}</ul>`));
        }

        if (assignment.teachers?.length) {
            const teacherItems = assignment.teachers
                .map(t => `<li>${t.firstName} ${t.lastName} - ${t.role}</li>`).join("");
            sections.push(makeExpandableCard("groups", "Teachers", `<ul>${teacherItems}</ul>`));
        }

        const html = `
            <div class="assignment-details">
                <div class="assignment-header">
                    <h2>${assignment.title || "Untitled Assignment"}</h2>
                    ${assignment.subTitle ? `<span class="assignment-subtitle">${assignment.subTitle}</span>` : ""}
                    ${type ? `<span class="assignment-type">${type}</span>` : ""}
                    ${assignment.publishDate ? `<span class="assignment-date">Published: ${assignment.publishDate}</span>` : ""}
                </div>
                <div class="assignment-description">
                    ${assignment.description || "<p>No description provided.</p>"}
                </div>
                <div class="assignment-grid">
                    ${sections.join("")}
                </div>
            </div>
        `;

        content.innerHTML = html;

        // Animate progress bars
        document.querySelectorAll(".score-circle .progress").forEach(el => {
            const dash = el.getAttribute("stroke-dasharray");
            const percentage = dash.split(",")[0];
            setTimeout(() => el.setAttribute("stroke-dasharray", `${percentage}, 100`), 100);
        });

        // Expand/Collapse
        document.querySelectorAll(".expand-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const cardContent = btn.previousElementSibling;
                cardContent.classList.toggle("expanded");
                btn.textContent = cardContent.classList.contains("expanded") ? "Show Less" : "Show More";
            });
        });

        // Update header
        const header = document.querySelector(".content-header h2");
        header.innerHTML = `<span class="back-link"><- |</span> ${assignment.title || "Assignment"}`;
    } catch (err) {
        console.error("Error loading assignment:", err);
        loader.innerHTML = `<p style="color: var(--error-text);">Failed to load assignment. Please try again later.</p>`;
    }
});
